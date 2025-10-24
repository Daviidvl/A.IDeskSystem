import OpenAI from "openai";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Mantém contador por ticket (persistente)
const attemptCount: Record<string, number> = JSON.parse(
  localStorage.getItem("aiAttempts") || "{}"
);

const saveAttempts = () => {
  localStorage.setItem("aiAttempts", JSON.stringify(attemptCount));
};

export async function getAIResponse(ticketId: string, userMessage: string) {
  // Se não existir contador, cria
  if (!attemptCount[ticketId]) attemptCount[ticketId] = 0;

  // Se já atingiu o limite → IA não responde mais
  if (attemptCount[ticketId] >= 3) {
    return {
      text: `Não consegui resolver por aqui. Estou encaminhando o caso para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(
        0,
        8
      )}`,
      requiresHuman: true,
    };
  }

  try {
    // Incrementa e salva tentativa
    attemptCount[ticketId]++;
    saveAttempts();

    console.log(`🤖 Tentativa da IA (${ticketId}): ${attemptCount[ticketId]}`);

    // Gera resposta da IA
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é o assistente técnico virtual da plataforma A.I Desk. Responda de forma clara e breve, com o objetivo de resolver o problema do cliente em até 3 mensagens. Se o cliente disser que as sugestões não resolveram após 3 tentativas, então informe que encaminhará o caso para um técnico humano. Antes disso, nunca mencione técnicos humanos.",
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

    // Só depois da 3ª tentativa a IA encaminha
    const requiresHuman = attemptCount[ticketId] >= 3;

    // Mensagem final com protocolo
    if (requiresHuman) {
      attemptCount[ticketId] = 3;
      saveAttempts();
      return {
        text: `Não consegui resolver por aqui. Estou encaminhando o caso para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(
          0,
          8
        )}`,
        requiresHuman: true,
      };
    }

    return { text: aiText, requiresHuman: false };
  } catch (error) {
    console.error("Erro na IA:", error);
    return {
      text: `Ocorreu um erro ao tentar processar sua solicitação. Encaminhando para um técnico humano. 🧑‍🔧\n\n🔹 Número do protocolo: #${ticketId.slice(
        0,
        8
      )}`,
      requiresHuman: true,
    };
  }
}