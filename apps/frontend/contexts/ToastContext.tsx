
import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  avatarUrl?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Limita a exibição às últimas 3 notificações para não poluir a tela
  const visibleToasts = toasts.slice(-3);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
          {visibleToasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
