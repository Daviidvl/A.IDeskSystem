export interface Ticket {
  id: string;
  customerName: string;
  problem: string;
  status: 'aberto' | 'em_andamento' | 'fechado';
  createdAt: Date;
  messages: Message[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'cliente' | 'tecnico';
  timestamp: Date;
}

export type UserType = 'cliente' | 'tecnico' | null;
