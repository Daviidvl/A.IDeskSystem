import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data.json");

function seed() {
  const now = new Date().toISOString();
  return {
    technicians: [
      {
        id: crypto.randomUUID(),
        username: "admin",
        password: bcrypt.hashSync("admin123", 10),
        name: "Administrador",
        email: "admin@aidesk.com",
        created_at: now,
      },
    ],
    tickets: [],
    messages: [],
    feedbacks: [],
    macros: [
      {
        id: crypto.randomUUID(),
        title: "Saudação inicial",
        content: "Olá! Sou o técnico responsável pelo seu caso. Em que posso ajudá-lo? 👨‍💻",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        title: "Pedido de reinício",
        content: "Você já tentou reiniciar o equipamento? Isso resolve boa parte dos problemas.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        title: "Encerramento",
        content: "Ficou tudo certo com o que conversamos? Se não houver mais nada, vou encerrar o chamado por aqui.",
        created_at: now,
      },
    ],
  };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const data = seed();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return data;
  }

  const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

  // Migração: bancos criados antes das notas internas/respostas rápidas
  if (!data.macros) data.macros = seed().macros;
  for (const message of data.messages) {
    if (message.is_internal === undefined) message.is_internal = false;
  }

  return data;
}

let data = load();

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const db = {
  findTechnicianByUsername(username) {
    return data.technicians.find((t) => t.username === username);
  },
  findTechnicianById(id) {
    return data.technicians.find((t) => t.id === id);
  },

  listTickets(statuses) {
    let list = data.tickets;
    if (statuses && statuses.length) {
      list = list.filter((t) => statuses.includes(t.status));
    }
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  getTicket(id) {
    return data.tickets.find((t) => t.id === id);
  },
  createTicket(fields) {
    const now = new Date().toISOString();
    const ticket = {
      id: crypto.randomUUID(),
      client_name: fields.client_name,
      client_email: fields.client_email || null,
      problem_description: fields.problem_description || "Em andamento",
      status: fields.status || "open",
      priority: fields.priority || "medium",
      assigned_technician_id: null,
      lgpd_accepted: !!fields.lgpd_accepted,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    };
    data.tickets.push(ticket);
    save();
    return ticket;
  },
  updateTicket(id, fields) {
    const ticket = data.tickets.find((t) => t.id === id);
    if (!ticket) return null;
    Object.assign(ticket, fields, { updated_at: new Date().toISOString() });
    save();
    return ticket;
  },

  listMessages(ticketId) {
    return data.messages
      .filter((m) => m.ticket_id === ticketId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },
  createMessage(fields) {
    const message = {
      id: crypto.randomUUID(),
      ticket_id: fields.ticket_id,
      sender_type: fields.sender_type,
      sender_name: fields.sender_name,
      content: fields.content,
      is_internal: !!fields.is_internal,
      created_at: new Date().toISOString(),
    };
    data.messages.push(message);
    save();
    return message;
  },

  listMacros() {
    return [...data.macros].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },
  createMacro(fields) {
    const macro = {
      id: crypto.randomUUID(),
      title: fields.title,
      content: fields.content,
      created_at: new Date().toISOString(),
    };
    data.macros.push(macro);
    save();
    return macro;
  },
  deleteMacro(id) {
    const index = data.macros.findIndex((m) => m.id === id);
    if (index === -1) return false;
    data.macros.splice(index, 1);
    save();
    return true;
  },

  createFeedback(fields) {
    const feedback = {
      id: crypto.randomUUID(),
      ticket_id: fields.ticket_id,
      rating: fields.rating,
      comment: fields.comment || null,
      created_at: new Date().toISOString(),
    };
    data.feedbacks.push(feedback);
    save();
    return feedback;
  },
};
