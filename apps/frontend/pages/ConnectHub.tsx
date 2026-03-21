import React, { useState, useEffect } from 'react';
import { Lead, EvolutionInstance, Usuario } from '../types';
import { useEvolution } from '../contexts/EvolutionContext';
import { useAuth } from '../AuthContext';
import { ConnectWizard } from '../components/Evolution/ConnectWizard';
import { useInstanceData } from '../hooks/useInstanceData'; // Novo hook
import { InstanceStatusBadge } from '../components/Evolution/InstanceStatusBadge'; // Novo componente
import { db } from '../firebase';
import { 
    Plus, Smartphone, Loader2, Trash2, 
    MessageSquare, RefreshCw, 
    Battery, BatteryMedium, BatteryWarning, Activity,
    Scan, ArrowRight, ShieldCheck, Power, AlertTriangle, Check
} from 'lucide-react';

interface Props {
  leads: Lead[];
}

const BatteryIndicator = ({ level }: { level?: number }) => {
    if (level === undefined) return null;
    return (
        <div className="flex items-center gap-1.5" title={`Bateria: ${level}%`}>
            <div className="relative">
                {level > 60 ? (
                    <Battery size={18} className="text-green-500 fill-green-100" />
                ) : level > 20 ? (
                    <BatteryMedium size={18} className="text-yellow-500 fill-yellow-50" />
                ) : (
                    <BatteryWarning size={18} className="text-red-500 fill-red-50 animate-pulse" />
                )}
            </div>
            <span className="text-[10px] font-bold text-gray-500">{level}%</span>
        </div>
    );
};

const SignalIndicator = ({ quality }: { quality?: string }) => {
    const bars = quality === 'Excellent' ? 4 : quality === 'Good' ? 3 : 2;
    return (
        <div className="flex items-end gap-[2px] h-3" title={`Sinal: ${quality || 'Desconhecido'}`}>
            {[1, 2, 3, 4].map(i => (
                <div 
                    key={i} 
                    className={`w-1 rounded-sm transition-all ${i <= bars ? 'bg-brand-500' : 'bg-gray-200'}`}
                    style={{ height: `${i * 25}%` }}
                ></div>
            ))}
        </div>
    );
};

// --- SMART DEVICE CARD (Reativo) ---

