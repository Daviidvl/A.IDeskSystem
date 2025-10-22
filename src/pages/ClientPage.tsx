import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { LGPDModal } from '../components/LGPDModal';
import { ChatMessage } from '../components/ChatMessage';
import { supabase, Message } from '../lib/supabase';
import { getAIResponse } from '../lib/aiResponses'; // ✅ apenas uma função
import { initSocket, joinTicket, sendSocketMessage, onNewMessage, disconnectSocket } from '../lib/socket';

export const ClientPage: React.FC = () => {
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [showNameForm, setShowNameForm] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStep, setConversationStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conecta e ouve novas mensagens
  useEffect(() => {
    if (!ticketId) return;

    initSocket();
    joinTicket(ticketId);

    const handleNew = (msg: any) => {
      if (msg.ticket_id && msg.ticket_id !== ticketId) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    onNewMessage(handleNew);
    return () => disconnectSocket();
  }, [ticketId]);

  useEffect(() => scrollToBottom(), [messages]);

  const addMessage = async (content: string, senderType: 'client' | 'ai' | 'technician', senderName: string) => {
    if (!ticketId) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_name: senderName,
        content
      })
      .select()
      .single();

    if (data && !error) {
      setMessages(prev => [...prev, data]);
      try {
        sendSocketMessage(ticketId, data);
      } catch (err) {
        console.warn('socket emit failed:', err);
      }
      return data;
    }
  };

  const handleLGPDAccept = () => setLgpdAccepted(true);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setShowNameForm(false);
    setIsLoading(true);

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        problem_description: 'Em andamento',
        status: 'open',
        lgpd_accepted: true
      })
      .select()
      .single();

    if (ticket && !error) {
      setTicketId(ticket.id);

      const welcomeMsg: Message = {
        id: crypto.randomUUID(),
        ticket_id: ticket.id,
        sender_type: 'ai',
        sender_name: 'A.I Assistant',
        content: `Olá ${clientName}! 👋\n\nSou o assistente virtual da A.I Desk. Estou aqui para ajudar com seu problema técnico.\n\nPor favor, descreva qual é o problema que você está enfrentando.`,
        created_at: new Date().toISOString()
      };

      setMessages([welcomeMsg]);
      await addMessage(welcomeMsg.content, 'ai', 'A.I Assistant');
    }

    setIsLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !ticketId || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    await addMessage(userMessage, 'client', clientName);

    if (conversationStep === 0) {
      await supabase
        .from('tickets')
        .update({ problem_description: userMessage })
        .eq('id', ticketId);

      const aiResponse = await getAIResponse(ticketId, userMessage);

      setTimeout(async () => {
        await addMessage(aiResponse.text, 'ai', 'A.I Assistant');

        if (aiResponse.requiresHuman) {
          await supabase
            .from('tickets')
            .update({ status: 'in_progress' })
            .eq('id', ticketId);

          await addMessage(
            `Seu chamado foi encaminhado para nossa equipe técnica. Um especialista entrará em contato em breve.\n\nNúmero do chamado: #${ticketId.slice(0, 8)}`,
            'ai',
            'A.I Assistant'
          );
        } else {
          setConversationStep(1);
        }
        setIsLoading(false);
      }, 1500);
    } else {
      // Etapa de acompanhamento/resolução
      const aiResponse = await getAIResponse(ticketId, userMessage);
      setTimeout(async () => {
        await addMessage(aiResponse.text, 'ai', 'A.I Assistant');

        if (aiResponse.requiresHuman) {
          await supabase
            .from('tickets')
            .update({ status: 'in_progress' })
            .eq('id', ticketId);
        } else {
          await supabase
            .from('tickets')
            .update({ status: 'resolved', resolved_at: new Date().toISOString() })
            .eq('id', ticketId);
        }

        setIsLoading(false);
      }, 1500);
    }
  };

  if (!lgpdAccepted) return <LGPDModal onAccept={handleLGPDAccept} />;

  if (showNameForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <MessageSquare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao A.I Desk</h1>
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
              {isLoading ? 'Iniciando...' : 'Iniciar Atendimento'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-2xl font-bold">A.I Desk - Suporte</h1>
            <p className="text-sm opacity-90">Atendimento: {clientName}</p>
            {ticketId && (
              <p className="text-xs opacity-75 mt-1">Chamado: #{ticketId.slice(0, 8)}</p>
            )}
          </div>

          <div className="h-[calc(100%-180px)] overflow-y-auto p-6 bg-gray-50">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

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
        </div>
      </div>
    </div>
  );
};

