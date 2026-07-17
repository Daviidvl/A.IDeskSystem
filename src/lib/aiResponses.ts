import { api } from "./api";

// Mantém contador por ticket (persistente)
const attemptCount: Record<string, number> = JSON.parse(
  localStorage.getItem("aiAttempts") || "{}"
);

// Adiciona controle de resolução automática
const resolvedTickets: Record<string, boolean> = JSON.parse(
  localStorage.getItem("resolvedTickets") || "{}"
);

const saveData = () => {
  localStorage.setItem("aiAttempts", JSON.stringify(attemptCount));
  localStorage.setItem("resolvedTickets", JSON.stringify(resolvedTickets));
};

// Função para detectar intenções do usuário
function detectUserIntent(userMessage: string): {
  wantsHuman: boolean;
  problemSolved: boolean;
  isGreeting: boolean;
} {
  const message = userMessage.toLowerCase().trim();
  
  // Palavras-chave para querer falar com humano
  const humanKeywords = [
    'quero falar com humano', 'atendente humano', 'técnico humano', 'pessoa real',
    'falar com pessoa', 'atendimento humano', 'operador humano', 'assistente humano',
    'não resolveu', 'não funcionou', 'não conseguiu', 'prefiro humano',
    'chamar técnico', 'encaminhar técnico', 'falhar com supervisor', 'humano',
    'atendente', 'operador', 'pessoa', 'técnico', 'especialista'
  ];

  // Palavras-chave para problema resolvido
  const solvedKeywords = [
    'resolvido', 'funcionou', 'deu certo', 'consegui', 'obrigado', 'ajudou',
    'problema solucionado', 'tudo certo', 'ok obrigado', 'valeu', 'obrigado ajuda',
    'resolveu obrigado', 'perfeito', 'excelente', 'obrigado pela ajuda', 'deu certo',
    'funcionou aqui', 'consegui resolver', 'pronto', 'solucionado'
  ];

  // Saudações
  const greetingKeywords = [
    'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hey'
  ];

  const wantsHuman = humanKeywords.some(keyword => message.includes(keyword));
  const problemSolved = solvedKeywords.some(keyword => message.includes(keyword));
  const isGreeting = greetingKeywords.some(keyword => 
    message === keyword || message.startsWith(keyword + ' ') || message.endsWith(' ' + keyword)
  );

  return { wantsHuman, problemSolved, isGreeting };
}

export async function getAIResponse(ticketId: string, userMessage: string): Promise<{
  text: string;
  requiresHuman: boolean;
  autoResolved: boolean;
}> {
  // Verifica se ticket já foi resolvido automaticamente
  if (resolvedTickets[ticketId]) {
    return {
      text: "Este caso já foi resolvido anteriormente. Se precisar de mais ajuda, abra um novo ticket! 😊",
      requiresHuman: false,
      autoResolved: true
    };
  }

  // Detecta intenções do usuário
  const intent = detectUserIntent(userMessage);

  // 🔹 SE USUÁRIO PEDIR POR HUMANO → ENCAMINHA IMEDIATAMENTE
  if (intent.wantsHuman) {
    attemptCount[ticketId] = 3; // Força encaminhamento
    saveData();
    
    return {
      text: `Entendi que prefere falar com nosso técnico humano. Estou encaminhando seu caso imediatamente! 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(0, 8)}`,
      requiresHuman: true,
      autoResolved: false
    };
  }

  // 🔹 SE USUÁRIO CONFIRMAR QUE PROBLEMA FOI RESOLVIDO → ENCERRA AUTOMATICAMENTE
  if (intent.problemSolved) {
    resolvedTickets[ticketId] = true;
    saveData();
    
    return {
      text: `Que ótimo! Fico feliz em saber que consegui ajudar! 😊\n\nSe tiver mais alguma dúvida, estarei aqui para ajudar.\n\n**Por favor, avalie nosso atendimento abaixo:** ⭐`,
      requiresHuman: false,
      autoResolved: true
    };
  }

  // Se não existir contador, cria
  if (!attemptCount[ticketId]) attemptCount[ticketId] = 0;

  // Se já atingiu o limite → IA não responde mais
  if (attemptCount[ticketId] >= 3) {
    return {
      text: `Não consegui resolver por aqui. Estou encaminhando o caso para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(0, 8)}`,
      requiresHuman: true,
      autoResolved: false
    };
  }

  try {
    // Incrementa e salva tentativa
    attemptCount[ticketId]++;
    saveData();

    console.log(`🤖 Tentativa da IA (${ticketId}): ${attemptCount[ticketId]}`);

    // Gera resposta da IA (backend chama a API da Anthropic)
    const { text: aiText } = await api.getAIResponse(userMessage);

    // Verifica se atingiu o limite após a resposta
    const requiresHuman = attemptCount[ticketId] >= 3;

    if (requiresHuman) {
      return {
        text: `Não consegui resolver por aqui. Estou encaminhando o caso para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(0, 8)}`,
        requiresHuman: true,
        autoResolved: false
      };
    }

    return { 
      text: aiText, 
      requiresHuman: false,
      autoResolved: false 
    };
  } catch (error) {
    console.error("Erro na IA:", error);
    return {
      text: `Ocorreu um erro ao tentar processar sua solicitação. Encaminhando para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(0, 8)}`,
      requiresHuman: true,
      autoResolved: false
    };
  }
}

// Função para verificar se ticket foi resolvido automaticamente
export function isTicketAutoResolved(ticketId: string): boolean {
  return resolvedTickets[ticketId] || false;
}

// Função para resetar um ticket (para testes)
export function resetTicket(ticketId: string) {
  delete attemptCount[ticketId];
  delete resolvedTickets[ticketId];
  saveData();
}