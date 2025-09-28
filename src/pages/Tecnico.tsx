import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";
import LoginForm from "@/components/LoginForm";
import Dashboard from "@/components/Dashboard";
import TicketList from "@/components/TicketList";
import ChatPanel from "@/components/ChatPanel";
import { Ticket, Message, Metrics } from "@/types/ticket";

// Simulação de dados de tickets
const mockTickets: Ticket[] = [
  {
    id: '1',
    clientName: 'João Silva',
    subject: 'Problema com conexão de rede',
    status: 'open',
    priority: 'medium',
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    messages: [
      {
        id: '1',
        text: 'Estou com problemas para conectar na rede da empresa',
        sender: 'client',
        timestamp: new Date(Date.now() - 30 * 60 * 1000)
      }
    ]
  },
  {
    id: '2',
    clientName: 'Maria Santos',
    subject: 'Erro no sistema de vendas',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    messages: [
      {
        id: '2',
        text: 'O sistema está apresentando erro ao finalizar vendas',
        sender: 'client',
        timestamp: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        id: '3',
        text: 'Vou verificar o problema. Pode me enviar uma captura de tela do erro?',
        sender: 'tech',
        timestamp: new Date(Date.now() - 50 * 60 * 1000)
      }
    ]
  },
  {
    id: '3',
    clientName: 'Pedro Costa',
    subject: 'Instalação de software',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    messages: []
  }
];

const Tecnico = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Simular dados de métricas
  const metrics: Metrics = {
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status === 'open').length,
    closedTickets: tickets.filter(t => t.status === 'resolved').length,
    averageResponseTime: '15 min'
  };

  const handleLogin = (email: string, password: string) => {
    // Simulação de autenticação simples
    if (email === 'admin@suporte.com' && password === 'admin123') {
      setIsLoggedIn(true);
      setCurrentUser(email);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    setSelectedTicket(null);
    setActiveTab('dashboard');
  };

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicket(ticketId);
    setActiveTab('chat');
  };

  const handleTicketClose = (ticketId: string) => {
    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { ...ticket, status: 'resolved' as const }
        : ticket
    ));
    if (selectedTicket === ticketId) {
      setSelectedTicket(null);
      setActiveTab('tickets');
    }
  };

  const handleSendMessage = (ticketId: string, message: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'tech',
      timestamp: new Date()
    };

    setTickets(prev => prev.map(ticket => 
      ticket.id === ticketId 
        ? { 
            ...ticket, 
            messages: [...ticket.messages, newMessage],
            status: 'in_progress' as const
          }
        : ticket
    ));

    // 🔗 Aqui será integrada comunicação em tempo real via Socket.IO
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const selectedTicketData = selectedTicket 
    ? tickets.find(t => t.id === selectedTicket)
    : null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b shadow-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Painel Técnico</h1>
                <p className="text-sm text-muted-foreground">Sistema de Suporte</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Bem-vindo, <strong>{currentUser}</strong>
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard metrics={metrics} tickets={tickets} />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketList 
              tickets={tickets} 
              onTicketSelect={handleTicketSelect}
              onTicketClose={handleTicketClose}
            />
          </TabsContent>

          <TabsContent value="chat">
            {selectedTicketData ? (
              <ChatPanel 
                ticket={selectedTicketData}
                onSendMessage={handleSendMessage}
                onCloseTicket={handleTicketClose}
              />
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum ticket selecionado</h3>
                <p className="text-muted-foreground mb-4">
                  Selecione um ticket da lista para iniciar o atendimento
                </p>
                <Button onClick={() => setActiveTab('tickets')}>
                  Ver Tickets
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Configurações</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tempo limite de resposta</label>
                    <Input defaultValue="30 minutos" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status automático</label>
                    <Input defaultValue="Ativo" />
                  </div>
                </div>
                <Button>Salvar Configurações</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Tecnico;