import React, { useEffect, useState, useRef } from "react";
import { Send, CheckCircle, MessageSquare, XCircle, User, Clock } from "lucide-react";
import { supabase, Message } from "../lib/supabase";
import { ChatMessage } from "../components/ChatMessage";
import {
  initSocket,
  joinTicket,
  sendSocketMessage,
  onNewMessage,
  disconnectSocket,
  onTicketResolved,
  onTicketAutoResolved,
  sendTicketAssumed,
} from "../lib/socket";

// === Exibe o status formatado ===
const getStatusDisplay = (status: string) => {
  switch (status) {
    case "open":
      return { text: "AGUARDANDO IA", colorClass: "text-yellow-600 bg-yellow-100" };
    case "in_progress":
      return { text: "EM ATENDIMENTO", colorClass: "text-blue-600 bg-blue-100" };
    case "closed":
      return { text: "FINALIZADO", colorClass: "text-green-600 bg-green-100" };
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

  // === Escuta atualizações em tempo real do Supabase ===
  useEffect(() => {
    loadTickets();

    const channel = supabase
      .channel("tickets_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        async (payload: any) => { // 🔹 CORRIGIDO: adicionado tipo any
          // 🔹 SE TICKET FOI FECHADO → REMOVE DA LISTA
          if (payload.eventType === 'UPDATE' && payload.new.status === 'closed') {
            setTickets(prev => prev.filter(t => t.id !== payload.new.id));
            if (selectedTicket?.id === payload.new.id) {
              setSelectedTicket(null);
              setMessages([]);
            }
          } else {
            await loadTickets();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload: any) => { // 🔹 CORRIGIDO: adicionado tipo any
          // Se há nova mensagem no ticket selecionado, recarrega as mensagens
          if (selectedTicket && payload.new.ticket_id === selectedTicket.id) {
            loadMessages(selectedTicket.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // === SOCKET.IO realtime ===
  useEffect(() => {
    initSocket();

    const handleNewMessage = (msg: any) => {
      // Atualiza tickets quando há novos tickets criados
      if (msg?.sender_type === "ai" && msg?.content?.includes("Novo ticket")) {
        loadTickets();
      }

      // Se a mensagem for do ticket atual, adiciona
      if (selectedTicket && msg.ticket_id === selectedTicket.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    };

    // 🔹 OUVE QUANDO TICKET É RESOLVIDO AUTOMATICAMENTE PELA IA
    const handleTicketAutoResolved = (payload: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== payload.ticketId));
      if (selectedTicket?.id === payload.ticketId) {
        setSelectedTicket(null);
        setMessages([]);
      }
    };

    // 🔹 OUVE QUANDO TICKET É ENCERRADO POR OUTRO TÉCNICO
    const handleTicketResolved = (payload: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== payload.ticketId));
      if (selectedTicket?.id === payload.ticketId) {
        setSelectedTicket(null);
        setMessages([]);
      }
    };

    onNewMessage(handleNewMessage);
    onTicketAutoResolved(handleTicketAutoResolved);
    onTicketResolved(handleTicketResolved);

    return () => disconnectSocket();
  }, [selectedTicket]);

  // === Selecionar ticket ===
  const handleSelectTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
    joinTicket(ticket.id);

    // 🔹 ATUALIZA o status para in_progress se ainda estiver open
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
        
        // 🔹 ENVIA MENSAGEM DE BOAS-VINDAS do técnico
        const welcomeMsg = {
          ticket_id: ticket.id,
          sender_type: "technician" as const,
          sender_name: "Técnico",
          content: `Olá! Sou o técnico responsável pelo seu caso. Em que posso ajudá-lo? 👨‍💻`,
        };

        const { data: msgData } = await supabase
          .from("messages")
          .insert(welcomeMsg)
          .select()
          .single();

        if (msgData) {
          setMessages((prev) => [...prev, msgData]);
          sendSocketMessage(ticket.id, msgData);
        }

        // 🔹 NOTIFICA VIA SOCKET QUE TÉCNICO ASSUMIU O TICKET
        sendTicketAssumed(ticket.id, "Técnico");
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
      sender_type: "technician" as const,
      sender_name: "Técnico",
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
      
      // 🔹 ATUALIZA o status para in_progress se ainda estiver open
      if (selectedTicket.status === 'open') {
        await supabase
          .from("tickets")
          .update({ status: "in_progress" })
          .eq("id", selectedTicket.id);
        
        // Recarrega o ticket selecionado
        const { data: updatedTicket } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", selectedTicket.id)
          .single();
        
        if (updatedTicket) {
          setSelectedTicket(updatedTicket);
          loadTickets();
        }
      }
    }

    setInputMessage("");
    setIsLoading(false);
  };

  // === Encerrar chamado ===
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    // Confirmação antes de encerrar
    if (!confirm("Tem certeza que deseja encerrar este chamado? Esta ação não pode ser desfeita.")) {
      return;
    }

    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "closed",
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
      sender_type: "ai" as const,
      sender_name: "A.I Assistant",
      content: "✅ Seu chamado foi encerrado com sucesso! Por favor, avalie o atendimento atribuindo uma nota de 1 a 5 ⭐ e, se desejar, deixe um comentário. 💬",
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
      ticket_id: selectedTicket.id, // 🔹 CORRIGIDO: adicionado ticket_id
      type: "ticket_resolved",
    });

    // Remove o ticket localmente
    setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
    setSelectedTicket(null);
    setMessages([]);

    alert("Chamado encerrado e solicitação de feedback enviada!");
  };

  // === Voltar para lista de tickets ===
  const handleBackToList = () => {
    setSelectedTicket(null);
    setMessages([]);
    setInputMessage("");
  };

  // === Scroll automático ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isTicketClosed = selectedTicket?.status === "closed";

  // === Calcula estatísticas ===
  const stats = {
    waiting: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    total: tickets.length
  };

  // === Renderização ===
  return (
    <div className="flex h-screen bg-gray-100">
      {/* ==== Sidebar ==== */}
      <div className="w-1/4 bg-white border-r overflow-y-auto flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h2 className="text-xl font-bold">Tickets Ativos</h2>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.waiting} Aguardando</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{stats.inProgress} Em Atendimento</span>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum ticket ativo</p>
            <p className="text-gray-400 text-sm mt-2">
              Todos os casos foram resolvidos pela IA ou técnicos
            </p>
          </div>
        ) : (
          <div className="flex-1">
            {tickets.map((ticket) => {
              const statusInfo = getStatusDisplay(ticket.status);
              const isSelected = selectedTicket?.id === ticket.id;
              
              return (
                <div
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`p-4 border-b cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-blue-50 border-blue-400 border-l-4"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <p className="font-semibold text-gray-800 truncate">
                          {ticket.client_name || "Cliente"}
                        </p>
                      </div>
                      {ticket.client_email && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {ticket.client_email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.colorClass}`}
                        >
                          {statusInfo.text}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{ticket.id.slice(0, 6)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 text-right">
                      <div>{new Date(ticket.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                      <div className="mt-1">
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==== Área principal ==== */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Header fixo */}
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedTicket.client_name}
                    </h2>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-gray-500">
                        {selectedTicket.client_email || "Sem e-mail"}
                      </p>
                      <span className="text-gray-300">•</span>
                      <p className="text-sm text-gray-500 font-mono">
                        Ticket: #{selectedTicket.id.slice(0, 8).toUpperCase()}
                      </p>
                      <span className="text-gray-300">•</span>
                      <p className={`text-sm font-medium ${
                        isTicketClosed ? "text-red-500" : "text-green-500"
                      }`}>
                        {getStatusDisplay(selectedTicket.status).text}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Criado em: {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                  {selectedTicket.resolved_at && (
                    <span className="ml-4">
                      Finalizado em: {new Date(selectedTicket.resolved_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseTicket}
                  disabled={isTicketClosed}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Encerrar Chamado
                </button>
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Voltar
                </button>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm mt-2 text-gray-400">
                    Inicie a conversa com {selectedTicket.client_name}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    isTicketClosed
                      ? "Chamado encerrado. Não é possível enviar mensagens."
                      : `Digite sua resposta para ${selectedTicket.client_name}...`
                  }
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading || isTicketClosed}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading || isTicketClosed}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Enviar
                </button>
              </form>
              
              {!isTicketClosed && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💬 Atendendo <span className="font-semibold">{selectedTicket.client_name}</span>
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <MessageSquare className="w-24 h-24 mb-6 text-gray-300" />
            <h3 className="text-2xl font-bold mb-2 text-gray-700">Painel do Técnico</h3>
            <p className="text-gray-600 text-center max-w-md mb-8">
              Selecione um ticket na sidebar para iniciar o atendimento ao cliente
            </p>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.waiting}
                </div>
                <div className="text-sm text-yellow-700 font-medium">Aguardando IA</div>
                <div className="text-xs text-yellow-600 mt-1">Em triagem automática</div>
              </div>
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.inProgress}
                </div>
                <div className="text-sm text-blue-700 font-medium">Em Atendimento</div>
                <div className="text-xs text-blue-600 mt-1">Com técnicos</div>
              </div>
              <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.total}
                </div>
                <div className="text-sm text-purple-700 font-medium">Total Ativos</div>
                <div className="text-xs text-purple-600 mt-1">Tickets em aberto</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};