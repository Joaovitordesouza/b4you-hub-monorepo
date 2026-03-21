
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Producer, TrackingStatus, Usuario } from '../types';
import { 
    Phone, Clock, Wrench, Zap, 
    MoreHorizontal, MessageSquare, AlertCircle, 
    ArrowRight, CheckCircle2, Search,
    BarChart3, Activity, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db, fieldValue, auth } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { SmartCommandCenter } from '../components/SmartCommandCenter';
import { TransitionGuard } from '../components/TransitionGuard';
import { OnboardingRequestModal } from '../components/OnboardingRequestModal';

import { TimeInStageBadge } from '../components/TimeInStageBadge';

// Configuração das Colunas de Ação (Updated)
const COLUMNS: { id: TrackingStatus; label: string; icon: any; color: string; bg: string; border: string; accent: string; description: string }[] = [
    { id: 'PRECISA_CONTATO', label: 'Precisa de Contato', icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', description: 'Alerta Operacional (7+ dias).' },
    { id: 'EM_ANDAMENTO', label: 'Em Tratativa', icon: Phone, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500', description: 'Contato iniciado pelo gerente.' },
    { id: 'AGUARDANDO_RETORNO', label: 'Aguardando', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', description: 'Esperando resposta do cliente.' },
    { id: 'EM_SUPORTE', label: 'Em Suporte', icon: Wrench, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', description: 'Travado por questão técnica.' },
    { id: 'ACAO_ESTRATEGICA', label: 'Estratégico', icon: Zap, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', description: 'Growth, upsell e ativação.' },
];

interface Props {
    producers: Producer[];
}



export const CSPipeline: React.FC<Props> = ({ producers }) => {
    const { addToast } = useToast();
    const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
    const [onboardingModalData, setOnboardingModalData] = useState<{ producer: Producer } | null>(null);
    const [transitionData, setTransitionData] = useState<{ producer: Producer, targetStatus: TrackingStatus } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);

    useEffect(() => {
        const unsub = db.collection('users').onSnapshot(
            (snap) => {
                setTeamMembers(snap.docs.map(d => ({id: d.id, ...d.data()} as Usuario)));
            },
            (error) => {
                console.error("Erro ao carregar membros da equipe (Pipeline):", error);
            }
        );
        return () => unsub();
    }, []);

    const trackedProducers = useMemo(() => {
        const currentUser = teamMembers.find(u => u.id === auth.currentUser?.uid);
        const isAdmin = currentUser?.role === 'admin';

        return producers.filter(p => {
            // Filter by assigned CS unless admin
            if (!isAdmin && p.gerente_conta !== auth.currentUser?.uid) {
                return false;
            }

            return p.tracking_status !== null && 
            p.tracking_status !== undefined &&
            p.stage !== 'ONBOARDING' &&
            p.nome_display.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [producers, searchTerm, teamMembers]);

    const stats = useMemo(() => {
        const total = trackedProducers.length;
        const critical = trackedProducers.filter(p => p.tracking_status === 'PRECISA_CONTATO').length;
        const waiting = trackedProducers.filter(p => p.tracking_status === 'AGUARDANDO_RETORNO').length;
        return { total, critical, waiting };
    }, [trackedProducers]);

    const handleDrop = (e: React.DragEvent, status: TrackingStatus) => {
        e.preventDefault();
        const producerId = e.dataTransfer.getData('producerId');
        const producer = producers.find(p => p.id === producerId);
        
        if (producer && producer.tracking_status !== status) {
            // Intercepta a mudança para exigir nota (TransitionGuard)
            setTransitionData({ producer, targetStatus: status });
        }
    };

    const confirmTransition = async (data: { note: string, scheduleAt?: string, responsibility?: 'B4YOU' | 'CLIENT' }, overrideData?: { producer: Producer, targetStatus: TrackingStatus }) => {
        const activeData = overrideData || transitionData;
        if (!activeData) return;
        
        const { producer, targetStatus } = activeData;
        const { note, scheduleAt, responsibility } = data;

        try {
            const batch = db.batch();
            const producerRef = db.collection('producers').doc(producer.id);
            
            const now = new Date().toISOString();
            const enteredAt = producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || now;
            const durationMs = new Date(now).getTime() - new Date(enteredAt).getTime();
            const durationMinutes = Math.floor(durationMs / 60000);

            const historyEntry = {
                status: producer.tracking_status || 'NOVO',
                enteredAt: enteredAt,
                exitedAt: now,
                durationMinutes,
                changedBy: auth.currentUser?.uid || 'SYSTEM'
            };

            const currentHistory = producer.statusHistory || [];

            // 1. Atualiza Status e Metadata
            batch.update(producerRef, {
                tracking_status: targetStatus,
                statusUpdatedAt: now,
                nextReminderAt: scheduleAt || fieldValue.delete(),
                statusHistory: [...currentHistory, historyEntry],
                'tracking_metadata.entered_stage_at': now, // Keep for legacy
                'tracking_metadata.last_interaction_at': now,
                updatedAt: fieldValue.serverTimestamp()
            });

            // 2. Log na Timeline (Com a nota obrigatória)
            const timelineRef = producerRef.collection('timeline').doc();
            batch.set(timelineRef, {
                type: 'STAGE_CHANGE',
                content: `Mudança para ${COLUMNS.find(c => c.id === targetStatus)?.label}. Nota: ${note}`,
                timestamp: Date.now(),
                authorId: auth.currentUser?.uid || 'SYSTEM',
                authorName: auth.currentUser?.displayName || 'Gerente',
                category: 'SYSTEM',
                isInternal: true
            });
            
            // 3. Criar Tarefa se houver agendamento
            if (scheduleAt) {
                const taskRef = db.collection('tasks').doc();
                const assignedTo = auth.currentUser?.uid ? [auth.currentUser.uid] : [];
                const finalTitle = responsibility === 'CLIENT' ? `[Cliente] Lembrete: ${producer.nome_display}` : `Lembrete: ${producer.nome_display}`;
                
                batch.set(taskRef, {
                    id: taskRef.id,
                    title: finalTitle,
                    description: `Follow-up agendado durante mudança para ${COLUMNS.find(c => c.id === targetStatus)?.label}.\nNota: ${note}`,
                    dueDate: scheduleAt.split('T')[0],
                    priority: 'HIGH',
                    status: 'PENDING',
                    type: 'REMINDER',
                    responsibility: responsibility || 'B4YOU',
                    leadId: producer.id,
                    userId: auth.currentUser?.uid,
                    assignedTo: assignedTo,
                    creatorName: auth.currentUser?.displayName || 'Sistema',
                    createdAt: fieldValue.serverTimestamp(),
                    updatedAt: fieldValue.serverTimestamp()
                });
            }

            await batch.commit();
            addToast({ type: 'success', message: 'Status atualizado com sucesso.' });
            if (!overrideData) setTransitionData(null);
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao atualizar status.' });
        }
    };

    // Ação direta do botão (Setinha) - Também passa pelo Guard
    const handleDirectMove = (e: React.MouseEvent, producer: Producer, currentStatus: TrackingStatus) => {
        e.stopPropagation(); 
        const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
        const nextCol = COLUMNS[currentIndex + 1] || COLUMNS[1]; 
        setTransitionData({ producer, targetStatus: nextCol.id });
    };

    const handleSendToOnboarding = async (data: { scheduleAt: string }) => {
        if (!onboardingModalData) return;
        const { producer } = onboardingModalData;
        
        try {
            const batch = db.batch();
            const producerRef = db.collection('producers').doc(producer.id);
            
            batch.update(producerRef, {
                stage: 'ONBOARDING',
                onboarding_stage: 'HANDOVER',
                onboarding_scheduled_at: data.scheduleAt,
                updatedAt: fieldValue.serverTimestamp()
            });

            // Log na Timeline
            const timelineRef = producerRef.collection('timeline').doc();
            batch.set(timelineRef, {
                type: 'STAGE_CHANGE',
                content: `Enviado para Onboarding. Call agendada para: ${new Date(data.scheduleAt).toLocaleString('pt-BR')}`,
                timestamp: Date.now(),
                authorId: auth.currentUser?.uid || 'SYSTEM',
                authorName: auth.currentUser?.displayName || 'Gerente',
                category: 'SYSTEM'
            });

            await batch.commit();
            addToast({ type: 'success', message: 'Cliente enviado para onboarding.' });
            setOnboardingModalData(null);
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao enviar para onboarding.' });
        }
    };

    return (
        <div className="h-screen flex flex-col font-sans bg-[#FAFAFA] overflow-hidden">
            {/* Modal de Detalhes (Command Center) */}
            {selectedProducer && (
                <SmartCommandCenter 
                    producer={selectedProducer} 
                    teamMembers={teamMembers} 
                    onClose={() => setSelectedProducer(null)}
                    onInitiateTransition={(producer, targetStatus) => {
                        setTransitionData({ producer, targetStatus });
                    }}
                    onSendToOnboarding={(producer) => setOnboardingModalData({ producer })}
                    onUpdateStatus={async (status, note) => {
                        const mockData = { producer: selectedProducer, targetStatus: status };
                        await confirmTransition({ note: note || 'Via Command Center' }, mockData);
                        setSelectedProducer(null);
                    }}
                />
            )}

            {/* Modal de Onboarding */}
            {onboardingModalData && (
                <OnboardingRequestModal 
                    producer={onboardingModalData.producer}
                    onClose={() => setOnboardingModalData(null)}
                    onConfirm={handleSendToOnboarding}
                />
            )}

            {/* Modal de Transição (Guard) */}
            {transitionData && !selectedProducer && !onboardingModalData && (
                <TransitionGuard 
                    producer={transitionData.producer}
                    targetStatus={transitionData.targetStatus}
                    config={COLUMNS.find(c => c.id === transitionData.targetStatus)!}
                    onClose={() => setTransitionData(null)}
                    onConfirm={confirmTransition}
                />
            )}

            {/* Header Glassmorphism - Elite Apple Style */}
            <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-2xl border-b border-black/[0.08] px-8 py-5">
                <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pipeline de Acompanhamento</h1>
                        </div>

                        {/* Integrated Stats Bar - More Elegant */}
                        <div className="hidden xl:flex items-center gap-1 bg-black/[0.04] p-1 rounded-2xl border border-black/[0.02]">
                            <div className="px-4 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white transition-all cursor-default group">
                                <span className="text-sm font-bold text-slate-900">{stats.total}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Ativos</span>
                            </div>
                            <div className="w-px h-4 bg-black/[0.1]"></div>
                            <div className="px-4 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white transition-all cursor-default group">
                                <span className="text-sm font-bold text-rose-500">{stats.critical}</span>
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest group-hover:text-rose-500 transition-colors">Risco</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 w-full lg:w-auto">
                        {/* View Switcher (Segmented Control) - Refined */}
                        <div className="flex bg-black/[0.04] p-1 rounded-xl border border-black/[0.02]">
                            <button className="px-5 py-2 bg-white shadow-sm rounded-lg text-[11px] font-bold text-slate-900 transition-all">Kanban</button>
                            <button className="px-5 py-2 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-all">Lista</button>
                        </div>

                        <div className="relative group flex-1 lg:flex-none">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                            <input 
                                type="text" 
                                placeholder="Buscar cliente..." 
                                className="pl-11 pr-5 py-2.5 bg-black/[0.04] border border-black/[0.02] rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/30 focus:ring-8 focus:ring-indigo-500/[0.04] transition-all w-full lg:w-72 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Kanban Board - Airy & Fluid */}
            <main className="flex-1 overflow-hidden relative bg-[#F2F2F7]">
                <div 
                    className="h-full overflow-x-auto overflow-y-hidden px-8 py-10 custom-scrollbar"
                >
                    <div className="h-full flex space-x-8 min-w-max">
                        {COLUMNS.map(col => {
                            const items = trackedProducers.filter(p => p.tracking_status === col.id);
                            
                            return (
                                <div 
                                    key={col.id}
                                    className="w-[300px] flex-shrink-0 flex flex-col bg-black/[0.02] rounded-[28px] border border-black/[0.03] overflow-hidden"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    {/* Column Header - Sticky & Minimal */}
                                    <div className="p-5 px-6 flex items-center justify-between bg-white/40 backdrop-blur-md border-b border-black/[0.02]">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${col.accent} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                                            <h3 className="font-bold text-slate-800 text-[13px] tracking-tight">{col.label}</h3>
                                            <span className="text-[10px] font-black text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-black/[0.03] shadow-sm">
                                                {items.length}
                                            </span>
                                        </div>
                                        <button className="text-slate-300 hover:text-slate-500 transition-colors p-1.5 hover:bg-white/50 rounded-lg">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>

                                    {/* Cards List - Airy Container */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar-thin">
                                        {items.map(p => (
                                            <div
                                                key={p.id}
                                                draggable
                                                onDragStart={(e) => e.dataTransfer.setData('producerId', p.id)}
                                                onClick={() => setSelectedProducer(p)}
                                                className="group relative bg-white p-5 rounded-[24px] border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 hover:border-indigo-500/20 hover:-translate-y-1.5 cursor-pointer active:scale-[0.97] overflow-hidden"
                                            >
                                                {/* Elite Card Header */}
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="relative">
                                                        <Avatar src={p.foto_url} name={p.nome_display} alt="" className="w-11 h-11 rounded-[16px] border border-black/[0.04] shadow-sm object-cover" />
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-black/[0.04] shadow-sm text-[9px] font-black text-slate-400">
                                                            {p.plataforma_origem?.[0] || 'K'}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[14px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors tracking-tight leading-tight">{p.nome_display}</h4>
                                                        <p className="text-[10px] text-slate-400 truncate font-semibold tracking-wider mt-1 uppercase opacity-70">
                                                            {p.produto_principal}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* SLA & MRR - Minimalist */}
                                                <div className="flex items-center justify-between bg-[#F9F9FB] p-3.5 rounded-[18px] border border-black/[0.02]">
                                                    <TimeInStageBadge 
                                                        statusUpdatedAt={p.statusUpdatedAt || p.tracking_metadata?.entered_stage_at || p.lastContactAt} 
                                                        nextReminderAt={p.nextReminderAt}
                                                        stageType={col.id === 'AGUARDANDO_RETORNO' ? 'REMINDER' : 'NORMAL'}
                                                    />
                                                    <div className="text-right">
                                                        <span className="text-[12px] font-bold text-slate-900">
                                                            R$ {(p.stats_financeiros?.faturamento_mes || 0).toLocaleString('pt-BR', { notation: 'compact' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Hover Actions - Floating Style */}
                                                <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-3 group-hover:translate-y-0 duration-300">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); window.location.hash = `#/inbox?chatId=${p.whatsapp_contato?.replace(/\D/g,'')}@s.whatsapp.net`}}
                                                        className="p-2.5 bg-white border border-black/[0.06] text-slate-500 hover:text-indigo-600 rounded-xl shadow-md transition-all hover:shadow-lg active:scale-90"
                                                        title="Chat"
                                                    >
                                                        <MessageSquare size={14}/>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDirectMove(e, p, col.id)}
                                                        className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xl hover:bg-indigo-600 transition-all hover:shadow-indigo-200 active:scale-90"
                                                        title="Avançar"
                                                    >
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {items.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-black/[0.05] rounded-[24px] bg-white/30">
                                                <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow-sm mb-4">
                                                    <CheckCircle2 size={20} className="text-slate-200"/>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Fase Limpa</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Extra space at the end for better scrolling */}
                        <div className="w-20 flex-shrink-0"></div>
                    </div>
                </div>
            </main>
        </div>
    );

};
