import { api, Technician } from "./api";

export const auth = {
  // Verificar se usuário está autenticado
  async getCurrentUser(): Promise<Technician | null> {
    if (!api.getToken()) return null;
    try {
      const { user } = await api.me();
      return user;
    } catch {
      api.logout();
      return null;
    }
  },

  // Fazer logout
  async signOut() {
    api.logout();
  },

  // Verificar sessão ativa
  async getSession() {
    const token = api.getToken();
    return token ? { token } : null;
  },
};
