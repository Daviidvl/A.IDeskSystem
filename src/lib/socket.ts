// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (ticketId?: string) => {
  if (socket) return socket;

  socket = io('http://localhost:3001', {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    // se ticketId foi passado na inicialização, já entra na sala
    if (ticketId) socket!.emit('join_ticket', ticketId);
    console.log('socket connected', socket!.id);
  });

  return socket;
};

export const joinTicket = (ticketId: string) => {
  const s = initSocket();
  s.emit('join_ticket', ticketId);
  return s;
};

export const sendSocketMessage = (ticketId: string, message: any) => {
  const s = initSocket();
  if (!s) return;
  if (message.sender_type === 'client') {
    s.emit('client_message', { ticketId, message });
  } else {
    s.emit('technician_message', { ticketId, message });
  }
};

export const onNewMessage = (cb: (message: any) => void) => {
  const s = initSocket();
  s.on('new_message', cb);
  // devolve função cleanup quando necessário
  return () => s.off('new_message', cb);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
