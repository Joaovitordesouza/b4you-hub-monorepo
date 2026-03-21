import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth, functions } from '../firebase'; 
import { useAuth } from '../AuthContext';
import { EvolutionInstance } from '../types';

interface CreateInstanceResponse {
    id: string;
    qrcode?: string;
    status?: string;
}

interface EvolutionContextType {
  instances: EvolutionInstance[];
  loading: boolean;
  createInstance: (name: string) => Promise<CreateInstanceResponse>; 
  deleteInstance: (instanceId: string) => Promise<void>;
  logoutInstance: (instanceId: string) => Promise<void>;
  getQrCode: (instanceName: string) => Promise<string>;
  resyncInstance: (instanceName: string) => Promise<void>;
}

const EvolutionContext = createContext<EvolutionContextType>({
  instances: [],
  loading: true,
  createInstance: async () => ({ id: '' }),
  deleteInstance: async () => {},
  logoutInstance: async () => {},
  getQrCode: async () => '',
  resyncInstance: async () => {},
});

export const useEvolution = () => useContext(EvolutionContext);

export const EvolutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Cloud Function Proxy (Gateway Único para Comandos)
  const manageInstances = functions.httpsCallable('manageInstances');

  // 1. Listener Real-time das Instâncias (Firestore)
  useEffect(() => {
    if (!currentUser) {
      setInstances([]);
      setLoading(false);
      return;
    }

    let query = db.collection('instances');
    
    // Se não for admin, filtra apenas as próprias instâncias
    if (currentUser.role !== 'admin') {
      query = query.where('ownerId', '==', currentUser.id) as any;
    }

    const unsubscribe = query.onSnapshot((snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EvolutionInstance[];
        
        data.sort((a, b) => {
            // Prioritize connected instances
            const isReadyA = a.systemStatus === 'READY' || a.connectionStatus === 'ONLINE';
            const isReadyB = b.systemStatus === 'READY' || b.connectionStatus === 'ONLINE';
            if (isReadyA && !isReadyB) return -1;
            if (!isReadyA && isReadyB) return 1;
            
            const timeA = a.updatedAt?.toMillis?.() || (typeof a.updatedAt === 'number' ? a.updatedAt : 0);
            const timeB = b.updatedAt?.toMillis?.() || (typeof b.updatedAt === 'number' ? b.updatedAt : 0);
            return timeB - timeA;
        });
        
        setInstances(data);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao ouvir instâncias:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Ações via Comandos (Cloud Functions)
  
  const createInstance = async (name: string): Promise<CreateInstanceResponse> => {
    if (!currentUser) throw new Error("Usuário não autenticado");

    const instanceNameFormatted = name.trim().toLowerCase().replace(/\s+/g, '-');

    try {
        // Conforme Guia v3: action 'create'
        const response = await manageInstances({ 
            action: 'create', 
            instanceName: instanceNameFormatted 
        });
        
        const data = response.data as any;
        
        if (data.success || data.instance) {
            return {
                id: data.instance?.instanceName || instanceNameFormatted,
                qrcode: data.qrcode, 
                status: data.instance?.status
            }; 
        }
        
        throw new Error(data.message || "Falha ao criar instância no backend.");
    } catch (error: any) {
        const msg = error.message || '';

        if (msg.includes('already exists') || msg.includes('já existe')) {
            return { id: instanceNameFormatted, status: 'EXISTING' };
        }

        console.error("Erro createInstance:", error);
        throw new Error(msg || "Erro de configuração no servidor.");
    }
  };

  const getQrCode = async (instanceName: string): Promise<string> => {
      try {
          // Conforme Guia v3: action 'connect' retorna QR se desconectado
          const response = await manageInstances({ 
              action: 'connect', 
              instanceName: instanceName 
          });
          const data = response.data as any;
          
          if (data.qrcode) {
              return typeof data.qrcode === 'object' ? data.qrcode.base64 : data.qrcode;
          }
          return '';
      } catch (error) {
          console.error("Erro getQrCode:", error);
          return '';
      }
  };

  const deleteInstance = async (instanceId: string) => {
      try {
          await manageInstances({ 
              action: 'delete', 
              instanceName: instanceId 
          });
      } catch (error) {
          console.error("Erro deleteInstance:", error);
      }
  };

  const logoutInstance = async (instanceId: string) => {
      try {
          // Logout força desconexão na Evolution
          await manageInstances({ 
              action: 'logout', 
              instanceName: instanceId 
          });
      } catch (error) {
          console.error("Erro logoutInstance:", error);
      }
  };

  const resyncInstance = async (instanceId: string) => {
      // Feature futura, por enquanto tenta conectar novamente
      try {
          await manageInstances({
              action: 'connect',
              instanceName: instanceId
          });
      } catch (error) {
          console.error("Erro resyncInstance:", error);
      }
  };

  return (
    <EvolutionContext.Provider value={{ instances, loading, createInstance, deleteInstance, logoutInstance, getQrCode, resyncInstance }}>
      {children}
    </EvolutionContext.Provider>
  );
};