import React, { useState, useRef, useEffect } from 'react';
import { Ticket } from '../types';
import { Search, Send, ArrowLeft, Clock, CheckCircle, PlayCircle, X } from 'lucide-react';

interface TechnicianInterfaceProps {
  tickets: Ticket[];
  onSendMessage: (ticketId: string, message: string) => void;
  onUpdateStatus: (ticketId: string, status: Ticket['status']) => void;
  onBack: () => void;
}

export const TechnicianInterface: React.FC<TechnicianInterfaceProps> = ({
  tickets,
  onSendMessage,
  onUpdateStatus,
  onBack
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  
  const filteredTickets = tickets.filter(ticket =>
    ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.problem.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedTicket?.messages]);

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedTicketId) return;

    onSendMessage(selectedTicketId, message);
    setMessage('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'text-orange-600 bg-orange-100';
      case 'em_andamento': return 'text-blue-600 bg-blue-100';
      case 'fechado': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto': return Clock;
      case 'em_andamento': return PlayCircle;
      case 'fechado': return CheckCircle;
      default: return Clock;
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </button>
          
          <h1 className="text-xl font-bold text-gray-900 mb-4">Painel Técnico</h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, nome..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>Nenhum chamado encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTickets.map((ticket) => {
                const StatusIcon = getStatusIcon(ticket.status);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedTicketId === ticket.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-gray-600">{ticket.id}</span>
                      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{getStatusLabel(ticket.status)}</span>
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{ticket.customerName}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{ticket.problem}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {ticket.createdAt.toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ticket.messages.length} mensagens
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedTicket.customerName}
                  </h2>
                  <p className="text-sm text-gray-600">Ticket: {selectedTicket.id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedTicket.status !== 'fechado' && (
                    <>
                      {selectedTicket.status === 'aberto' && (
                        <button
                          onClick={() => onUpdateStatus(selectedTicket.id, 'em_andamento')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Iniciar Atendimento
                        </button>
                      )}
                      <button
                        onClick={() => onUpdateStatus(selectedTicket.id, 'fechado')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Finalizar
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Problem Description */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Problema reportado:</p>
                <p className="text-sm text-gray-900">{selectedTicket.problem}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {selectedTicket.messages.slice(1).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'tecnico' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender === 'tecnico'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm border'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'tecnico' ? 'text-green-100' : 'text-gray-500'
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
            {selectedTicket.status !== 'fechado' && (
              <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Digite sua resposta..."
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}

            {selectedTicket.status === 'fechado' && (
              <div className="p-4 bg-green-50 border-t border-green-200">
                <div className="flex items-center justify-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Chamado finalizado</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Selecione um chamado para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
