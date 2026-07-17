import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import { db } from "./server/db.js";
import { signToken, requireAuth } from "./server/auth.js";
import { getAssistantReply } from "./server/ai.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ---------- Auth ----------
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const technician = db.findTechnicianByUsername(username || "");

  if (!technician || !bcrypt.compareSync(password || "", technician.password)) {
    return res.status(401).json({ error: "Credenciais inválidas. Verifique seu usuário e senha." });
  }

  const token = signToken(technician);
  res.json({
    token,
    user: {
      id: technician.id,
      username: technician.username,
      name: technician.name,
      email: technician.email,
    },
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const technician = db.findTechnicianById(req.user.sub);
  if (!technician) return res.status(404).json({ error: "Técnico não encontrado" });

  res.json({
    user: {
      id: technician.id,
      username: technician.username,
      name: technician.name,
      email: technician.email,
    },
  });
});

// ---------- Tickets ----------
app.post("/api/tickets", (req, res) => {
  const { client_name, client_email, problem_description, lgpd_accepted } = req.body || {};
  if (!client_name) {
    return res.status(400).json({ error: "client_name é obrigatório" });
  }

  const ticket = db.createTicket({ client_name, client_email, problem_description, lgpd_accepted });
  res.status(201).json(ticket);
});

app.get("/api/tickets", (req, res) => {
  const statusParam = req.query.status;
  const statuses = statusParam ? String(statusParam).split(",") : null;
  res.json(db.listTickets(statuses));
});

app.get("/api/tickets/:id", (req, res) => {
  const ticket = db.getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });
  res.json(ticket);
});

app.patch("/api/tickets/:id", (req, res) => {
  const ticket = db.updateTicket(req.params.id, req.body || {});
  if (!ticket) return res.status(404).json({ error: "Ticket não encontrado" });
  res.json(ticket);
});

// ---------- Messages ----------
app.get("/api/tickets/:id/messages", (req, res) => {
  res.json(db.listMessages(req.params.id));
});

app.post("/api/tickets/:id/messages", (req, res) => {
  const { sender_type, sender_name, content, is_internal } = req.body || {};
  if (!sender_type || !sender_name || !content) {
    return res.status(400).json({ error: "sender_type, sender_name e content são obrigatórios" });
  }

  const message = db.createMessage({
    ticket_id: req.params.id,
    sender_type,
    sender_name,
    content,
    is_internal,
  });

  io.to(message.ticket_id).emit("new_message", message);
  res.status(201).json(message);
});

// ---------- Respostas rápidas (macros) ----------
app.get("/api/macros", requireAuth, (req, res) => {
  res.json(db.listMacros());
});

app.post("/api/macros", requireAuth, (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "title e content são obrigatórios" });
  }
  res.status(201).json(db.createMacro({ title, content }));
});

app.delete("/api/macros/:id", requireAuth, (req, res) => {
  const deleted = db.deleteMacro(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Resposta rápida não encontrada" });
  res.status(204).end();
});

// ---------- Feedback ----------
app.post("/api/tickets/:id/feedback", (req, res) => {
  const { rating, comment } = req.body || {};
  const feedback = db.createFeedback({ ticket_id: req.params.id, rating, comment });
  res.status(201).json(feedback);
});

// ---------- AI (Anthropic Claude) ----------
app.post("/api/ai/respond", async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "message é obrigatório" });

  try {
    const text = await getAssistantReply(message);
    res.json({ text });
  } catch (err) {
    console.error("Erro na IA:", err);
    res.status(502).json({ error: "Erro ao consultar a IA" });
  }
});

// ---------- Socket.IO ----------
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Servidor A.I Desk rodando na porta ${PORT}`));
