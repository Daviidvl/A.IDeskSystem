import React, { useEffect, useState, useRef } from "react";
import { Send, CheckCircle, MessageSquare, XCircle, User, Clock, LogOut, BarChart3, Zap, Lock, Plus, Trash2 } from "lucide-react";
import { api, Message, Macro } from "../lib/api";
import { auth } from "../lib/auth";
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
import { useNavigate } from "react-router-dom";

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [showMacros, setShowMacros] = useState(false);
  const [showNewMacroForm, setShowNewMacroForm] = useState(false);
  const [newMacroTitle, setNewMacroTitle] = useState("");
  const [newMacroContent, setNewMacroContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // === Carregar usuário atual ===
  useEffect(() => {
    const getUser = async () => {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  // === Carregar respostas rápidas (macros) ===
  useEffect(() => {
    api.listMacros().then(setMacros).catch((error) => {
      console.error("Erro ao carregar respostas rápidas:", error);
    });
  }, []);

  // === Aplicar macro no campo de mensagem ===
  const applyMacro = (macro: Macro) => {
    setInputMessage(macro.content);
    setShowMacros(false);
  };

  // === Criar nova resposta rápida ===
  const handleCreateMacro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroTitle.trim() || !newMacroContent.trim()) return;

    try {
      const macro = await api.createMacro(newMacroTitle.trim(), newMacroContent.trim());
      setMacros((prev) => [...prev, macro]);
      setNewMacroTitle("");
      setNewMacroContent("");
      setShowNewMacroForm(false);
    } catch (error) {
      console.error("Erro ao criar resposta rápida:", error);
    }
  };

  // === Excluir resposta rápida ===
  const handleDeleteMacro = async (id: string) => {
    try {
      await api.deleteMacro(id);
      setMacros((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Erro ao excluir resposta rápida:", error);
    }
  };

  // === Carrega todos os tickets abertos ou em andamento ===
  const loadTickets = async () => {
    try {
      const data = await api.listTickets(["open", "in_progress"]);
      setTickets(data);

      setSelectedTicket((current: any) => {
        if (current && !data.some((t) => t.id === current.id)) {
          setMessages([]);
          return null;
        }
        return current;
      });
    } catch (error) {
      console.error("Erro ao carregar tickets:", error);
    }
  };

  // === Carrega as mensagens do ticket selecionado ===
  const loadMessages = async (ticketId: string) => {
    try {
      const data = await api.listMessages(ticketId);
      setMessages(data);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  // === Atualiza a lista de tickets periodicamente (substitui o realtime do Supabase) ===
  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  // === Recarrega mensagens do ticket selecionado periodicamente ===
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => loadMessages(selectedTicket.id), 5000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  // === SOCKET.IO realtime ===
  useEffect(() => {
    initSocket();

    const handleNewMessage = (msg: any) => {
      if (msg?.sender_type === "ai" && msg?.content?.includes("Novo ticket")) {
        loadTickets();
      }

      if (selectedTicket && msg.ticket_id === selectedTicket.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    };

    const handleTicketAutoResolved = (payload: { ticketId: string }) => {
      setTickets(prev => prev.filter(t => t.id !== payload.ticketId));
      if (selectedTicket?.id === payload.ticketId) {
        setSelectedTicket(null);
        setMessages([]);
      }
    };

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

    if (ticket.status === "open") {
      try {
        const updated = await api.updateTicket(ticket.id, { status: "in_progress" });
        setSelectedTicket(updated);
        loadTickets();

        const msgData = await api.sendMessage(ticket.id, {
          sender_type: "technician",
          sender_name: "Técnico",
          content: `Olá! Sou o técnico responsável pelo seu caso. Em que posso ajudá-lo? 👨‍💻`,
        });

        setMessages((prev) => [...prev, msgData]);
        sendTicketAssumed(ticket.id, "Técnico");
      } catch (error) {
        console.error("Erro ao assumir ticket:", error);
      }
    }
  };

  // === Enviar mensagem ===
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !inputMessage.trim()) return;
    setIsLoading(true);

    try {
      const data = await api.sendMessage(selectedTicket.id, {
        sender_type: "technician",
        sender_name: "Técnico",
        content: inputMessage.trim(),
        is_internal: isInternalNote,
      });

      setMessages((prev) => [...prev, data]);

      if (!isInternalNote && selectedTicket.status === 'open') {
        const updatedTicket = await api.updateTicket(selectedTicket.id, { status: "in_progress" });
        setSelectedTicket(updatedTicket);
        loadTickets();
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }

    setInputMessage("");
    setIsLoading(false);
  };

  // === Encerrar chamado ===
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    if (!confirm("Tem certeza que deseja encerrar este chamado? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      await api.updateTicket(selectedTicket.id, {
        status: "closed",
        resolved_at: new Date().toISOString(),
      });
    } catch {
      alert("Erro ao encerrar o chamado.");
      return;
    }

    try {
      const msgData = await api.sendMessage(selectedTicket.id, {
        sender_type: "ai",
        sender_name: "A.I Assistant",
        content: "✅ Seu chamado foi encerrado com sucesso! Por favor, avalie o atendimento atribuindo uma nota de 1 a 5 ⭐ e, se desejar, deixe um comentário. 💬",
      });
      setMessages((prev) => [...prev, msgData]);
    } catch (error) {
      console.error("Erro ao enviar mensagem de encerramento:", error);
    }

    sendSocketMessage(selectedTicket.id, {
      ticket_id: selectedTicket.id,
      type: "ticket_resolved",
    });

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

  // === Logout ===
  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  // === Ir para Dashboard ===
  const goToDashboard = () => {
    navigate('/dashboard');
  };

  // === Scroll automático ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">Tickets Ativos</h2>
            <div className="flex gap-2">
              <button
                onClick={goToDashboard}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Dashboard"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{stats.waiting} Aguardando</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{stats.inProgress} Em Atendimento</span>
            </div>
          </div>
          <p className="text-xs opacity-75 mt-2 truncate">
            {currentUser?.email}
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Nenhum ticket ativo</p>
            <p className="text-gray-400 text-sm mt-2">
              Todos os casos foram resolvidos
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
            <div className="bg-white border-t p-4 relative">
              {/* Painel de respostas rápidas */}
              {showMacros && (
                <div className="absolute bottom-full left-4 mb-2 w-96 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-10">
                  <div className="p-2 border-b flex justify-between items-center bg-gray-50">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Respostas rápidas</span>
                    <button
                      type="button"
                      onClick={() => setShowNewMacroForm((v) => !v)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium"
                    >
                      <Plus className="w-3 h-3" /> Nova
                    </button>
                  </div>

                  {showNewMacroForm && (
                    <form onSubmit={handleCreateMacro} className="p-3 border-b bg-blue-50 space-y-2">
                      <input
                        type="text"
                        placeholder="Título"
                        value={newMacroTitle}
                        onChange={(e) => setNewMacroTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <textarea
                        placeholder="Texto da resposta"
                        value={newMacroContent}
                        onChange={(e) => setNewMacroContent(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        rows={2}
                      />
                      <button
                        type="submit"
                        disabled={!newMacroTitle.trim() || !newMacroContent.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </form>
                  )}

                  {macros.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400 text-center">Nenhuma resposta rápida cadastrada</p>
                  ) : (
                    macros.map((macro) => (
                      <div
                        key={macro.id}
                        className="flex items-start justify-between gap-2 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 group"
                      >
                        <button
                          type="button"
                          onClick={() => applyMacro(macro)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium text-gray-800">{macro.title}</p>
                          <p className="text-xs text-gray-500 truncate">{macro.content}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMacro(macro.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setShowMacros((v) => !v)}
                  disabled={isTicketClosed}
                  className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                    showMacros
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Respostas rápidas
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternalNote((v) => !v)}
                  disabled={isTicketClosed}
                  className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                    isInternalNote
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Nota interna
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    isTicketClosed
                      ? "Chamado encerrado. Não é possível enviar mensagens."
                      : isInternalNote
                      ? "Escreva uma nota interna (não visível ao cliente)..."
                      : `Digite sua resposta para ${selectedTicket.client_name}...`
                  }
                  className={`flex-1 border rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent ${
                    isInternalNote
                      ? "border-amber-300 bg-amber-50 focus:ring-amber-400"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  disabled={isLoading || isTicketClosed}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading || isTicketClosed}
                  className={`text-white px-6 py-3 rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${
                    isInternalNote ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isInternalNote ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {isInternalNote ? "Salvar nota" : "Enviar"}
                </button>
              </form>

              {!isTicketClosed && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {isInternalNote
                    ? "🔒 Esta nota será visível apenas para técnicos"
                    : (
                      <>💬 Atendendo <span className="font-semibold">{selectedTicket.client_name}</span></>
                    )}
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
            
            {/* Botão para Dashboard */}
            <div className="mt-8">
              <button
                onClick={goToDashboard}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <BarChart3 className="w-5 h-5" />
                Ver Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};