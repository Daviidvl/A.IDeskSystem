import React, { useState } from 'react';
import { UserType } from './types';
import { useTickets } from './hooks/useTickets';
import { CustomerLogin } from './components/CustomerLogin';
import { TechnicianLogin } from './components/TechnicianLogin';
import { CustomerInterface } from './components/CustomerInterface';
import { TechnicianInterface } from './components/TechnicianInterface';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'customer-login' | 'technician-login' | 'customer-interface' | 'technician-interface'>('home');
  const [userType, setUserType] = useState<UserType>(null);
  const { tickets, createTicket, addMessage, updateTicketStatus } = useTickets();

  const handleLogin = (type: UserType) => {
    setUserType(type);
    setCurrentView(type === 'cliente' ? 'customer-interface' : 'technician-interface');
  };

  const handleBack = () => {
    if (currentView === 'customer-interface' || currentView === 'technician-interface') {
      setCurrentView('home');
      setUserType(null);
    } else {
      setCurrentView('home');
    }
  };

  // Home page with separate access paths
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75A9.75 9.75 0 0112 2.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sistema de Suporte</h1>
            <p className="text-gray-600">Bem-vindo ao nosso sistema de atendimento</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setCurrentView('customer-login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
            >
              Preciso de Suporte
            </button>

            <div className="text-center">
              <button
                onClick={() => setCurrentView('technician-login')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors underline"
              >
                Acesso para técnicos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'customer-login') {
    return <CustomerLogin onLogin={() => handleLogin('cliente')} onBack={handleBack} />;
  }

  if (currentView === 'technician-login') {
    return <TechnicianLogin onLogin={() => handleLogin('tecnico')} onBack={handleBack} />;
  }

  if (currentView === 'customer-interface' && userType === 'cliente') {
    return (
      <CustomerInterface
        onCreateTicket={createTicket}
        onSendMessage={(ticketId, message) => addMessage(ticketId, message, 'cliente')}
        tickets={tickets}
        onBack={handleBack}
      />
    );
  }

  if (currentView === 'technician-interface' && userType === 'tecnico') {
    return (
      <TechnicianInterface
        tickets={tickets}
        onSendMessage={(ticketId, message) => addMessage(ticketId, message, 'tecnico')}
        onUpdateStatus={updateTicketStatus}
        onBack={handleBack}
      />
    );
  }

  return null;
}

export default App;