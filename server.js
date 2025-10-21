// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173', // seu frontend Vite
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('🟢 socket connected:', socket.id);

  socket.on('join_ticket', (ticketId) => {
    if (!ticketId) return;
    socket.join(ticketId);
    console.log(`➡️ ${socket.id} joined ticket ${ticketId}`);
  });

  socket.on('client_message', ({ ticketId, message }) => {
    console.log(`📨 client_message on ${ticketId}:`, message);
    io.to(ticketId).emit('new_message', message);
  });

  socket.on('technician_message', ({ ticketId, message }) => {
    console.log(`📨 technician_message on ${ticketId}:`, message);
    io.to(ticketId).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log('🔴 socket disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => console.log(`🚀 Socket server running at http://localhost:${PORT}`));


