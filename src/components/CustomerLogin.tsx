import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';

interface CustomerLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export const CustomerLogin: React.FC<CustomerLoginProps> = ({ onLogin, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <button
          onClick={onBack}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Área do Cliente</h1>
          <p className="text-gray-600">Abra um chamado de suporte e receba ajuda da nossa equipe técnica</p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Descreva seu problema</li>
              <li>• Receba um número de ticket</li>
              <li>• Converse com nossa equipe via chat</li>
              <li>• Acompanhe o status do seu chamado</li>
            </ul>
          </div>

          <button
            onClick={onLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
          >
            Continuar como Cliente
          </button>
        </div>
      </div>
    </div>
  );
};
