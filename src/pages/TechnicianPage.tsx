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
} from "../lib/socket";

export const TechnicianPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  // SOCKET: conecta e escuta novas mensagens
  useEffect(() => {
    if (!selectedTicket) return;

    initSocket();
    joinTicket(selectedTicket.id);

    const handleNewMessage = (msg: any) => {
      if (msg.ticket_id === selectedTicket.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    };

    onNewMessage(handleNewMessage);
    return () => disconnectSocket();
  }, [selectedTicket]);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTickets(data);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const handleSelectTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !inputMessage.trim()) return;
    setIsLoading(true);

    const newMessage = {
      ticket_id: selectedTicket.id,
      sender_type: "technician",
      sender_name: "Administrador",
      content: inputMessage,
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

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    await supabase
      .from("tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selectedTicket.id);

    // Envia mensagem ao cliente pedindo avaliação
    const feedbackMsg = {
      ticket_id: selectedTicket.id,
      sender_type: "ai",
      sender_name: "A.I Assistant",
      content:
        "✅ Seu chamado foi encerrado com sucesso! Por favor, avalie o atendimento atribuindo uma nota de 1 a 5 ⭐ e, se desejar, deixe um comentário. 💬",
    };

    const { data } = await supabase
      .from("messages")
      .insert(feedbackMsg)
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data]);
      sendSocketMessage(selectedTicket.id, data);
    }

    alert("Chamado encerrado e solicitação de feedback enviada ao cliente!");
    await loadTickets();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* ==== Sidebar (Tickets) ==== */}
      <div className="w-1/4 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h2 className="text-xl font-bold">Tickets Abertos</h2>
        </div>

        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => handleSelectTicket(ticket)}
            className={`p-4 border-b cursor-pointer ${
              selectedTicket?.id === ticket.id
                ? "bg-blue-100"
                : "hover:bg-gray-50"
            }`}
          >
            <p className="font-semibold text-gray-800">
              {ticket.client_name || "Cliente"}
            </p>
            <p className="text-sm text-gray-500">
              Status: {ticket.status.toUpperCase()}
            </p>
          </div>
        ))}
      </div>

      {/* ==== Área do Chat ==== */}
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
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseTicket}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
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

            {/* Chat com scroll isolado */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input fixo */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
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
