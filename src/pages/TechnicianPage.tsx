import React, { useState, useEffect, useRef } from 'react';
import { Send, LogOut, Ticket as TicketIcon, Clock, CheckCircle } from 'lucide-react';
import { supabase, Ticket, Message } from '../lib/supabase';
import { ChatMessage } from '../components/ChatMessage';
import { initSocket, joinTicket, sendSocketMessage } from '../lib/socket';


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
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('techAuth');
    if (savedAuth) {
      const { name, id } = JSON.parse(savedAuth);
      setTechName(name);
      setTechId(id);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
      const interval = setInterval(loadTickets, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    if (data) {
      setTickets(data);
    }
  };

  const loadMessages = async () => {
    if (!selectedTicket) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', selectedTicket.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      setError('Usuário ou senha inválidos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTechName('');
    setTechId('');
    localStorage.removeItem('techAuth');
    setSelectedTicket(null);
  };

  const newMessageHandlerRef = React.useRef<((m:any)=>void) | null>(null);

const handleSelectTicket = async (ticket: Ticket) => {
  setSelectedTicket(ticket);

  if (ticket.status === 'open') {
    await supabase
      .from('tickets')
      .update({
        status: 'in_progress',
        assigned_technician_id: techId
      })
      .eq('id', ticket.id);

    loadTickets();
  }

  // Conectar socket e entrar na sala
  const s = initSocket();
  s.emit('join_ticket', ticket.id);

  // remove listener anterior (se houver)
  if (newMessageHandlerRef.current) {
    s.off('new_message', newMessageHandlerRef.current);
    newMessageHandlerRef.current = null;
  }

  const handler = (msg: any) => {
    // msg deve ser o objeto salvo no supabase (com id, content, sender_type...)
    if (msg.ticket_id !== ticket.id) return;
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  newMessageHandlerRef.current = handler;
  s.on('new_message', handler);

  // carrega mensagens atuais
  loadMessages();
};


  const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputMessage.trim() || !selectedTicket) return;

  // insere no banco (persistência)
  const { data, error } = await supabase
    .from('messages')
    .insert({
      ticket_id: selectedTicket.id,
      sender_type: 'technician',
      sender_name: techName,
      content: inputMessage
    })
    .select()
    .single();

  setInputMessage('');
  // atualiza lista local
  if (data) setMessages(prev => [...prev, data]);

  // emite via socket para clientes conectados
  try {
    sendSocketMessage(selectedTicket.id, data);
  } catch (err) {
    console.warn('socket emit failed:', err);
  }

  // opcional: atualiza via loadMessages() se quiser
  // loadMessages();
};


  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    await supabase
      .from('tickets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', selectedTicket.id);

    setSelectedTicket(null);
    loadTickets();
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Entrar
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Acesso padrão:</strong><br />
              Usuário: admin<br />
              Senha: admin123
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Portal do Técnico</h1>
            <p className="text-sm opacity-90">Bem-vindo, {techName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TicketIcon className="w-5 h-5" />
              Chamados ({tickets.length})
            </h2>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-gray-900">
                      {ticket.client_name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        ticket.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ticket.status === 'open' ? 'Novo' : 'Em atendimento'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {ticket.problem_description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.created_at).toLocaleString('pt-BR')}
                  </div>
                </button>
              ))}

              {tickets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <TicketIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum chamado aberto</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg">
            {selectedTicket ? (
              <div className="h-[calc(100vh-120px)] flex flex-col">
                <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{selectedTicket.client_name}</h3>
                      <p className="text-sm opacity-90">{selectedTicket.client_email}</p>
                      <p className="text-xs opacity-75 mt-1">
                        #{selectedTicket.id.slice(0, 8)}
                      </p>
                    </div>
                    <button
                      onClick={handleResolveTicket}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolver
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-120px)] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione um chamado para iniciar o atendimento</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};