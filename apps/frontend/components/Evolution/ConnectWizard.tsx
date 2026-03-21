
import React, { useState, useEffect } from 'react';
import { 
    X, Smartphone, QrCode, CheckCircle2, Loader2, 
    ShieldCheck, RefreshCw, ChevronRight, Lock, AlertCircle 
} from 'lucide-react';
import { useEvolution } from '../../contexts/EvolutionContext';
import { db } from '../../firebase';
import { EvolutionInstance } from '../../types';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

type WizardStep = 'INIT' | 'CREATING' | 'QR_SCAN' | 'SYNCING' | 'SUCCESS';

const SUGGESTED_NAMES = ['Comercial', 'Suporte', 'Financeiro', 'Pessoal', 'Marketing'];

export const ConnectWizard: React.FC<Props> = ({ onClose, onSuccess }) => {
    const { createInstance, getQrCode } = useEvolution();
    
    const [step, setStep] = useState<WizardStep>('INIT');
    const [instanceName, setInstanceName] = useState('');
    const [instanceId, setInstanceId] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Monitora Status via Firestore (Reativo)
    useEffect(() => {
        if (!instanceId) return;

        const unsub = db.collection('instances').doc(instanceId).onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data() as EvolutionInstance;

            // Logica baseada em systemStatus (Fonte da Verdade)
            if (data.systemStatus === 'READY' || data.connectionStatus === 'ONLINE') {
                setStep('SYNCING');
            } else if (data.systemStatus === 'NEEDS_PAIRING' && data.qrcode) {
                setQrCode(data.qrcode);
                setStep('QR_SCAN');
            } else if (data.systemStatus === 'CREATED') {
                setStep('CREATING');
            }
        });

        return () => unsub();
    }, [instanceId]);

    const handleStart = async () => {
        const finalName = instanceName.trim() || `WhatsApp ${Math.floor(Math.random() * 1000)}`;
        setStep('CREATING');
        setError(null);

        try {
            // Apenas cria a instância. O resto é reativo.
            const result = await createInstance(finalName);
            setInstanceId(result.id);
            
            // Se já retornou QR Code na criação (às vezes acontece), já mostra
            if (result.qrcode) {
                setQrCode(result.qrcode);
                setStep('QR_SCAN');
            }

        } catch (err: any) {
            console.error("Wizard Error:", err);
            setError(err.message || "Não foi possível iniciar. Tente novamente.");
            setStep('INIT');
        }
    };

    const handleRefreshQR = async () => {
        if (!instanceId) return;
        setQrCode(null); // Feedback visual de loading
        try {
            // Tenta forçar geração de novo QR se expirou
            await getQrCode(instanceId);
        } catch (e) {
            console.error(e);
        }
    };

    // Render Components
    const renderInit = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <Smartphone size={32} className="text-brand-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Adicionar WhatsApp</h2>
                <p className="text-gray-500 font-medium text-sm">Conecte um novo número para automatizar seu atendimento.</p>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Identificação (Opcional)</label>
                <input 
                    autoFocus
                    type="text" 
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="Ex: Comercial Principal"
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-medium"
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
                <div className="flex flex-wrap gap-2">
                    {SUGGESTED_NAMES.map(name => (
                        <button 
                            key={name}
                            onClick={() => setInstanceName(name)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-600 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14}/> {error}
                </div>
            )}

            <button 
                onClick={handleStart}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2 group"
            >
                Continuar para QR Code
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
            </button>
        </div>
    );

    const renderCreating = () => (
        <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-300">
            <div className="relative mb-6">
                <div className="w-20 h-20 border-4 border-brand-100 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-brand-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck size={24} className="text-brand-600 opacity-50"/>
                </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Iniciando Servidor...</h3>
            <p className="text-sm text-gray-500 max-w-xs text-center">Aguarde enquanto geramos seu QR Code seguro.</p>
        </div>
    );

    const renderQR = () => (
        <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
            <div className="flex-1 flex flex-col items-center justify-center relative">
                
                <div className="relative w-[280px] aspect-[9/16] bg-gray-900 rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-xl w-32 mx-auto z-20"></div>
                    
                    <div className="absolute inset-0 bg-white flex flex-col">
                        <div className="bg-[#008069] h-16 w-full flex items-end p-4 pb-2">
                            <span className="text-white font-bold text-sm">WhatsApp Web</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f0f2f5] relative">
                            <div className="bg-white p-2 rounded-xl shadow-sm relative group cursor-pointer" onClick={handleRefreshQR}>
                                {qrCode ? (
                                    <>
                                        <img 
                                            src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                                            alt="QR Code" 
                                            className="w-48 h-48 object-contain mix-blend-multiply"
                                        />
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                            <div className="flex flex-col items-center text-brand-600 font-bold text-xs gap-1">
                                                <RefreshCw size={24}/>
                                                Atualizar Código
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                                        <Loader2 size={32} className="animate-spin text-gray-400"/>
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-4 text-center max-w-[150px] leading-tight">
                                Aponte a câmera do seu celular para esta tela
                            </p>
                        </div>
                    </div>
                </div>

                <div className="absolute -right-8 -top-6 hidden md:block">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-[200px] animate-in slide-in-from-left-4 delay-500">
                        <h4 className="font-bold text-xs text-gray-900 mb-2">No seu celular:</h4>
                        <ol className="text-[10px] text-gray-600 space-y-2 list-decimal pl-3">
                            <li>Abra o WhatsApp</li>
                            <li>Toque em <b>Configurações</b> (iOS) ou <b>Mais opções</b> (Android)</li>
                            <li>Toque em <b>Aparelhos Conectados</b></li>
                            <li>Toque em <b>Conectar Aparelho</b></li>
                        </ol>
                    </div>
                </div>

            </div>
        </div>
    );

    const renderSyncing = () => {
        const [progress, setProgress] = useState(0);
        
        useEffect(() => {
            const duration = 10000; // 10 segundos
            const interval = 100;
            const step = (interval / duration) * 100;
            
            const timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        return 100;
                    }
                    return prev + step;
                });
            }, interval);

            const finalTimer = setTimeout(() => {
                setStep('SUCCESS');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }, duration);

            return () => {
                clearInterval(timer);
                clearTimeout(finalTimer);
            };
        }, []);

        return (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-500">
                <div className="w-full max-w-[320px] bg-white rounded-3xl border border-gray-100 shadow-2xl p-8 flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100 italic font-black text-white text-3xl">
                        W
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">WhatsApp Web</h3>
                    <p className="text-sm text-gray-500 mb-8 text-center font-medium italic">Sincronização Rápida ativada...</p>
                    
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div 
                            className="h-full bg-[#25D366] transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{Math.round(progress)}% Concluído</span>
                </div>
                
                <p className="mt-8 text-xs text-gray-400 flex items-center gap-2 font-medium">
                    <Lock size={12}/> Suas mensagens são protegidas com criptografia de ponta a ponta.
                </p>
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-200 mb-6 relative">
                <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
                <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping"></div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Quase Pronto!</h2>
            <p className="text-gray-500 font-medium">Redirecionando para o seu Inbox...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl min-h-[500px] rounded-[2rem] shadow-2xl flex overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white/20">
                
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 z-20 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-8 hidden md:flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-brand-600 font-bold mb-6">
                            <QrCode size={20} />
                            <span className="uppercase tracking-widest text-xs">Scan & Go</span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-4">
                            Conecte seu WhatsApp em segundos.
                        </h1>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Acesse suas conversas, automatize respostas e gerencie leads diretamente do B4You Hub.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <Lock size={12} className="text-brand-500"/>
                        Criptografia Ponta-a-Ponta
                    </div>
                </div>

                <div className="flex-1 p-8 md:p-12 relative flex flex-col justify-center">
                    {step === 'INIT' && renderInit()}
                    {step === 'CREATING' && renderCreating()}
                    {step === 'QR_SCAN' && renderQR()}
                    {step === 'SYNCING' && renderSyncing()}
                    {step === 'SUCCESS' && renderSuccess()}
                </div>

            </div>
        </div>
    );
};
