import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é o assistente técnico virtual da plataforma A.I Desk. Siga estas regras:

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

export async function getAssistantReply(userMessage) {
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text?.trim() || "Desculpe, não consegui gerar uma resposta agora.";
}
