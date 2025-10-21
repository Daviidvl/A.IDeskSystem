// src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io("http://localhost:3001"); // 🔹 mesma porta do server.js
  }
  return socket;
};

export const joinTicket = (ticketId: string) => {
  if (!socket) return;
  socket.emit("join_ticket", ticketId);
};

export const sendSocketMessage = (ticketId: string, message: any) => {
  if (!socket) return;
  socket.emit("send_message", { ticketId, message });
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