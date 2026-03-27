
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { OnboardingStage, Producer, Usuario } from '../types';
import { 
    FileText, Settings, Database, CheckCircle2, PlayCircle, 
    X, MoreHorizontal, ShieldCheck, ChevronRight, Loader2, 
    AlertCircle, CheckSquare, Users, Calendar, HelpCircle,
    ArrowRight, ChevronDown, Check, Zap, Server
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db, auth, fieldValue } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { ScheduleOnboardingModal } from '../components/ScheduleOnboardingModal';

// --- CONFIGURAÇÃO VISUAL & LÓGICA ---

const STAGE_CONFIG: Record<OnboardingStage, { 
    label: string; 
    icon: any; 
    color: string; 
    bg: string;
    border: string;
    description: string;
    checklist: string[];
}> = {
    'HANDOVER': { 
        label: 'Handover Comercial', 
        icon: FileText, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        description: 'Validação inicial e passagem de bastão.',
        checklist: [
            'Cenário Atual Mapeado',
            'Credenciais Coletadas',
            'Taxas e Prazos Negociados',
            'Call de Setup Agendada'
        ]
    },
    'SETUP_ACESSO': { 
        label: 'Setup & Acessos', 
        icon: Settings, 
        color: 'text-purple-600', 
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        description: 'Configuração do ambiente e permissões.',
        checklist: [
            'Acessos da Plataforma Criados',
            'Pixel/API Configurado',
            'Domínios Conectados'
        ]
    },
    'IMPLEMENTACAO': { 
        label: 'Implementação Téc.', 
        icon: Database, 
        color: 'text-orange-600', 
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        description: 'Migração de alunos e conteúdo.',
        checklist: [
            'Conteúdo Importado',
            'Base de Alunos Migrada',
            'Testes de Compra Realizados'
        ]
    },
    'PRONTO_PRA_VENDER': { 
        label: 'Validação Final', 
        icon: CheckCircle2, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        description: 'Homologação para Go-Live.',
        checklist: [
            'Checkout Validado',
            'Área de Membros Revisada',
            'Produtor Treinado no Painel'
        ]
    },
    'FINALIZADO': { 
        label: 'Onboarding Concluído', 
        icon: PlayCircle, 
        color: 'text-green-600', 
        bg: 'bg-green-50',
        border: 'border-green-200',
        description: 'Entrega para CS e Growth.',
        checklist: [] 
    },
};

const ORDERED_STAGES: OnboardingStage[] = ['HANDOVER', 'SETUP_ACESSO', 'IMPLEMENTACAO', 'PRONTO_PRA_VENDER', 'FINALIZADO'];

// --- COMPONENTES AUXILIARES ---

