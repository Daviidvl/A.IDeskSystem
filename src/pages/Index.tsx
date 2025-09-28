import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Headphones, Shield, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Headphones className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Sistema de
              <span className="text-primary"> Suporte Técnico</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Plataforma completa para atendimento ao cliente com chat em tempo real, 
              triagem automatizada e dashboard para técnicos.
            </p>
          </div>

          {/* Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/cliente')}>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Área do Cliente</h3>
                  <p className="text-muted-foreground mb-6">
                    Acesse o chat de suporte para abrir chamados e conversar com nossos técnicos
                  </p>
                  <Button className="w-full group-hover:bg-primary/90">
                    Acessar Suporte
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/tecnico')}>
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Painel Técnico</h3>
                  <p className="text-muted-foreground mb-6">
                    Dashboard completo para gerenciar tickets, métricas e atendimentos
                  </p>
                  <Button variant="outline" className="w-full group-hover:bg-accent/10">
                    Fazer Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-card/30 rounded-3xl mx-4 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Funcionalidades</h2>
          <p className="text-muted-foreground">Tudo que você precisa para um suporte técnico eficiente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Chat em Tempo Real</h3>
            <p className="text-muted-foreground">
              Comunicação instantânea entre clientes e técnicos via WebSocket
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Triagem Automática</h3>
            <p className="text-muted-foreground">
              Sistema inteligente de coleta de informações e criação de tickets
            </p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboard Técnico</h3>
            <p className="text-muted-foreground">
              Métricas completas, gestão de tickets e ferramentas de atendimento
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center border-t">
        <p className="text-muted-foreground text-sm">
          Sistema de Suporte Técnico - Preparado para integração com IA e conformidade LGPD
        </p>
      </footer>
    </div>
  );
};

export default Index;