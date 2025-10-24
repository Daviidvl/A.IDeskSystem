// src/pages/TechnicianPage.tsx
import React, { useEffect, useState, useRef } from "react";
import { Send, CheckCircle, MessageSquare, XCircle } from "lucide-react";
import { supabase, Message } from "../lib/supabase";
import { ChatMessage } from "../components/ChatMessage";
import {
  initSocket,
  joinTicket,
  sendSocketMessage,
  onNewMessage,
  disconnectSocket,
  onTicketResolved,
} from "../lib/socket";

// === Exibe o status formatado ===
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "open":
      return { text: "ABERTO", colorClass: "text-yellow-600 bg-yellow-100" };
    case "in_progress":
      return { text: "EM ANDAMENTO", colorClass: "text-blue-600 bg-blue-100" };
    case "resolved":
      return { text: "RESOLVIDO", colorClass: "text-green-600 bg-green-100" };
    default:
      return { text: status.toUpperCase(), colorClass: "text-gray-600 bg-gray-100" };
  }
};

export const TechnicianPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // === Carrega todos os tickets abertos ou em andamento ===
  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false });

    if (error) console.error("Erro ao carregar tickets:", error);
    if (data) setTickets(data);
  };

  // === Carrega as mensagens do ticket selecionado ===
  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  // === Escuta atualizações em tempo real do Supabase (fallback) ===
  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel("tickets_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        async () => await loadTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // === SOCKET.IO realtime ===
  useEffect(() => {
    initSocket();

    onNewMessage((msg) => {
      // Atualiza tickets quando há novos
      if (msg?.sender_type === "system" && msg?.content?.includes("Novo ticket")) {
        loadTickets();
      }

      // Se a mensagem for do ticket atual, adiciona
      if (selectedTicket && msg.ticket_id === selectedTicket.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    });

    // Quando um ticket é encerrado por outro técnico
    onTicketResolved(({ ticketId }) => {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setMessages([]);
      }
    });

    return () => disconnectSocket();
  }, [selectedTicket]);

  // === Selecionar ticket ===
  const handleSelectTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
    joinTicket(ticket.id);

    if (ticket.status === "open") {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status: "in_progress" })
        .eq("id", ticket.id)
        .select()
        .single();

      if (!error && data) {
        setSelectedTicket(data);
        loadTickets();
      }
    }
  };

  // === Enviar mensagem ===
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !inputMessage.trim()) return;
    setIsLoading(true);

    const newMessage = {
      ticket_id: selectedTicket.id,
      sender_type: "technician",
      sender_name: "Administrador",
      content: inputMessage.trim(),
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(newMessage)
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      sendSocketMessage(selectedTicket.id, data);
    }

    setInputMessage("");
    setIsLoading(false);
  };

  // === Encerrar chamado ===
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selectedTicket.id);

    if (updateError) {
      alert("Erro ao encerrar o chamado.");
      return;
    }

    // Mensagem de encerramento
    const feedbackMsg = {
      ticket_id: selectedTicket.id,
      sender_type: "ai",
      sender_name: "A.I Assistant",
      content:
        "✅ Seu chamado foi encerrado com sucesso! Por favor, avalie o atendimento atribuindo uma nota de 1 a 5 ⭐ e, se desejar, deixe um comentário. 💬",
    };

    const { data: msgData, error: msgError } = await supabase
      .from("messages")
      .insert(feedbackMsg)
      .select()
      .single();

    if (!msgError && msgData) {
      setMessages((prev) => [...prev, msgData]);
      sendSocketMessage(selectedTicket.id, msgData);
    }

    // Notifica via socket global
    sendSocketMessage(selectedTicket.id, {
      type: "ticket_resolved",
      ticketId: selectedTicket.id,
    });

    // Remove o ticket localmente
    setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
    setSelectedTicket(null);

    alert("Chamado encerrado e solicitação de feedback enviada!");
  };

  // === Scroll automático ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isTicketResolved = selectedTicket?.status === "resolved";

  // === Renderização ===
  return (
    <div className="flex h-screen bg-gray-100">
      {/* ==== Sidebar ==== */}
      <div className="w-1/4 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h2 className="text-xl font-bold">Tickets Ativos</h2>
        </div>

        {tickets.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">Nenhum ticket aberto.</p>
        ) : (
          tickets.map((ticket) => {
            const statusInfo = getStatusDisplay(ticket.status);
            return (
              <div
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                className={`p-4 border-b cursor-pointer transition-all duration-150 ${
                  selectedTicket?.id === ticket.id
                    ? "bg-blue-100 border-blue-400 border-l-4"
                    : "hover:bg-gray-50"
                }`}
              >
                <p className="font-semibold text-gray-800">
                  {ticket.client_name || "Cliente"}
                </p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${statusInfo.colorClass}`}
                >
                  {statusInfo.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ==== Área principal ==== */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Header fixo */}
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedTicket.client_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedTicket.client_email || "Sem e-mail"}
                </p>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  Chamado:{" "}
                  <span className="font-bold text-gray-700">
                    #{selectedTicket.id.slice(0, 8).toUpperCase()}
                  </span>
                </p>
                <p
                  className={`text-sm font-medium mt-1 ${
                    isTicketResolved ? "text-red-500" : "text-green-500"
                  }`}
                >
                  Status: {getStatusDisplay(selectedTicket.status).text}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseTicket}
                  disabled={isTicketResolved}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow disabled:bg-gray-400"
                >
                  <CheckCircle className="w-5 h-5" />
                  Encerrar chamado
                </button>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow"
                >
                  <XCircle className="w-5 h-5" />
                  Sair
                </button>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    isTicketResolved
                      ? "Chamado encerrado. Não é possível enviar mensagens."
                      : "Digite sua resposta..."
                  }
                  className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading || isTicketResolved}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading || isTicketResolved}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-400" />
            <p>Selecione um ticket para visualizar o chat</p>
          </div>
        )}
      </div>
    </div>
  );
};
