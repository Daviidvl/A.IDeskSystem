import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  User, 
  Clock, 
  CheckCircle,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { Ticket } from "@/types/ticket";

interface ChatPanelProps {
  ticket: Ticket;
  onSendMessage: (ticketId: string, message: string) => void;
  onCloseTicket: (ticketId: string) => void;
}

const ChatPanel = ({ ticket, onSendMessage, onCloseTicket }: ChatPanelProps) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticket.messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    onSendMessage(ticket.id, newMessage);
    setNewMessage('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning text-warning-foreground">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-success text-success-foreground">Resolvido</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground">Média</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Informações do Ticket */}
      <div className="lg:col-span-1">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Informações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Cliente</p>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{ticket.clientName}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Assunto</p>
              <p className="text-sm">{ticket.subject}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
              {getStatusBadge(ticket.status)}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Prioridade</p>
              {getPriorityBadge(ticket.priority)}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Criado</p>
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>{getTimeAgo(ticket.createdAt)}</span>
              </div>
            </div>

            <div className="pt-4">
              {ticket.status !== 'resolved' ? (
                <Button 
                  onClick={() => onCloseTicket(ticket.id)}
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Fechar Ticket
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground bg-muted/50 py-2 rounded">
                  Ticket Resolvido
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat */}
      <div className="lg:col-span-3">
        <Card className="shadow-card h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Conversação</span>
              <Badge variant="outline" className="ml-2">
                {ticket.messages.length} mensagens
              </Badge>
            </CardTitle>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {ticket.messages.length > 0 ? (
              ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'tech' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.sender === 'tech'
                        ? 'bg-primary text-primary-foreground'
                        : message.sender === 'client'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-xs font-medium opacity-70">
                        {message.sender === 'tech' ? 'Você' : 
                         message.sender === 'client' ? ticket.clientName : 'Sistema'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-sm">Inicie a conversa com o cliente</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input Area */}
          {ticket.status !== 'resolved' && (
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatPanel;