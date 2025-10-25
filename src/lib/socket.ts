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

// 🔹 Evento quando técnico encerra ticket
export const sendTicketResolved = (ticketId: string) => {
  if (!socket) return;
  socket.emit("ticket_resolved", { ticketId });
};

// 🔹 Evento quando IA resolve automaticamente
export const sendTicketAutoResolved = (ticketId: string) => {
  if (!socket) return;
  socket.emit("ticket_auto_resolved", { ticketId });
};

// 🔹 Ouvir evento de encerramento por técnico
export const onTicketResolved = (callback: (payload: { ticketId: string }) => void) => {
  if (!socket) return;
  socket.on("ticket_resolved", callback);
};

// 🔹 NOVO: Ouvir evento de resolução automática pela IA
export const onTicketAutoResolved = (callback: (payload: { ticketId: string }) => void) => {
  if (!socket) return;
  socket.on("ticket_auto_resolved", callback);
};

// 🔹 NOVO: Evento quando ticket é assumido por técnico
export const sendTicketAssumed = (ticketId: string, technicianName: string) => {
  if (!socket) return;
  socket.emit("ticket_assumed", { ticketId, technicianName });
};

// 🔹 NOVO: Ouvir quando ticket é assumido
export const onTicketAssumed = (callback: (payload: { ticketId: string; technicianName: string }) => void) => {
  if (!socket) return;
  socket.on("ticket_assumed", callback);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};