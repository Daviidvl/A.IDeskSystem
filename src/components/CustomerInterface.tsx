import React, { useState, useRef, useEffect } from 'react';
import { Ticket, Message } from '../types';
import { Send, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface CustomerInterfaceProps {
  onCreateTicket: (name: string, problem: string) => string;
  onSendMessage: (ticketId: string, message: string) => void;
  tickets: Ticket[];
  onBack: () => void;
}

export const CustomerInterface: React.FC<CustomerInterfaceProps> = ({
  onCreateTicket,
  onSendMessage,
  tickets,
  onBack
}) => {
  const [step, setStep] = useState<'form' | 'chat'>('form');
  const [customerName, setCustomerName] = useState('');
  const [problem, setProblem] = useState('');
  const [currentTicketId, setCurrentTicketId] = useState<string>('');
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentTicket = tickets.find(t => t.id === currentTicketId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentTicket?.messages]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !problem.trim()) return;

    const ticketId = onCreateTicket(customerName, problem);
    setCurrentTicketId(ticketId);
    setStep('chat');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentTicketId) return;

    onSendMessage(currentTicketId, message);
    setMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-orange-100 text-orange-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'fechado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto': return 'Aberto';
      case 'em_andamento': return 'Em Andamento';
      case 'fechado': return 'Fechado';
      default: return status;
    }
  };

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Abrir Chamado de Suporte</h1>
              <p className="text-gray-600">Descreva seu problema e nossa equipe técnica irá ajudá-lo</p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite seu nome completo"
                  required
                />
              </div>

              <div>
                <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Problema
                </label>
                <textarea
                  id="problem"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Descreva detalhadamente o problema que está enfrentando..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
              >
                Abrir Chamado
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </button>
          
          {currentTicket && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <h2 className="font-semibold text-gray-900">Ticket {currentTicket.id}</h2>
                <p className="text-sm text-gray-600">{customerName}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(currentTicket.status)}`}>
                {getStatusLabel(currentTicket.status)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {currentTicket?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'cliente' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.sender === 'cliente'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm border'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'cliente' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        {currentTicket?.status !== 'fechado' && (
          <div className="p-4 bg-white border-t">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite sua mensagem..."
              />
              <button
                type="submit"
                disabled={!message.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {currentTicket?.status === 'fechado' && (
          <div className="p-4 bg-green-50 border-t border-green-200">
            <div className="flex items-center justify-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Chamado finalizado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
