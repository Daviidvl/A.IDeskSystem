/*
  # A.I Desk - Sistema de Gerenciamento de Chamados
  
  1. Nova Tabela: technicians
    - id (uuid, chave primária)
    - username (text, único)
    - password (text, hash da senha)
    - name (text, nome completo)
    - email (text)
    - created_at (timestamp)
    
  2. Nova Tabela: tickets
    - id (uuid, chave primária)
    - client_name (text, nome do cliente)
    - client_email (text, email do cliente)
    - problem_description (text, descrição do problema)
    - status (text, valores: 'open', 'in_progress', 'resolved', 'closed')
    - priority (text, valores: 'low', 'medium', 'high')
    - assigned_technician_id (uuid, FK para technicians)
    - lgpd_accepted (boolean, aceite da LGPD)
    - created_at (timestamp)
    - updated_at (timestamp)
    - resolved_at (timestamp, nullable)
    
  3. Nova Tabela: messages
    - id (uuid, chave primária)
    - ticket_id (uuid, FK para tickets)
    - sender_type (text, valores: 'client', 'technician', 'ai')
    - sender_name (text)
    - content (text, conteúdo da mensagem)
    - created_at (timestamp)
    
  4. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para acesso público controlado (sistema interno)
*/

-- Tabela de Técnicos
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text,
  problem_description text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_technician_id uuid REFERENCES technicians(id),
  lgpd_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'technician', 'ai')),
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON messages(ticket_id);

-- Habilitar RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (sistema interno, então permitimos acesso público controlado)
CREATE POLICY "Permitir leitura de técnicos"
  ON technicians FOR SELECT
  USING (true);

CREATE POLICY "Permitir todas operações em tickets"
  ON tickets FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas operações em mensagens"
  ON messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir técnico padrão (senha: admin123 - deve ser hasheada no backend)
INSERT INTO technicians (username, password, name, email)
VALUES ('admin', 'admin123', 'Administrador', 'admin@aidesk.com')
ON CONFLICT (username) DO NOTHING;