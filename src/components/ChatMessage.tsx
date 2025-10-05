import React from 'react';
import { Bot, User, Wrench } from 'lucide-react';
import { Message } from '../lib/supabase';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isClient = message.sender_type === 'client';
  const isAI = message.sender_type === 'ai';
  const isTechnician = message.sender_type === 'technician';

  const getIcon = () => {
    if (isAI) return <Bot className="w-5 h-5" />;
    if (isTechnician) return <Wrench className="w-5 h-5" />;
    return <User className="w-5 h-5" />;
  };

  const getBgColor = () => {
    if (isClient) return 'bg-blue-600 text-white';
    if (isAI) return 'bg-gradient-to-r from-purple-500 to-blue-500 text-white';
    return 'bg-gray-700 text-white';
  };

  const time = new Date(message.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`flex ${isClient ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-end gap-2 max-w-[70%] ${isClient ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getBgColor()} flex items-center justify-center`}>
          {getIcon()}
        </div>
        <div>
          <div className={`${getBgColor()} rounded-2xl px-4 py-2 shadow-md`}>
            <p className="text-sm font-medium mb-1 opacity-90">{message.sender_name}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className={`text-xs text-gray-500 mt-1 ${isClient ? 'text-right' : 'text-left'}`}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
};
