import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, MessageCircle, Shield, Users } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system' | 'tech';
  timestamp: Date;
}

const Cliente = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Bem-vindo ao suporte técnico. Para melhor atendê-lo, preciso de algumas informações.',
      sender: 'system',
      timestamp: new Date()
    }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [step, setStep] = useState(0);
  const [ticketData, setTicketData] = useState({ nome: '', solicitacao: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'system' | 'tech') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSend = () => {
    if (!currentInput.trim()) return;

    addMessage(currentInput, 'user');

    setTimeout(() => {
      // 🔗 Aqui será integrada a API da OpenAI para análise das mensagens
      if (step === 0) {
        setTicketData(prev => ({ ...prev, nome: currentInput }));
        addMessage('Obrigado! Agora me conte, qual é a sua solicitação ou problema que está enfrentando?', 'system');
        setStep(1);
      } else if (step === 1) {
        setTicketData(prev => ({ ...prev, solicitacao: currentInput }));
        addMessage('Perfeito! Criei o seu chamado de suporte. Um técnico irá atendê-lo em breve. Você pode continuar conversando aqui.', 'system');
        setStep(2);
        
        // Simular mensagem do técnico após alguns segundos
        setTimeout(() => {
          addMessage('Olá! Sou o técnico responsável pelo seu atendimento. Vi que você precisa de ajuda. Vou analisar sua solicitação agora.', 'tech');
        }, 3000);
      } else {
        // Chat livre com técnico
        // 🔗 Aqui será integrada comunicação em tempo real via Socket.IO
        setTimeout(() => {
          addMessage('Recebi sua mensagem. Estou trabalhando na solução. Por favor, aguarde um momento.', 'tech');
        }, 1000);
      }
    }, 500);

    setCurrentInput('');
  };

  const getCurrentQuestion = () => {
    if (step === 0) return 'Qual o seu nome?';
    if (step === 1) return 'Qual a sua solicitação?';
    return 'Continue conversando com o técnico...';
  };

  if (showTerms) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 shadow-lg">
          <div className="text-center mb-6">
            <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
            <p className="text-muted-foreground">Proteção de Dados Pessoais - LGPD</p>
          </div>
          
          <div className="space-y-4 mb-6 text-sm text-muted-foreground">
            <p>
              <strong>Coleta de Dados:</strong> Coletamos apenas as informações necessárias para prestar suporte técnico, 
              incluindo seu nome e descrição do problema.
            </p>
            <p>
              <strong>Uso dos Dados:</strong> Suas informações serão utilizadas exclusivamente para:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Prestação de suporte técnico</li>
              <li>Comunicação sobre o andamento do seu chamado</li>
              <li>Melhoria dos nossos serviços</li>
            </ul>
            <p>
              <strong>Seus Direitos:</strong> Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento.
            </p>
            <p>
              <strong>Segurança:</strong> Implementamos medidas técnicas e organizacionais adequadas para proteger suas informações.
            </p>
          </div>

          <div className="flex items-center space-x-2 mb-6">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label htmlFor="terms" className="text-sm text-foreground">
              Li e aceito a política de privacidade e o tratamento dos meus dados pessoais
            </label>
          </div>

          <Button
            className="w-full"
            onClick={() => setShowTerms(false)}
            disabled={!acceptedTerms}
          >
            Prosseguir para o Suporte
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Suporte Técnico</h1>
              <p className="text-sm text-muted-foreground">Chat de atendimento ao cliente</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="chat-container flex flex-col shadow-lg">
          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'message-user'
                      : message.sender === 'tech'
                      ? 'message-tech'
                      : 'message-system'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            
            {step < 2 && (
              <div className="flex justify-start">
                <div className="message-system max-w-xs lg:max-w-md px-4 py-2 rounded-2xl">
                  <p className="text-sm animate-pulse">{getCurrentQuestion()}</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4 bg-muted/30">
            <div className="flex space-x-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={getCurrentQuestion()}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Status Info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {step === 0 ? 'Iniciando atendimento...' :
               step === 1 ? 'Coletando informações...' :
               'Conectado com técnico'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cliente;