interface DeviceCardProps {
    instanceId: string;
    onDelete: (id: string) => void | Promise<void>;
    onOpenChat: (id: string) => void;
    ownerName?: string;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ instanceId, onDelete, onOpenChat, ownerName }) => {
    const { data: instance, loading } = useInstanceData(instanceId);

    if (loading || !instance) {
        return <div className="h-64 rounded-[2rem] bg-gray-50 animate-pulse border border-gray-100"></div>;
    }

    const handleForceSync = async () => {
        try {
            await db.collection('instances').doc(instanceId).update({
                forceSync: true,
                systemStatus: 'SYNCING' // Feedback otimista
            });
        } catch (e) { console.error(e); }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza? Isso irá desconectar o WhatsApp.")) return;
        try {
            await db.collection('instances').doc(instanceId).update({
                systemStatus: 'DELETING'
            });
            // A cloud function 'manageInstances' (delete) deve ser chamada aqui ou ouvida pelo backend
            // Para manter consistência com o pedido de usar Cloud Functions para delete:
            await onDelete(instanceId); 
        } catch (e) { console.error(e); }
    };

    // Estados Visuais
    const isReady = instance.systemStatus === 'READY' || instance.connectionStatus === 'ONLINE';
    const isSyncing = instance.systemStatus === 'SYNCING' || instance.systemStatus === 'INITIALIZING';
    const needsPairing = instance.systemStatus === 'NEEDS_PAIRING';
    const hasError = instance.systemStatus === 'RECONNECT_REQUIRED';

    return (
        <div className={`relative bg-white rounded-[2rem] border transition-all duration-300 group overflow-hidden flex flex-col ${isReady ? 'border-gray-200 shadow-card hover:shadow-card-hover hover:border-brand-200' : 'border-gray-200'}`}>
            
            {/* Status Top Bar */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-transparent">
                <InstanceStatusBadge status={instance.systemStatus} syncPercentage={instance.syncStatus?.percentage} />
                
                {isReady && (
                    <div className="flex items-center gap-3">
                        <SignalIndicator quality={instance.connectionQuality} />
                        <div className="w-px h-3 bg-gray-200"></div>
                        <BatteryIndicator level={instance.batteryLevel} />
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="p-6 flex-1 flex flex-col items-center text-center relative z-10">
                
                {needsPairing && instance.qrcode ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-inner mb-4">
                            <img src={instance.qrcode} className="w-32 h-32 object-contain mix-blend-multiply" alt="Scan Me" />
                        </div>
                        <p className="text-xs text-gray-500 font-medium mb-2">Escaneie para conectar</p>
                    </div>
                ) : (
                    <>
                        {/* Avatar Glow */}
                        <div className="relative mb-4">
                            <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-opacity ${isReady ? 'bg-brand-500 group-hover:opacity-40' : 'bg-gray-400 opacity-0'}`}></div>
                            <div className="w-20 h-20 rounded-[1.5rem] bg-white border-4 border-white shadow-lg overflow-hidden relative z-10">
                                {instance.profilePicUrl ? (
                                    <img src={instance.profilePicUrl} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                                        <Smartphone size={32} />
                                    </div>
                                )}
                            </div>
                            {/* Platform Icon */}
                            <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md z-20">
                                <div className="w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center text-white">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-black text-gray-900 mb-1">{instance.name}</h3>
                        {ownerName && (
                            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">
                                Responsável: {ownerName}
                            </p>
                        )}
                        <p className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 truncate max-w-[180px]">
                            {instance.profileName || 'WhatsApp Business'}
                        </p>
                    </>
                )}

                {/* Progress Bar for Syncing */}
                {isSyncing && (
                    <div className="w-full mt-4 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-brand-500 h-full rounded-full transition-all duration-500 animate-pulse" style={{ width: `${instance.syncStatus?.percentage || 30}%` }}></div>
                    </div>
                )}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/50">
                {isReady ? (
                    <>
                        <button 
                            onClick={() => onOpenChat(instance.id)}
                            className="py-4 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors group/btn"
                        >
                            <MessageSquare size={18} className="text-gray-400 group-hover/btn:text-brand-600 mb-0.5" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide group-hover/btn:text-brand-700">Inbox</span>
                        </button>
                        <button 
                            onClick={handleForceSync}
                            className="py-4 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors group/btn"
                        >
                            <RefreshCw size={18} className="text-gray-400 group-hover/btn:text-blue-500 mb-0.5" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide group-hover/btn:text-blue-600">Sincronizar</span>
                        </button>
                    </>
                ) : (
                    <>
                        {hasError && (
                            <button 
                                onClick={handleForceSync}
                                className="py-4 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors group/btn bg-red-50"
                            >
                                <RefreshCw size={18} className="text-red-500 mb-0.5" />
                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Tentar Novamente</span>
                            </button>
                        )}
                        <button 
                            onClick={handleDelete} 
                            className={`py-4 flex flex-col items-center justify-center gap-1 hover:bg-white transition-colors group/btn ${!isReady ? 'col-span-2' : ''}`}
                        >
                            <Trash2 size={18} className="text-gray-400 group-hover/btn:text-red-500 mb-0.5" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide group-hover/btn:text-red-600">Remover</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export const ConnectHub: React.FC<Props> = ({ leads }) => {
    const { instances, loading, deleteInstance, logoutInstance } = useEvolution();
    const { currentUser } = useAuth();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [users, setUsers] = useState<Record<string, string>>({});

    useEffect(() => {
        if (currentUser?.role === 'admin') {
            const unsub = db.collection('users').onSnapshot(snap => {
                const userMap: Record<string, string> = {};
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    userMap[doc.id] = data.nome || data.email || doc.id;
                });
                setUsers(userMap);
            });
            return () => unsub();
        }
    }, [currentUser]);

    const handleOpenChat = (instanceId: string) => {
        window.location.hash = '#/inbox';
    };

    const handleConnectionSuccess = () => {
        // Redireciona automaticamente para o Inbox após conexão bem-sucedida
        window.location.hash = '#/inbox';
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-20 animate-in fade-in duration-700 px-6 md:px-10">
            
            {/* Wizard Modal */}
            {isWizardOpen && (
                <ConnectWizard 
                    onClose={() => setIsWizardOpen(false)} 
                    onSuccess={handleConnectionSuccess}
                />
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 pb-8 mt-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-100 flex items-center gap-1.5 shadow-sm">
                            <Activity size={12} /> Status da Rede: {loading ? 'Verificando...' : 'Operacional'}
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Dispositivos Conectados
                    </h1>
                    <p className="text-gray-500 font-medium mt-2 max-w-xl text-lg">
                        Gerencie as sessões de WhatsApp da sua equipe. Mantenha os aparelhos conectados para garantir o funcionamento das automações.
                    </p>
                </div>
                
                <button 
                    onClick={() => setIsWizardOpen(true)}
                    className="group relative overflow-hidden bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-bold shadow-2xl transition-all hover:-translate-y-1 hover:shadow-brand-900/20 active:translate-y-0"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative flex items-center gap-3">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform"/> 
                        Adicionar Novo Dispositivo
                    </span>
                </button>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 text-gray-300 space-y-4">
                    <Loader2 size={48} className="animate-spin text-brand-600 opacity-50" />
                    <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Sincronizando gateways...</p>
                </div>
            ) : instances.length === 0 ? (
                <div className="grid place-items-center py-20">
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-16 text-center max-w-lg hover:border-brand-300 transition-colors group cursor-pointer" onClick={() => setIsWizardOpen(true)}>
                        <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Scan size={40} className="text-brand-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Nenhum dispositivo ativo</h3>
                        <p className="text-gray-500 mb-8 font-medium">Conecte o primeiro WhatsApp para habilitar o CRM e a automação de mensagens.</p>
                        <span className="text-brand-600 font-bold text-sm flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                            Iniciar Configuração <ArrowRight size={16}/>
                        </span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {instances.map(inst => (
                        <DeviceCard 
                            key={inst.id} 
                            instanceId={inst.id}
                            onDelete={deleteInstance}
                            onOpenChat={handleOpenChat}
                            ownerName={currentUser?.role === 'admin' ? users[inst.ownerId] : undefined}
                        />
                    ))}
                    
                    {/* Add Card (Mini) */}
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/30 transition-all min-h-[300px] group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-sm uppercase tracking-wider">Conectar Outro</span>
                    </button>
                </div>
            )}

            {/* Footer Trust Indicators */}
            <div className="border-t border-gray-100 pt-10 flex justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <ShieldCheck size={16}/> Criptografia Militar AES-256
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Activity size={16}/> 99.9% Uptime SLA
                </div>
            </div>
        </div>
    );
};