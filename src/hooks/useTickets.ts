import { useState, useCallback } from 'react';
import { Ticket, Message } from '../types';

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const createTicket = useCallback((customerName: string, problem: string): string => {
    const ticketId = `TK-${Date.now().toString().slice(-6)}`;
    
    const newTicket: Ticket = {
      id: ticketId,
      customerName,
      problem,
      status: 'aberto',
      createdAt: new Date(),
      messages: [{
        id: `msg-${Date.now()}`,
        text: `Problema reportado: ${problem}`,
        sender: 'cliente',
        timestamp: new Date()
      }]
    };

    setTickets(prev => [newTicket, ...prev]);
    return ticketId;
  }, []);

  const addMessage = useCallback((ticketId: string, text: string, sender: 'cliente' | 'tecnico') => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? {
            ...ticket,
            messages: [...ticket.messages, {
              id: `msg-${Date.now()}`,
              text,
              sender,
              timestamp: new Date()
            }],
            status: sender === 'tecnico' && ticket.status === 'aberto' ? 'em_andamento' : ticket.status
          }
        : ticket
    ));
  }, []);

  const updateTicketStatus = useCallback((ticketId: string, status: Ticket['status']) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId ? { ...ticket, status } : ticket
    ));
  }, []);

  const getTicketById = useCallback((ticketId: string) => {
    return tickets.find(ticket => ticket.id === ticketId);
  }, [tickets]);

  return {
    tickets,
    createTicket,
    addMessage,
    updateTicketStatus,
    getTicketById
  };
};
