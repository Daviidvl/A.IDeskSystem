const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "aidesk_token";

export interface Technician {
  id: string;
  username: string;
  name: string;
  email: string;
}

export interface Ticket {
  id: string;
  client_name: string;
  client_email?: string;
  problem_description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  assigned_technician_id?: string;
  lgpd_accepted: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_type: "client" | "technician" | "ai";
  sender_name: string;
  content: string;
  is_internal?: boolean;
  created_at: string;
}

export interface Macro {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: Technician }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ user: Technician }>("/api/auth/me"),
  saveToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  logout: () => localStorage.removeItem(TOKEN_KEY),
  getToken,

  createTicket: (fields: Partial<Ticket>) =>
    request<Ticket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(fields),
    }),
  listTickets: (statuses?: string[]) =>
    request<Ticket[]>(`/api/tickets${statuses ? `?status=${statuses.join(",")}` : ""}`),
  getTicket: (id: string) => request<Ticket>(`/api/tickets/${id}`),
  updateTicket: (id: string, fields: Partial<Ticket>) =>
    request<Ticket>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    }),

  listMessages: (ticketId: string) => request<Message[]>(`/api/tickets/${ticketId}/messages`),
  sendMessage: (
    ticketId: string,
    fields: {
      sender_type: Message["sender_type"];
      sender_name: string;
      content: string;
      is_internal?: boolean;
    }
  ) =>
    request<Message>(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify(fields),
    }),

  listMacros: () => request<Macro[]>("/api/macros"),
  createMacro: (title: string, content: string) =>
    request<Macro>("/api/macros", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    }),
  deleteMacro: (id: string) =>
    request<void>(`/api/macros/${id}`, { method: "DELETE" }),

  sendFeedback: (ticketId: string, rating: number, comment: string) =>
    request(`/api/tickets/${ticketId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),

  getAIResponse: (message: string) =>
    request<{ text: string }>("/api/ai/respond", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
