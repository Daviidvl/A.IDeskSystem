<div align="center">

# A.I Desk System

**Suporte inteligente que resolve antes de escalar**

Um sistema de help desk moderno que coloca inteligência artificial na linha de frente do atendimento — resolvendo problemas automaticamente e escalando para humanos apenas quando necessário.

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=flat&logo=openai)](https://openai.com)

</div>

---

## O que é o A.IDeskSystem?

O **A.IDeskSystem** é uma plataforma de help desk que une inteligência artificial e atendimento humano em um único sistema coeso. O cliente inicia uma conversa, a IA tenta resolver o problema — e só encaminha para um técnico quando realmente necessário. Isso reduz o volume de chamados manuais e garante respostas mais rápidas.

---

## Funcionalidades

### Para o cliente
- **Chat com IA** — atendimento imediato, sem fila, sem espera
- **Escalação automática** — quando a IA não consegue resolver, um técnico assume a conversa em tempo real
- **Consentimento LGPD** — termo de uso integrado ao fluxo de abertura de chamado
- **Avaliação do atendimento** — feedback ao final de cada chamado resolvido

### Para o técnico
- **Painel de chamados** — visão consolidada de todos os tickets abertos e em andamento
- **Chat em tempo real** — comunicação direta com o cliente via WebSocket
- **Gestão de status** — controle completo do ciclo de vida de cada ticket
- **Autenticação segura** — acesso restrito por login e sessão protegida

### Para a gestão
- **Dashboard analítico** — métricas de volume, tempo de resolução e desempenho de técnicos
- **Gráficos interativos** — visualização em tempo real do fluxo de atendimento
- **Histórico completo** — registro de todas as mensagens, desde o primeiro contato até o fechamento

---

## Fluxo de atendimento

```
Cliente abre chamado
       │
       ▼
  IA tenta resolver ──── Resolvido? ──── Sim ──► Feedback + Fechamento
       │
      Não (ou pedido de humano)
       │
       ▼
  Técnico assume o ticket
       │
       ▼
  Chat em tempo real ──► Problema resolvido ──► Ticket fechado
```

---

## Arquitetura

```
┌──────────────────────────────────────────────────┐
│          Frontend · React + TypeScript            │
│   /cliente   /tecnico   /dashboard   /login       │
└──────────┬──────────────────────────┬────────────┘
           │ HTTP REST                │ WebSocket
┌──────────▼──────────────────────────▼────────────┐
│         Backend · Node.js + Socket.IO             │
│   Roteamento · Sessões · OpenAI · Mensagens       │
└──────────┬──────────────────────────┬────────────┘
           │                          │
┌──────────▼──────────────────────────▼────────────┐
│         Supabase · PostgreSQL + RLS               │
│    tickets · messages · technicians · feedback    │
└──────────────────────────────────────────────────┘
```

---

## Stack tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express, Socket.IO |
| **Banco de dados** | Supabase (PostgreSQL) com Row Level Security |
| **IA** | OpenAI API — detecção de intenção e respostas contextualizadas |
| **Tempo real** | Socket.IO — chat bidirecional entre cliente e técnico |

---

## Inteligência artificial

A IA do sistema vai além de um simples chatbot. Ela:

- **Detecta intenção** — identifica quando o cliente quer falar com um humano, mesmo sem perguntar diretamente
- **Lê o contexto** — considera o histórico completo da conversa antes de responder
- **Sabe quando parar** — após tentativas sem resolução, escala automaticamente para um técnico
- **Mantém continuidade** — o técnico que assume a conversa vê todo o histórico da IA

---

<div align="center">

**Desenvolvido por Davi Pereira · A.I Desk System © 2025**

</div>
