import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, CheckCircle, Clock, AlertCircle, MessageSquare, ArrowLeft } from 'lucide-react';
import { supabase, Ticket } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Stats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: 0
  });

  const [ticketsByDay, setTicketsByDay] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (tickets) {
      const open = tickets.filter(t => t.status === 'open').length;
      const inProgress = tickets.filter(t => t.status === 'in_progress').length;
      const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

      const resolvedWithTime = tickets.filter(t => t.resolved_at && t.created_at);
      const avgTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, t) => {
            const diff = new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime();
            return sum + diff;
          }, 0) / resolvedWithTime.length
        : 0;

      setStats({
        totalTickets: tickets.length,
        openTickets: open,
        inProgressTickets: inProgress,
        resolvedTickets: resolved,
        avgResponseTime: Math.round(avgTime / 60000)
      });

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const ticketsByDayData = last7Days.map(date => {
        const dayTickets = tickets.filter(t => t.created_at.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          abertos: dayTickets.filter(t => t.status === 'open').length,
          resolvidos: dayTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
        };
      });

      setTicketsByDay(ticketsByDayData);
    }
  };

  const goToTechnician = () => {
    navigate('/tecnico');
  };

  const goBack = () => {
    navigate(-1);
  };

  const statusData = [
    { name: 'Abertos', value: stats.openTickets, color: '#FCD34D' },
    { name: 'Em Atendimento', value: stats.inProgressTickets, color: '#60A5FA' },
    { name: 'Resolvidos', value: stats.resolvedTickets, color: '#34D399' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header com navegação */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goBack}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">Dashboard A.I Desk</h1>
                <p className="text-sm opacity-90 mt-1">Visão geral do sistema de chamados</p>
              </div>
            </div>
            <button
              onClick={goToTechnician}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Painel do Técnico
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Chamados</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTickets}</p>
              </div>
              <Activity className="w-12 h-12 text-blue-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Chamados Abertos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.openTickets}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Em Atendimento</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inProgressTickets}</p>
              </div>
              <Clock className="w-12 h-12 text-purple-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Resolvidos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.resolvedTickets}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Chamados nos Últimos 7 Dias</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="abertos" fill="#FCD34D" name="Abertos" />
                <Bar dataKey="resolvidos" fill="#34D399" name="Resolvidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Distribuição de Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas de Desempenho */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Métricas de Desempenho</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-gray-700 font-medium mb-2">Tempo Médio de Resposta</p>
              <p className="text-4xl font-bold text-blue-600">{stats.avgResponseTime}</p>
              <p className="text-sm text-gray-600 mt-1">minutos</p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-gray-700 font-medium mb-2">Taxa de Resolução</p>
              <p className="text-4xl font-bold text-green-600">
                {stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600 mt-1">dos chamados</p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-gray-700 font-medium mb-2">Chamados Ativos</p>
              <p className="text-4xl font-bold text-purple-600">
                {stats.openTickets + stats.inProgressTickets}
              </p>
              <p className="text-sm text-gray-600 mt-1">aguardando</p>
            </div>
          </div>
        </div>

        {/* Ação Rápida */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Precisa atender chamados?</h3>
              <p className="text-gray-600 mt-1">Acesse o painel do técnico para começar o atendimento</p>
            </div>
            <button
              onClick={goToTechnician}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Ir para Atendimento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};