const ToggleQuestion = ({ label, value, onChange }: { label: string, value: boolean | null, onChange: (val: boolean) => void }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            <button 
                onClick={() => onChange(true)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${value === true ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Sim
            </button>
            <button 
                onClick={() => onChange(false)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${value === false ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Não
            </button>
        </div>
    </div>
);

const UserDropdown = ({ users, selectedId, onChange }: { users: Usuario[], selectedId: string, onChange: (id: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedUser = users.find(u => u.id === selectedId);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Responsável Interno (B4You)</label>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl text-sm transition-all hover:border-brand-300 focus:ring-2 focus:ring-brand-100"
            >
                <div className="flex items-center gap-2">
                    {selectedUser ? (
                        <>
                            <Avatar src={selectedUser.avatar} name={selectedUser.nome} alt="" className="w-6 h-6 rounded-full border border-gray-100"/>
                            <span className="font-semibold text-gray-900">{selectedUser.nome}</span>
                        </>
                    ) : (
                        <span className="text-gray-400">Selecione um colaborador...</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95">
                    {users.map(u => (
                        <button 
                            key={u.id}
                            onClick={() => { onChange(u.id); setIsOpen(false); }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${selectedId === u.id ? 'bg-brand-50/50' : ''}`}
                        >
                            <Avatar src={u.avatar} name={u.nome} alt="" className="w-8 h-8 rounded-full border border-gray-100"/>
                            <div className="flex-1 text-left">
                                <p className="text-xs font-bold text-gray-900">{u.nome}</p>
                                <p className="text-[9px] text-gray-500 uppercase">{u.role}</p>
                            </div>
                            {selectedId === u.id && <Check size={14} className="text-brand-600"/>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

interface GateModalProps {
    producer: Producer;
    nextStage: OnboardingStage;
    teamMembers: Usuario[];
    onClose: () => void;
    onConfirm: (data: any) => void;
}

const GateModal: React.FC<GateModalProps> = ({ producer, nextStage, teamMembers, onClose, onConfirm }) => {
    const currentStage = producer.onboarding_stage || 'HANDOVER';
    const config = STAGE_CONFIG[currentStage];
    const nextConfig = STAGE_CONFIG[nextStage];
    
    // States do Checklist
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    
    // Perguntas de Fluxo (Apenas no Handover)
    const [setupSimples, setSetupSimples] = useState<boolean | null>(null);
    const [migracaoNecessaria, setMigracaoNecessaria] = useState<boolean | null>(null);
    
    // Responsáveis (Apenas no Setup)
    const [respInternal, setRespInternal] = useState(producer.responsibleInternalId || '');
    const [respClient, setRespClient] = useState(producer.responsibleClientId || '');

    // Lógica de Validação
    const allChecklistChecked = config.checklist.every(item => checkedItems[item]);
    const isHandover = currentStage === 'HANDOVER';
    const isSetup = currentStage === 'SETUP_ACESSO';

    const canProceed = useMemo(() => {
        if (!allChecklistChecked) return false;
        if (isHandover && (setupSimples === null || migracaoNecessaria === null)) return false;
        if (isSetup && (!respInternal || !respClient)) return false;
        return true;
    }, [allChecklistChecked, isHandover, setupSimples, migracaoNecessaria, isSetup, respInternal, respClient]);

    const handleConfirm = () => {
        const updateData: any = {};
        const tagsToAdd: string[] = [];

        if (isHandover) {
            if (setupSimples) tagsToAdd.push('Setup Simples');
            if (migracaoNecessaria) tagsToAdd.push('Migração Complexa');
            else tagsToAdd.push('Sem Migração');
        }

        if (isSetup) {
            updateData.responsibleInternalId = respInternal;
            updateData.responsibleClientId = respClient;
        }

        // Merge tags
        if (tagsToAdd.length > 0) {
            updateData.tags = [...(producer.tags || []), ...tagsToAdd];
        }

        onConfirm(updateData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-0 relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${nextConfig.bg} ${nextConfig.color} flex items-center justify-center border ${nextConfig.border}`}>
                            <nextConfig.icon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-none">Avançar Etapa</h2>
                            <p className="text-xs text-gray-500 mt-1 font-medium">De <span className="text-gray-700 font-bold">{config.label}</span> para <span className={`font-bold ${nextConfig.color.replace('text-', 'text-')}`}>{nextConfig.label}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    
                    {/* Perguntas de Fluxo (Handover) */}
                    {isHandover && (
                        <div className="space-y-3 animate-in slide-in-from-right-4 duration-300 delay-75">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><HelpCircle size={14}/> Definição de Escopo</h4>
                            <ToggleQuestion label="Ajuda com Setup Simples?" value={setupSimples} onChange={setSetupSimples} />
                            <ToggleQuestion label="Integração/Migração Necessária?" value={migracaoNecessaria} onChange={setMigracaoNecessaria} />
                        </div>
                    )}

                    {/* Definição de Responsáveis (Setup) */}
                    {isSetup && (
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4 animate-in slide-in-from-right-4 duration-300 delay-75">
                            <UserDropdown users={teamMembers} selectedId={respInternal} onChange={setRespInternal} />
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Responsável Cliente</label>
                                <input 
                                    type="text" 
                                    value={respClient} 
                                    onChange={e => setRespClient(e.target.value)} 
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                                    placeholder="Nome e Cargo (ex: Maria - Marketing)"
                                />
                            </div>
                        </div>
                    )}

                    {/* Checklist Padrão */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Checklist Obrigatório</h4>
                        {config.checklist.map((item, idx) => (
                            <label key={idx} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group ${checkedItems[item] ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${checkedItems[item] ? 'bg-green-500 border-green-500 text-white scale-110' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                    {checkedItems[item] && <Check size={12} strokeWidth={4} />}
                                </div>
                                <input type="checkbox" className="hidden" checked={!!checkedItems[item]} onChange={() => setCheckedItems(prev => ({...prev, [item]: !prev[item]}))} />
                                <span className={`text-sm font-medium ${checkedItems[item] ? 'text-gray-900' : 'text-gray-500'}`}>{item}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button 
                        onClick={handleConfirm}
                        disabled={!canProceed}
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl hover:-translate-y-0.5"
                    >
                        Confirmar e Avançar <ArrowRight size={18}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface Props {
    producers: Producer[];
    onUpdateStatus: (itemId: string, newStatus: OnboardingStage) => void;
}

export const OnboardingBoard: React.FC<Props> = ({ producers = [], onUpdateStatus }) => {
    const { addToast } = useToast();
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [gateModalData, setGateModalData] = useState<{ producer: Producer, nextStage: OnboardingStage } | null>(null);
    const [scheduleModalProducer, setScheduleModalProducer] = useState<Producer | null>(null);
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);

    useEffect(() => {
        const unsub = db.collection('meetings')
            .where('status', '==', 'scheduled')
            .onSnapshot(snap => {
                setMeetings(snap.docs.map(d => ({id: d.id, ...d.data()})));
            });
        return () => unsub();
    }, []);

    // Carrega usuários para o dropdown
    useEffect(() => {
        const unsub = db.collection('users').onSnapshot(snap => {
            setTeamMembers(snap.docs.map(d => ({id: d.id, ...d.data()} as Usuario)));
        });
        return () => unsub();
    }, []);

    const activeItems = useMemo(() => {
        return producers.filter(p => p.stage === 'ONBOARDING' || (p.onboarding_stage && p.onboarding_stage !== 'FINALIZADO'));
    }, [producers]);

    const handleDrop = (e: React.DragEvent, targetStage: OnboardingStage) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('itemId');
        const item = activeItems.find(i => i.id === itemId);
        
        if (!item) return;

        const currentStage = item.onboarding_stage || 'HANDOVER';
        const currentIndex = ORDERED_STAGES.indexOf(currentStage);
        const targetIndex = ORDERED_STAGES.indexOf(targetStage);

        // Bloqueia pular etapas (Obrigatório Linear)
        if (targetIndex !== currentIndex + 1 && targetIndex !== currentIndex) {
            addToast({ type: 'error', message: 'O fluxo deve ser sequencial. Complete a etapa atual primeiro.' });
            return;
        }

        if (targetIndex === currentIndex) return;

        setGateModalData({ producer: item, nextStage: targetStage });
    };

    const confirmStageChange = async (additionalData: any = {}) => {
        if (!gateModalData) return;
        const { producer, nextStage } = gateModalData;

        try {
            const batch = db.batch();
            const ref = db.collection('producers').doc(producer.id);

            const updatePayload: any = {
                onboarding_stage: nextStage,
                updatedAt: fieldValue.serverTimestamp(),
                ...additionalData
            };

            // Se for FINALIZADO, move para Active e Saúde da Carteira e INICIA TRACKING
            if (nextStage === 'FINALIZADO') {
                updatePayload.stage = 'ACTIVE';
                updatePayload.tracking_status = 'PRECISA_CONTATO'; 
                updatePayload.stats_financeiros = { 
                    ...producer.stats_financeiros, 
                    status_health: 'SAUDAVEL',
                    health_score: 100 
                };
            }

            batch.update(ref, updatePayload);

            // Log na Timeline
            const timelineRef = ref.collection('timeline').doc();
            let logMessage = `Onboarding avançou para ${STAGE_CONFIG[nextStage].label}.`;
            if (additionalData.responsibleInternalId) {
                const userName = teamMembers.find(u => u.id === additionalData.responsibleInternalId)?.nome || 'Usuário';
                logMessage += ` Responsável Técnico: ${userName}.`;
            }

            batch.set(timelineRef, {
                type: 'STAGE_CHANGE',
                content: logMessage,
                timestamp: Date.now(),
                authorName: auth.currentUser?.displayName || 'Sistema',
                authorId: auth.currentUser?.uid || 'SYSTEM',
                category: 'SYSTEM'
            });

            await batch.commit();

            if (nextStage === 'FINALIZADO') {
                addToast({ type: 'success', message: 'Onboarding Finalizado! Cliente ativado.' });
            } else {
                addToast({ type: 'success', message: 'Etapa atualizada com sucesso.' });
            }

            setGateModalData(null);

            if (nextStage === 'SETUP_ACESSO') {
                setScheduleModalProducer(producer);
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao atualizar etapa.' });
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col font-sans">
            {gateModalData && (
                <GateModal 
                    producer={gateModalData.producer} 
                    nextStage={gateModalData.nextStage} 
                    teamMembers={teamMembers}
                    onClose={() => setGateModalData(null)} 
                    onConfirm={confirmStageChange} 
                />
            )}

            {scheduleModalProducer && (
                <ScheduleOnboardingModal 
                    producer={scheduleModalProducer} 
                    onClose={() => setScheduleModalProducer(null)} 
                />
            )}

            <div className="mb-8 px-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-[#111827] tracking-tight flex items-center gap-3">
                            Esteira de Onboarding <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded-md uppercase tracking-wide border border-brand-200">Linear Workflow</span>
                        </h1>
                        <p className="text-[#6B7280] font-medium mt-1">Acompanhe a implantação técnica dos novos parceiros em tempo real.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6 px-2">
                <div className="h-full flex space-x-6 min-w-[1900px]">
                    {ORDERED_STAGES.map(stageKey => {
                        const colConfig = STAGE_CONFIG[stageKey];
                        const items = activeItems.filter(i => (i.onboarding_stage || 'HANDOVER') === stageKey);

                        return (
                            <div 
                                key={stageKey}
                                className="w-[380px] flex-shrink-0 flex flex-col bg-[#F9FAFB] rounded-[1.5rem] border border-[#E5E7EB]"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, stageKey)}
                            >
                                <div className={`p-5 border-b border-[#E5E7EB] bg-white rounded-t-[1.5rem] sticky top-0 z-10`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${colConfig.bg} ${colConfig.color} border ${colConfig.border}`}>
                                                <colConfig.icon size={18} strokeWidth={2.5}/>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-base">{colConfig.label}</h3>
                                        </div>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg font-black border border-gray-200">
                                            {items.length}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                                        <div className={`h-full ${colConfig.bg.replace('bg-','bg-').replace('50','500')} w-2/3 rounded-full`}></div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-medium">{colConfig.description}</p>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-gray-50/50 rounded-b-[1.5rem]">
                                    {items.map(item => {
                                        const assignedUser = teamMembers.find(u => u.id === item.responsibleInternalId);
                                        const hasComplexMigration = item.tags?.includes('Migração Complexa');
                                        const hasSimpleSetup = item.tags?.includes('Setup Simples');
                                        const itemMeeting = meetings.find(m => m.producerId === item.id);

                                        return (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => { e.dataTransfer.setData('itemId', item.id); setDraggedItem(item.id); }}
                                                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all group hover:border-brand-300 relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-brand-500 transition-colors"></div>
                                                
                                                <div className="flex items-start gap-3.5 mb-3 pl-2">
                                                    <Avatar src={item.foto_url} name={item.nome_display} alt="" className="w-11 h-11 rounded-xl border border-gray-100 shadow-sm object-cover" />
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <h4 className="text-sm font-bold text-gray-900 truncate leading-tight group-hover:text-brand-700 transition-colors">{item.nome_display}</h4>
                                                        <p className="text-[11px] text-gray-500 truncate font-medium mt-0.5">{item.produto_principal}</p>
                                                    </div>
                                                    <button className="text-gray-300 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><MoreHorizontal size={16}/></button>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2 mb-3 pl-2">
                                                    {hasComplexMigration && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md border border-orange-100 text-[9px] font-bold uppercase">
                                                            <Server size={10}/> Migração
                                                        </span>
                                                    )}
                                                    {hasSimpleSetup && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-[9px] font-bold uppercase">
                                                            <Zap size={10}/> Rápido
                                                        </span>
                                                    )}
                                                    {item.kyc_status && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-100 text-[9px] font-bold uppercase">
                                                            <ShieldCheck size={10}/> KYC
                                                        </span>
                                                    )}
                                                </div>

                                                {itemMeeting && (
                                                    <div className="mb-3 mx-2 bg-blue-50/80 border border-blue-200/60 rounded-lg p-2 flex items-center gap-2 group-hover:bg-blue-100 transition-colors">
                                                        <div className="p-1 bg-blue-600 text-white rounded shadow-sm">
                                                            <Calendar size={10} />
                                                        </div>
                                                        <span className="text-[10px] font-black tracking-wide text-blue-800">
                                                            Call: {new Date(itemMeeting.startTime.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="border-t border-gray-50 pt-2.5 flex justify-between items-center pl-2">
                                                    <div className="flex items-center gap-2">
                                                        {assignedUser ? (
                                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                                <Avatar src={assignedUser.avatar} name={assignedUser.nome} alt="" className="w-4 h-4 rounded-full"/>
                                                                <span className="text-[10px] font-bold text-gray-600">{assignedUser.nome.split(' ')[0]}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">Sem técnico</span>
                                                        )}
                                                    </div>
                                                    <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                                        <Calendar size={12}/> {new Date(item.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
