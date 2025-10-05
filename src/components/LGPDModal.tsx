import React from 'react';
import { Shield } from 'lucide-react';

interface LGPDModalProps {
  onAccept: () => void;
}

export const LGPDModal: React.FC<LGPDModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Política de Privacidade e LGPD</h2>
          </div>

          <div className="space-y-4 text-gray-700">
            <p>
              Bem-vindo ao <strong>A.I Desk</strong>. Antes de prosseguir, pedimos que leia e aceite nossa política de privacidade.
            </p>

            <h3 className="font-semibold text-lg text-gray-900 mt-4">Coleta de Dados</h3>
            <p>
              Coletamos informações fornecidas por você durante o atendimento, incluindo nome, e-mail e descrição do problema técnico.
            </p>

            <h3 className="font-semibold text-lg text-gray-900 mt-4">Uso dos Dados</h3>
            <p>
              Seus dados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Prestar suporte técnico adequado</li>
              <li>Manter histórico de atendimentos</li>
              <li>Melhorar nossos serviços</li>
              <li>Comunicação sobre seu chamado</li>
            </ul>

            <h3 className="font-semibold text-lg text-gray-900 mt-4">Proteção de Dados</h3>
            <p>
              Implementamos medidas de segurança técnicas e administrativas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>

            <h3 className="font-semibold text-lg text-gray-900 mt-4">Seus Direitos</h3>
            <p>
              Conforme a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Acessar seus dados pessoais</li>
              <li>Solicitar correção de dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
            </ul>

            <h3 className="font-semibold text-lg text-gray-900 mt-4">Compartilhamento</h3>
            <p>
              Seus dados não serão compartilhados com terceiros, exceto quando necessário para prestação do serviço ou por determinação legal.
            </p>

            <p className="mt-4 text-sm text-gray-600">
              Para exercer seus direitos ou esclarecer dúvidas, entre em contato através do e-mail: privacidade@aidesk.com
            </p>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onAccept}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Aceito os Termos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};