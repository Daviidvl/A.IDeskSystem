// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket"],
    });
  }
  return socket;
};

export const joinTicket = (ticketId: string) => {
  if (!socket) return;
  socket.emit("join_ticket", ticketId);
};

export const sendSocketMessage = (ticketId: string, message: any) => {
  if (!socket) return;

  // 🔹 Corrigido: estrutura esperada pelo servidor
  const formattedMessage = {
    ticket_id: ticketId,
    ...message,
  };

  socket.emit("send_message", formattedMessage);
};

export const onNewMessage = (callback: (message: any) => void) => {
  if (!socket) return;
  socket.on("new_message", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
