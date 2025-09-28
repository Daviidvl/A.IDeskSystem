export interface Message {
  id: string;
  text: string;
  sender: 'client' | 'tech' | 'system';
  timestamp: Date;
}

export interface Ticket {
  id: string;
  clientName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  messages: Message[];
}

export interface Metrics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  averageResponseTime: string;
}