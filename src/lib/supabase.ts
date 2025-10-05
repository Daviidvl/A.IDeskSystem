import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Technician {
  id: string;
  username: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  client_name: string;
  client_email?: string;
  problem_description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assigned_technician_id?: string;
  lgpd_accepted: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'client' | 'technician' | 'ai';
  sender_name: string;
  content: string;
  created_at: string;
}