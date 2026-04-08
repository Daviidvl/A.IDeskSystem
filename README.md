# 🤖 A.I Desk System

Um sistema moderno de gerenciamento de chamados (tickets) com inteligência artificial integrada, permitindo que clientes recebam suporte automático antes de escalar para técnicos humanos.

## 📋 Visão Geral

O **A.I Desk System** é uma plataforma de help desk que combina:
- **Chat com IA** (OpenAI) para tentativa de resolução automática
- **Escalação humana** quando necessário
- **Sistema de tickets** para gerenciamento de chamados
- **Painel técnico** para atendimento e monitoramento
- **Comunicação em tempo real** via WebSockets

---

## 🏗️ Arquitetura do Sistema

### Camadas Principais

```
┌─────────────────────────────────────────────────┐
│          Frontend (React + TypeScript)           │
│  - Cliente (Chat com IA)                        │
│  - Técnico (Painel de gerenciamento)            │
│  - Dashboard (Análise de tickets)               │
└────────┬────────────────────────────┬───────────┘
         │                            │
    HTTP │                            │ WebSocket
         │                            │
┌────────▼────────────────────────────▼───────────┐
│      Backend (Node.js + Socket.IO)               │
│  - Gerenciamento de conexões em tempo real      │
│  - Roteamento de mensagens                      │
│  - APIs de tickets                              │
└────────┬────────────────────────────┬───────────┘
         │                            │
    REST │                            │ Database
         │                            │
┌────────▼────────────────────────────▼───────────┐
│       Banco de Dados (Supabase/PostgreSQL)      │
│  - Tickets                                      │
│  - Mensagens                                    │
│  - Técnicos                                     │
│  - Feedback                                     │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navegação
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **Recharts** - Gráficos
- **Socket.IO Client** - Comunicação real-time

### Backend
- **Node.js + Express** - Servidor
- **Socket.IO** - WebSockets para tempo real
- **CORS** - Cross-origin requests
- **OpenAI API** - Inteligência artificial

### Banco de Dados
- **Supabase** - Backend as a Service (PostgreSQL)
- **RLS (Row Level Security)** - Segurança

---

## 📁 Estrutura do Projeto

```
A.IDeskSystem/
├── src/
│   ├── components/           # Componentes React reutilizáveis
│   │   ├── ChatMessage.tsx   # Renderizador de mensagens
│   │   ├── LGPDModal.tsx     # Modal de consentimento LGPD
│   │   └── ProtectedRoute.tsx # Rota protegida por autenticação
│   │
│   ├── lib/                  # Funções utilitárias
│   │   ├── aiResponses.ts    # Integração com OpenAI
│   │   ├── auth.ts           # Autenticação de técnicos
│   │   ├── socket.ts         # Cliente Socket.IO
│   │   └── supabase.ts       # Cliente Supabase
│   │
│   ├── pages/                # Páginas principais
│   │   ├── ClientPage.tsx    # Interface do cliente
│   │   ├── TechnicianPage.tsx # Painel do técnico
│   │   ├── DashboardPage.tsx # Dashboard analítico
│   │   └── LoginPage.tsx     # Login de técnicos
│   │
│   ├── App.tsx               # Componente raiz
│   ├── main.tsx              # Ponto de entrada
│   └── index.css             # Estilos globais
│
├── supabase/
│   └── migrations/           # Scripts SQL do banco de dados
│
├── server.js                 # Servidor Socket.IO
├── package.json              # Dependências
├── vite.config.ts            # Configuração Vite
├── tsconfig.json             # Configuração TypeScript
└── tailwind.config.js        # Configuração Tailwind
```

---

## 🗄️ Modelo de Dados

### Tabela: `technicians`
Armazena dados dos técnicos do sistema.

```sql
CREATE TABLE technicians (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);
```

**Campos:**
- `id` - Identificador único
- `username` - Nome de usuário (único)
- `password` - Senha hasheada
- `name` - Nome completo
- `email` - Email do técnico

---

### Tabela: `tickets`
Registro de todos os chamados abertos pelos clientes.

```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY,
  client_name text NOT NULL,
  client_email text,
  problem_description text NOT NULL,
  status text DEFAULT 'open',  -- open, in_progress, resolved, closed
  priority text DEFAULT 'medium',  -- low, medium, high
  assigned_technician_id uuid REFERENCES technicians(id),
  lgpd_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
```

**Status do Ticket:**
- `open` - Chamado aberto, aguardando resposta
- `in_progress` - Técnico assumiu o chamado
- `resolved` - Problema resolvido
- `closed` - Ticket finalizado

---

### Tabela: `messages`
Histórico de mensagens da conversa entre cliente e IA/técnico.

```sql
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL,  -- client, technician, ai
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Tipos de Remetente:**
- `client` - Mensagem do cliente
- `ai` - Resposta da Inteligência Artificial
- `technician` - Resposta do técnico humano

