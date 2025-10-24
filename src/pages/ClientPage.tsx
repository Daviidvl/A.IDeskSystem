import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Star } from "lucide-react";
import { LGPDModal } from "../components/LGPDModal";
import { ChatMessage } from "../components/ChatMessage";
import { supabase, Message } from "../lib/supabase";
import { getAIResponse } from "../lib/aiResponses";
import {
  initSocket,
  joinTicket,
  sendSocketMessage,
  onNewMessage,
  disconnectSocket,
} from "../lib/socket";

export const ClientPage: React.FC = () => {
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [showNameForm, setShowNameForm] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // === SOCKET ===
  useEffect(() => {
    if (!ticketId) return;

    initSocket();
    joinTicket(ticketId);

    const handleNew = (msg: any) => {
      if (!msg?.ticket_id || msg.ticket_id !== ticketId) return;

      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );

      // Detecta mensagem de encerramento → abre feedback
      if (
        typeof msg.content === "string" &&
        msg.content.includes("✅ Seu chamado foi encerrado")
      ) {
        setTimeout(() => setShowFeedback(true), 2000);
      }
    };

    onNewMessage(handleNew);
    return () => disconnectSocket();
  }, [ticketId]);

  useEffect(scrollToBottom, [messages]);

  // === Inserir mensagem no banco e emitir pelo socket ===
  const addMessage = async (
    content: string,
    senderType: "client" | "ai" | "technician",
    senderName: string
  ) => {
    if (!ticketId) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_name: senderName,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao inserir mensagem:", error);
      return null;
    }

    if (data) {
      setMessages((prev) => [...prev, data]);
      try {
        sendSocketMessage(ticketId, data);
      } catch (err) {
        console.warn("socket emit failed:", err);
      }
      return data;
    }
  };

  const handleLGPDAccept = () => setLgpdAccepted(true);

  // === Criar ticket inicial ===
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setShowNameForm(false);
    setIsLoading(true);

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        problem_description: "Em andamento",
        status: "open",
        lgpd_accepted: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar ticket:", error);
      alert("Erro ao iniciar atendimento. Tente novamente.");
      setIsLoading(false);
      return;
    }

    if (ticket) {
      setTicketId(ticket.id);

      // Envia para o socket (avisar técnicos)
      sendSocketMessage(ticket.id, {
        ticket_id: ticket.id,
        sender_type: "system",
        sender_name: "Sistema",
        content: "Novo ticket criado pelo cliente.",
      });

      const welcomeMsg: Message = {
        id: crypto.randomUUID(),
        ticket_id: ticket.id,
        sender_type: "ai",
        sender_name: "A.I Assistant",
        content: `Olá ${clientName}! 👋\nSou o assistente virtual da A.I Desk. Descreva brevemente o problema que está enfrentando.`,
        created_at: new Date().toISOString(),
      };

      setMessages([welcomeMsg]);
      await addMessage(welcomeMsg.content, "ai", "A.I Assistant");
    }

    setIsLoading(false);
  };

  // === Enviar mensagem normal ===
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !ticketId || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Cliente envia mensagem
    await addMessage(userMessage, "client", clientName);

    // Só chama IA se ticketId for string
    if (typeof ticketId === "string") {
      const aiResponse = await getAIResponse(ticketId, userMessage);

      // Se a IA ainda puder responder
      if (aiResponse.text) {
        setTimeout(async () => {
          await addMessage(aiResponse.text!, "ai", "A.I Assistant");

          // IA decide escalar → atualiza ticket
          if (aiResponse.requiresHuman) {
            await supabase
              .from("tickets")
              .update({ status: "in_progress" })
              .eq("id", ticketId);
          }

          setIsLoading(false);
        }, 1200);
      } else {
        // IA bloqueada (escalado)
        setIsLoading(false);
      }
    }
  };

  // === Enviar avaliação ===
  const handleSendFeedback = async () => {
    if (!rating || !ticketId) return;

    await supabase.from("feedbacks").insert({
      ticket_id: ticketId,
      rating,
      comment,
    });

    setFeedbackSent(true);

    await addMessage(
      "✅ Obrigado pelo seu feedback! Ele nos ajuda a melhorar sempre. 💙",
      "ai",
      "A.I Assistant"
    );
  };

  // === RENDER ===
  if (!lgpdAccepted) return <LGPDModal onAccept={handleLGPDAccept} />;

  if (showNameForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <MessageSquare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bem-vindo ao A.I Desk
            </h1>
            <p className="text-gray-600">Suporte Inteligente</p>
          </div>

          <form onSubmit={handleStartChat} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite seu nome"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? "Iniciando..." : "Iniciar Atendimento"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: "calc(100vh - 2rem)" }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-2xl font-bold">A.I Desk - Suporte</h1>
            <p className="text-sm opacity-90">Atendimento: {clientName}</p>
            {ticketId && (
              <p className="text-xs opacity-75 mt-1">
                Chamado: #{ticketId.slice(0, 8)}
              </p>
            )}
          </div>

          <div className="h-[calc(100%-180px)] overflow-y-auto p-6 bg-gray-50">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {showFeedback && !feedbackSent && (
              <div className="bg-white p-4 rounded-xl shadow-md mt-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  ✨ Avalie nosso atendimento
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  De 1 (ruim) a 5 (excelente):
                </p>

                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className={`p-2 rounded-full ${
                        rating === n
                          ? "bg-yellow-400 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      <Star className="w-6 h-6" />
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Deixe um comentário (opcional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm mb-3 focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={handleSendFeedback}
                  disabled={!rating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  Enviar avaliação
                </button>
              </div>
            )}

            {feedbackSent && (
              <div className="bg-green-100 text-green-700 text-center p-3 rounded-lg mt-3 font-medium">
                ✅ Obrigado! Seu feedback foi registrado.
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!showFeedback && (
            <div className="p-4 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
