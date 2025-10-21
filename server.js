import { Server } from "socket.io";
import http from "http";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Novo cliente conectado:", socket.id);

  socket.on("join_ticket", (ticketId) => {
    socket.join(ticketId);
    console.log(`👥 Cliente entrou na sala: ${ticketId}`);
  });

  socket.on("send_message", (msg) => {
    console.log("📨 Mensagem recebida:", msg);
    io.to(msg.ticket_id).emit("new_message", msg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

server.listen(3001, () => console.log("🚀 Socket.IO rodando na porta 3001"));



