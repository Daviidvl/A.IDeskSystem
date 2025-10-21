import React, { useState, useEffect, useRef } from 'react';
import { Send, LogOut, Ticket as TicketIcon, Clock, CheckCircle } from 'lucide-react';
import { supabase, Ticket, Message } from '../lib/supabase';
import { ChatMessage } from '../components/ChatMessage';
import { initSocket, sendSocketMessage } from '../lib/socket';

export const TechnicianPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [techName, setTechName] = useState('');
  const [techId, setTechId] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // 🔹 mantém login local
  useEffect(() => {
    const savedAuth = localStorage.getItem('techAuth');
    if (savedAuth) {
      const { name, id } = JSON.parse(savedAuth);
      setTechName(name);
      setTechId(id);
      setIsAuthenticated(true);
    }
  }, []);

  // 🔹 recarrega tickets periodicamente
  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
      const interval = setInterval(loadTickets, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // 🔹 scroll automático no chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    if (data) setTickets(data);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data } = await supabase
      .from('technicians')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (data) {
      setTechName(data.name);
      setTechId(data.id);
      setIsAuthenticated(true);
      localStorage.setItem('techAuth', JSON.stringify({ name: data.name, id: data.id }));
    } else {
      alert('Usuário ou senha inválidos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTechName('');
    setTechId('');
    localStorage.removeItem('techAuth');
    setSelectedTicket(null);
    if (socketRef.current) socketRef.current.disconnect();
  };

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);

    // 🔸 muda status para "em atendimento" se estiver aberto
    if (ticket.status === 'open') {
      await supabase
        .from('tickets')
        .update({
          status: 'in_progress',
          assigned_technician_id: techId,
        })
        .eq('id', ticket.id);
      loadTickets();
    }

    // 🔸 cria conexão Socket.IO
    if (!socketRef.current) socketRef.current = initSocket();

    // 🔸 entra na sala do ticket
    socketRef.current.emit('join_ticket', ticket.id);

    // 🔸 evita múltiplos listeners
    socketRef.current.off('new_message');
    socketRef.current.on('new_message', (msg: any) => {
      if (msg.ticket_id === ticket.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputMessage.trim() || !selectedTicket) return;

  const newMessage = {
    ticket_id: selectedTicket.id,
    sender_type: 'technician',
    sender_name: techName,
    content: inputMessage,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(newMessage)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    alert(`Erro ao enviar mensagem: ${error.message}`);
    return;
  }

  setInputMessage('');
  setMessages((prev) => [...prev, data]);
  sendSocketMessage(selectedTicket.id, data);

  // recarrega mensagens (garantia extra)
  setTimeout(() => loadMessages(selectedTicket.id), 500);
};

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', selectedTicket.id);

    setSelectedTicket(null);
    loadTickets();
  };

  // 🔹 Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <TicketIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Portal do Técnico</h1>
            <p className="text-gray-600">A.I Desk</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite seu usuário"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🔹 Tela Principal
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Painel lateral */}
      <div className="w-1/4 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <h2 className="text-xl font-bold">Técnico: {techName}</h2>
          <button
            onClick={handleLogout}
            className="mt-3 bg-white text-blue-700 hover:bg-gray-100 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-gray-700 font-semibold px-4 py-3 border-b">Tickets Abertos</h3>
          {tickets.length === 0 && (
            <p className="text-gray-500 text-center p-4">Nenhum chamado aberto.</p>
          )}
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTicket(t)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-blue-50 transition ${
                selectedTicket?.id === t.id ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{t.client_name}</span>
                {t.status === 'open' ? (
                  <Clock className="w-4 h-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{t.problem_description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Cliente: {selectedTicket.client_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Chamado: #{selectedTicket.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={handleResolveTicket}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <CheckCircle size={18} /> Encerrar Chamado
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione um ticket para começar o atendimento
          </div>
        )}
      </div>
    </div>
  );
};