---

## 🚀 Instalação e Setup

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase
- Chave de API OpenAI

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/A.IDeskSystem.git
cd A.IDeskSystem
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase

# OpenAI
VITE_OPENAI_API_KEY=sua_chave_openai

# Socket.IO
VITE_SOCKET_URL=http://localhost:3001
```

### 4. Configurar banco de dados
Execute a migração SQL no Supabase:

```bash
# Copie o conteúdo de supabase/migrations/20251005014222_create_aiDesk_tables.sql
# e execute no editor SQL do Supabase
```

### 5. Iniciar o servidor
Em um terminal:
```bash
npm run socket
```

Em outro terminal:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

---

## 📱 Como Usar

### 🎯 Fluxo do Cliente

1. **Acesso**: Cliente acessa a página principal (`/cliente`)
2. **Informações**: Preenche nome e email
3. **LGPD**: Aceita termo de consentimento
4. **Chat com IA**: Descreve seu problema
   - IA tenta resolver automaticamente (até 3 tentativas)
   - Detecta se o cliente quer falar com humano
   - Detecta se o problema foi resolvido
5. **Escalação**: Se necessário, escala para técnico humano
6. **Feedback**: Após resolução, avalia o atendimento

### 👨‍💼 Fluxo do Técnico

1. **Login**: Acessa `/login` com credenciais
2. **Painel**: Visualiza lista de tickets em `/tecnico`
3. **Assunção**: Assume um ticket (muda status para `in_progress`)
4. **Chat**: Comunica com cliente em tempo real
5. **Resolução**: Marca como resolvido
6. **Fechamento**: Fecha o ticket

### 📊 Dashboard

- **Acesso**: `/dashboard` (sem autenticação)
- **Visualização**: Métricas e gráficos de tickets
- **Análise**: Desempenho de técnicos e tempo de resolução

---

## 🔄 Comunicação em Tempo Real

### WebSocket Events (Socket.IO)

**Evento: `join_ticket`**
```javascript
socket.emit('join_ticket', ticketId);
// Cliente entra na sala do ticket para receber mensagens
```

**Evento: `send_message`**
```javascript
socket.emit('send_message', {
  ticket_id: 'uuid',
  sender_type: 'client|technician|ai',
  sender_name: 'Nome',
  content: 'Mensagem'
});
```

**Evento: `new_message`** (recebido)
```javascript
socket.on('new_message', (msg) => {
  // Nova mensagem recebida no ticket
});
```

---

## 🤖 Integração com IA (OpenAI)

### Funcionalidades da IA

1. **Detecção de Intenção**
   - Identifica se cliente quer falar com humano
   - Detecta se problema foi resolvido
   - Reconhece saudações

2. **Limite de Tentativas**
   - IA tenta resolver até 3 vezes
   - Após isso, escala para técnico
   - Dados persistem em `localStorage`

3. **Respostas Contextualizadas**
   - Lê o histórico do ticket
   - Fornece respostas relevantes
   - Mantém continuidade da conversa

---

## 🔐 Autenticação e Segurança

### Técnicos
- Login com `username` e `password`
- Token armazenado em `localStorage`
- Sessão mantida via `ProtectedRoute`

### Clientes
- Sem autenticação necessária
- Identificação por email/ticket_id
- Consentimento LGPD obrigatório

### Banco de Dados
- RLS (Row Level Security) habilitado
- Políticas de acesso configuradas
- Dados sensíveis protegidos

---

## 📊 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor Vite

# Build
npm run build        # Gera versão de produção

# Qualidade
npm run lint         # Verifica código com ESLint
npm run typecheck    # Verifica tipos TypeScript

# Servidor
npm run socket       # Inicia servidor Socket.IO na porta 3001

# Preview
npm run preview      # Visualiza build localmente
```

---

## 🐛 Troubleshooting

### Problema: Socket.IO desconecta frequentemente
**Solução**: Verifique se o servidor está rodando (`npm run socket`) e se a URL está correta em `.env.local`

### Problema: IA não responde
**Solução**: Valide a chave OpenAI e permissões da API

### Problema: Banco de dados não conecta
**Solução**: Verifique URL e chave do Supabase em `.env.local`

---

## 📈 Roadmap Futuro

- [ ] Multi-idiomas
- [ ] Escalabilidade de tickets
- [ ] Integração com sistemas de CRM
- [ ] Relatórios avançados
- [ ] Notificações por email
- [ ] Sistema de avaliação de técnicos

---

## 👥 Contribuindo

Contribuições são bem-vindas! Siga estes passos:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo LICENSE para detalhes.

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub ou entre em contato através do email de suporte.

---

**Desenvolvido com ❤️ - A.I Desk System © 2025**
