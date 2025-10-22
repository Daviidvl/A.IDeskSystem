// src/lib/aiResponses.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // necessário no Vite
});

// 🔹 contador de tentativas por ticket (persistente no navegador)
const attemptCount: Record<string, number> = JSON.parse(
  localStorage.getItem("aiAttempts") || "{}"
);

const saveAttempts = () => {
  localStorage.setItem("aiAttempts", JSON.stringify(attemptCount));
};

export async function getAIResponse(ticketId: string, userMessage: string) {
  // Inicializa o contador caso ainda não exista
  if (!attemptCount[ticketId]) attemptCount[ticketId] = 0;

  // Se já tentou 3 vezes, envia pro técnico
  if (attemptCount[ticketId] >= 3) {
    return {
      text: "Não consegui resolver por aqui. Estou encaminhando o caso para um técnico humano. 🧑‍🔧",
      requiresHuman: true,
    };
  }

  try {
    // 🔁 Incrementa tentativa e salva
    attemptCount[ticketId]++;
    saveAttempts();
    console.log(`🔁 Tentativa da IA (${ticketId}):`, attemptCount[ticketId]);

    // 💬 Chamada à OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente técnico virtual do sistema A.I Desk. Sua função é tentar resolver o problema do cliente em até 3 mensagens. Se o problema não for resolvido, avise que o chamado será encaminhado para um técnico humano.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const aiText = completion.choices[0]?.message?.content?.trim() || "Desculpe, não consegui gerar uma resposta.";

    // 🔚 Verifica se precisa encaminhar para o técnico
    const requiresHuman =
      attemptCount[ticketId] >= 3 ||
      /encaminhar|técnico|humano|não consigo/i.test(aiText);

    return { text: aiText, requiresHuman };
  } catch (error) {
    console.error("Erro na IA:", error);
    return {
      text: "Ocorreu um erro ao tentar processar sua solicitação. Encaminhando para um técnico humano.",
      requiresHuman: true,
    };
  }
}

