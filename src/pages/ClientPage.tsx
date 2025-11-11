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
  onTicketAssumed,
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
  const [currentTicketStatus, setCurrentTicketStatus] = useState<'open' | 'in_progress' | 'closed'>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🔹 NOVO: Ref para controlar reconexões do socket
  const socketConnectedRef = useRef(false);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // === Monitora status do ticket ===
  useEffect(() => {
    if (!ticketId) return;

    const checkTicketStatus = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('status')
        .eq('id', ticketId)
        .single();
      
      if (data) {
        setCurrentTicketStatus(data.status);
        
        if (data.status === 'closed' && !showFeedback && !feedbackSent) {
          setTimeout(() => setShowFeedback(true), 1000);
        }
      }
    };

    checkTicketStatus();
    const interval = setInterval(checkTicketStatus, 3000);
    return () => clearInterval(interval);
  }, [ticketId, showFeedback, feedbackSent]);

  // === SOCKET CORRIGIDO ===
  useEffect(() => {
    if (!ticketId) return;

    // 🔹 EVITA reconexões desnecessárias
    if (socketConnectedRef.current) {
      console.log("🔌 Socket já conectado, ignorando nova conexão");
      return;
    }

    console.log("🔌 Conectando socket para ticket:", ticketId);
    initSocket();
    joinTicket(ticketId);
    socketConnectedRef.current = true;

    const handleNewMessage = (msg: any) => {
      console.log("📨 Nova mensagem recebida no cliente:", msg);
      
      if (!msg?.ticket_id || msg.ticket_id !== ticketId) {
        console.log("❌ Mensagem ignorada - ticket não corresponde");
        return;
      }
      
      // 🔹 VERIFICAÇÃO MAIS ROBUSTA para evitar duplicatas
      if (messages.some(m => m.id === msg.id)) {
        console.log("❌ Mensagem ignorada - já existe no estado");
        return;
      }

      console.log("✅ Adicionando mensagem ao estado");
      
      // 🔹 USA FUNÇÃO DE ATUALIZAÇÃO para garantir estado correto
      setMessages((prev) => {
        // Verificação dupla dentro da função de atualização
        if (prev.some(m => m.id === msg.id)) {
          console.log("❌ Mensagem duplicada detectada na função de atualização");
          return prev;
        }
        return [...prev, msg];
      });

      if (typeof msg.content === "string" && msg.content.includes("✅ Seu chamado foi encerrado")) {
        setTimeout(() => setShowFeedback(true), 2000);
      }
    };

    const handleTicketAssumed = (payload: { ticketId: string; technicianName: string }) => {
      console.log("👨‍💻 Técnico assumiu o ticket:", payload);
      if (payload.ticketId === ticketId) {
        setCurrentTicketStatus('in_progress');
        
        const systemMsg = {
          id: crypto.randomUUID(), // 🔹 GARANTE ID ÚNICO
          ticket_id: ticketId,
          sender_type: "ai" as const,
          sender_name: "Sistema",
          content: `✅ ${payload.technicianName} assumiu seu caso. Agora você está em contato direto com nosso técnico!`,
          created_at: new Date().toISOString(),
        };
        
        setMessages((prev) => [...prev, systemMsg]);
      }
    };

    onNewMessage(handleNewMessage);
    onTicketAssumed(handleTicketAssumed);

    return () => {
      console.log("🔌 Desconectando socket");
      disconnectSocket();
      socketConnectedRef.current = false; // 🔹 RESETA flag
    };
  }, [ticketId]); // 🔹 REMOVIDO messages das dependências

  useEffect(scrollToBottom, [messages]);

  // === Inserir mensagem no banco e emitir pelo socket ===
  const addMessage = async (
    content: string,
    senderType: "client" | "ai" | "technician",
    senderName: string
  ) => {
    if (!ticketId) return null;

    console.log("💾 Salvando mensagem no banco:", { content, senderType, senderName });
    
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
      console.error("❌ Erro ao inserir mensagem:", error);
      return null;
    }

    if (data) {
      console.log("✅ Mensagem salva no banco:", data);
      
      // 🔹 ATUALIZA O ESTADO APENAS UMA VEZ
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) {
          console.log("⚠️ Mensagem já existe no estado, evitando duplicata");
          return prev;
        }
        return [...prev, data];
      });
      
      try {
        console.log("📤 Enviando mensagem via socket");
        sendSocketMessage(ticketId, data);
      } catch (err) {
        console.warn("⚠️ socket emit failed:", err);
      }
      return data;
    }
    return null;
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
      setCurrentTicketStatus('open');
      setMessages([]); // 🔹 LIMPA mensagens anteriores

      // Envia para o socket (avisar técnicos)
      sendSocketMessage(ticket.id, {
        ticket_id: ticket.id,
        sender_type: "ai" as const,
        sender_name: "Sistema",
        content: "Novo ticket criado pelo cliente.",
      });

      const welcomeMsg: Message = {
        id: crypto.randomUUID(), // 🔹 GARANTE ID ÚNICO
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

    console.log("📤 Cliente enviando mensagem:", userMessage);

    if (currentTicketStatus === 'open') {
      await addMessage(userMessage, "client", clientName);

      const aiResponse = await getAIResponse(ticketId, userMessage);

      if (aiResponse.autoResolved) {
        setTimeout(async () => {
          await addMessage(aiResponse.text!, "ai", "A.I Assistant");
          
          await supabase
            .from("tickets")
            .update({ 
              status: "closed",
              resolved_at: new Date().toISOString()
            })
            .eq("id", ticketId);

          setCurrentTicketStatus('closed');
          
          setTimeout(() => setShowFeedback(true), 1500);
          setIsLoading(false);
        }, 1200);
      }
      else if (aiResponse && aiResponse.text && !aiResponse.requiresHuman) {
        setTimeout(async () => {
          await addMessage(aiResponse.text!, "ai", "A.I Assistant");
          setIsLoading(false);
        }, 1200);
      }
      else if (aiResponse && aiResponse.requiresHuman) {
        const finalMsg = aiResponse.text!;
        await addMessage(finalMsg, "ai", "A.I Assistant");

        await supabase
          .from("tickets")
          .update({ status: "in_progress" })
          .eq("id", ticketId);

        setCurrentTicketStatus('in_progress');
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    } 
    else if (currentTicketStatus === 'in_progress') {
      await addMessage(userMessage, "client", clientName);
      setIsLoading(false);
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
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  currentTicketStatus === 'open' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : currentTicketStatus === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentTicketStatus === 'open' 
                    ? 'EM ATENDIMENTO IA' 
                    : currentTicketStatus === 'in_progress'
                    ? 'COM TÉCNICO'
                    : 'FINALIZADO'}
                </span>
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

          {!showFeedback && currentTicketStatus !== 'closed' && (
            <div className="p-4 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    currentTicketStatus === 'open' 
                      ? "Digite sua mensagem para a IA..." 
                      : "Digite sua mensagem para o técnico..."
                  }
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
              
              {currentTicketStatus === 'in_progress' && (
                <p className="text-xs text-green-600 mt-2 text-center">
                  💬 Agora você está em contato direto com nosso técnico
                </p>
              )}
            </div>
          )}

          {currentTicketStatus === 'closed' && !showFeedback && !feedbackSent && (
            <div className="p-4 bg-gray-100 border-t text-center">
              <p className="text-gray-600">
                Este chamado foi encerrado. Obrigado por entrar em contato!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};