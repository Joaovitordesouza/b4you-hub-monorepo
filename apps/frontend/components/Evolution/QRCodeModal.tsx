
import React, { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { EvolutionInstance } from '../../types';
import { db } from '../../firebase';
import { useEvolution } from '../../contexts/EvolutionContext';

interface Props {
  instanceId: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<Props> = ({ instanceId, onClose }) => {
  const { getQrCode } = useEvolution();
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  
  // 1. Monitora Status e QR Code da Instância no Firestore (Real-time)
  useEffect(() => {
    const unsub = db.collection('instances').doc(instanceId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = { id: doc.id, ...doc.data() } as EvolutionInstance;
            setInstance(data);
            
            // Se o sistema diz que precisa parear e tem QR, exibe.
            if (data.systemStatus === 'NEEDS_PAIRING' && data.qrcode) {
                setQrCode(data.qrcode);
                setLoadingQr(false);
            }
            
            // Se estiver conectado, fecha
            if (data.systemStatus === 'READY' || data.connectionStatus === 'ONLINE') {
                setTimeout(() => onClose(), 2000);
            }
        }
    });
    return () => unsub();
  }, [instanceId]);

  // 2. Busca inicial apenas se necessário (se não tiver QR no banco)
  useEffect(() => {
      // Se não carregou via listener em 2s, tenta fetch manual (retry)
      const timeout = setTimeout(() => {
          if (!qrCode && instance?.systemStatus === 'NEEDS_PAIRING') {
              handleRefresh();
          }
      }, 2000);
      return () => clearTimeout(timeout);
  }, [instance]);

  const handleRefresh = async () => {
      setLoadingQr(true);
      const code = await getQrCode(instanceId);
      if (code) setQrCode(code);
      setLoadingQr(false);
  };

  if (!instance) return null;

  const isOnline = instance.systemStatus === 'READY' || instance.connectionStatus === 'ONLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-in slide-in-from-bottom-8 border border-white/20">
        
        {/* Header Indicator */}
        <div className="h-1.5 w-full bg-gray-100">
            <div 
                className={`h-full transition-all duration-1000 ${
                    isOnline ? 'bg-green-500 w-full' : 
                    loadingQr ? 'bg-blue-500 w-1/3 animate-pulse' : 
                    'bg-brand-500 w-2/3'
                }`}
            ></div>
        </div>

        <button 
            onClick={onClose} 
            className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-20"
        >
            <X size={20} />
        </button>

        <div className="p-8 pb-8 min-h-[420px] flex flex-col justify-center items-center">
            {isOnline ? (
                 <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-[0_0_0_8px_rgba(34,197,94,0.1)]">
                          <CheckCircle2 size={48} className="text-green-600" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Conectado!</h3>
                      <p className="text-gray-500 font-medium">Sincronizando conversas...</p>
                  </div>
            ) : (
                <div className="flex flex-col items-center animate-in fade-in duration-500 w-full">
                      <div className="relative mb-6 group">
                          {/* QR Code Frame */}
                          <div className="w-64 h-64 bg-white p-2 rounded-2xl border-2 border-gray-100 shadow-inner flex items-center justify-center relative overflow-hidden">
                              {qrCode ? (
                                  <>
                                    <img 
                                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                                        alt="QR Code" 
                                        className={`w-full h-full object-contain transition-opacity ${loadingQr ? 'opacity-50' : 'opacity-100'}`}
                                    />
                                    {/* Scanner Beam Animation */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-[scan_2.5s_infinite_linear] opacity-80 pointer-events-none"></div>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center text-gray-300 gap-2">
                                      <Loader2 size={32} className="animate-spin text-brand-500" />
                                      <span className="text-xs font-medium">Aguardando Código...</span>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <div className="text-center space-y-2 mb-6">
                          <h3 className="text-lg font-bold text-gray-900">Escaneie para conectar</h3>
                          <p className="text-sm text-gray-500 max-w-xs mx-auto">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                      </div>

                      <button 
                        onClick={handleRefresh}
                        disabled={loadingQr}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                          <RefreshCw size={14} className={loadingQr ? 'animate-spin' : ''} />
                          Tentar Novamente
                      </button>
                  </div>
            )}
        </div>

        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <Lock size={12} /> Criptografia Ponta-a-Ponta
        </div>
      </div>
    </div>
  );
};
