import OpenAI from "openai";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

    // Prompt mais inteligente para a IA
    const systemPrompt = `Você é o assistente técnico virtual da plataforma A.I Desk. Siga estas regras:

1. Tente resolver o problema do usuário de forma CLARA e OBJETIVA
2. Se o usuário pedir explicitamente por humano/técnico, informe que irá encaminhar
3. Se o usuário confirmar que problema foi resolvido, agradeça e encerre
4. Você tem até 3 tentativas para resolver
5. Após 3 tentativas sem sucesso, encaminhe para técnico humano
6. Mantenha respostas curtas e diretas ao ponto
7. Foque em soluções práticas e passo a passo

Formato de resposta:
- Problema técnico: Ofereça solução passo a passo
- Pedido por humano: Encaminhe imediatamente  
- Problema resolvido: Agradeça e encerre
- Limite atingido: Encaminhe para técnico`;

    // Gera resposta da IA
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiText =
      completion.choices[0]?.message?.content?.trim() ||
      "Desculpe, não consegui gerar uma resposta agora.";

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