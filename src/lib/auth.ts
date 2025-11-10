import { supabase } from './supabase';

export const auth = {
  // Verificar se usuário está autenticado
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Fazer logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Verificar sessão ativa
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};