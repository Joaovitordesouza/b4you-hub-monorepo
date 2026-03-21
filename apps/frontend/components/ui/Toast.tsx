
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, MessageCircle } from 'lucide-react';
import { Avatar } from '../Avatar';

export type ToastType = 'success' | 'error' | 'info' | 'message';

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  avatarUrl?: string; // Para mensagens de chat
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, title, message, avatarUrl, duration = 4000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />,
    message: <MessageCircle size={20} className="text-brand-500" />
  };

  const bgColors = {
    success: 'bg-white border-l-4 border-green-500',
    error: 'bg-white border-l-4 border-red-500',
    info: 'bg-white border-l-4 border-blue-500',
    message: 'bg-white border-l-4 border-brand-500'
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg shadow-xl border border-gray-100 min-w-[300px] max-w-md animate-in slide-in-from-right-full transition-all duration-300 pointer-events-auto relative z-50 ${bgColors[type]}`}>
      {type === 'message' && avatarUrl ? (
          <Avatar src={avatarUrl} name={title || 'User'} alt="" className="w-10 h-10 rounded-full border border-gray-100 flex-shrink-0" />
      ) : (
          <div className="mt-0.5 flex-shrink-0">{icons[type]}</div>
      )}
      
      <div className="flex-1 min-w-0 pr-6">
        {title && <h4 className="text-sm font-bold text-gray-900 truncate">{title}</h4>}
        <p className={`text-sm text-gray-600 leading-snug ${type === 'message' ? 'line-clamp-2' : ''}`}>
            {message}
        </p>
      </div>
      
      <button 
        onClick={() => onClose(id)} 
        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};
