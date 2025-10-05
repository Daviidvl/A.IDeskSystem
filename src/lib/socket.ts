import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (ticketId: string) => {
  if (!socket) {
    socket = io('http://localhost:3001', {
      query: { ticketId },
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};