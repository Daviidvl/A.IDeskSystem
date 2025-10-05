export interface AIResponse {
  text: string;
  requiresHuman: boolean;
}

const knowledgeBase: Record<string, AIResponse> = {
  'internet': {
    text: 'Entendo que você está com problemas de internet. Vamos tentar alguns passos:\n\n1. Desligue o modem/roteador da tomada\n2. Aguarde 10 segundos\n3. Ligue novamente\n4. Aguarde 2 minutos para estabilizar\n\nIsso resolveu o problema?',
    requiresHuman: false
  },
  'lento': {
    text: 'Para problemas de lentidão:\n\n1. Verifique quantos dispositivos estão conectados\n2. Tente aproximar-se do roteador\n3. Reinicie o dispositivo que está lento\n4. Teste a velocidade em: speedtest.net\n\nMelhorou?',
    requiresHuman: false
  },
  'wifi': {
    text: 'Problemas com WiFi:\n\n1. Verifique se o WiFi está ativado no dispositivo\n2. Esqueça a rede e conecte novamente\n3. Verifique se a senha está correta\n4. Reinicie o roteador\n\nConseguiu conectar?',
    requiresHuman: false
  },
  'cabo': {
    text: 'Vamos verificar os cabos:\n\n1. Certifique-se que o cabo de rede está bem conectado\n2. Verifique se não há dobras ou danos no cabo\n3. Teste outro cabo se possível\n4. Confira se está na porta correta do modem\n\nFuncionou?',
    requiresHuman: false
  },
  'tv': {
    text: 'Para problemas na TV:\n\n1. Verifique se o cabo coaxial está bem conectado\n2. Reinicie o decodificador\n3. Teste em outro canal\n4. Verifique se há mensagens de erro na tela\n\nO problema persiste?',
    requiresHuman: false
  }
};

export const getAIResponse = (message: string): AIResponse => {
  const lowerMessage = message.toLowerCase();

  for (const [keyword, response] of Object.entries(knowledgeBase)) {
    if (lowerMessage.includes(keyword)) {
      return response;
    }
  }

  return {
    text: 'Entendo sua situação. Para melhor atendê-lo, vou transferir você para um técnico especializado que poderá resolver seu problema. Por favor, aguarde alguns instantes.',
    requiresHuman: true
  };
};

export const analyzeClientResponse = (message: string): boolean => {
  const positiveResponses = ['sim', 'resolveu', 'funcionou','deu certo', 'obrigado'];
  const negativeResponses = ['não', 'nao', 'ainda', 'continua', 'persiste', 'não funcionou'];

  const lowerMessage = message.toLowerCase();

  for (const positive of positiveResponses) {
    if (lowerMessage.includes(positive)) {
      return true;
    }
  }

  for (const negative of negativeResponses) {
    if (lowerMessage.includes(negative)) {
      return false;
    }
  }

  return false;
};