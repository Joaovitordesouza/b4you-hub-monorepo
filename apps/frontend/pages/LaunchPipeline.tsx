
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Producer, Launch, LaunchStatus, Usuario } from '../types';
import { 
    Rocket, TestTube, CheckCircle2, Play, Flag, BarChart3,
    Search, ChevronRight, MoreHorizontal, Activity, AlertTriangle,
    Clock, Zap, DollarSign, TrendingUp
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db, fieldValue, auth } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { LaunchDetailsModal } from '../components/LaunchDetailsModal';
import { LaunchDetailView } from '../components/LaunchDetailView';
import { LaunchTransitionGuard } from '../components/LaunchTransitionGuard';

// Configuração das Colunas de Lançamento
const COLUMNS: { id: LaunchStatus; label: string; icon: any; color: string; bg: string; border: string; accent: string; description: string }[] = [
    { id: 'PRE_LANCAMENTO', label: 'Pré-Lançamento', icon: Rocket, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-500', description: 'Planejamento e setup inicial.' },
    { id: 'EM_TESTE', label: 'Em Teste', icon: TestTube, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', description: 'QA e validação técnica.' },
    { id: 'APROVADO', label: 'Aprovado', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', description: 'Tudo pronto para o play.' },
    { id: 'AO_VIVO', label: 'Ao Vivo', icon: Play, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', description: 'Carrinho aberto e monitoramento.' },
    { id: 'FINALIZADO', label: 'Finalizado', icon: Flag, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', accent: 'bg-slate-500', description: 'Carrinho fechado.' },
    { id: 'POS_ANALISE', label: 'Pós-Análise', icon: BarChart3, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', description: 'Debriefing e apuração.' },
];

interface Props {
    producers: Producer[];
}


const CalendarView = ({ launches, producers, onLaunchClick }: { launches: Launch[], producers: Producer[], onLaunchClick: (launch: Launch) => void }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const getLaunchesForDay = (day: number) => {
        return launches.filter(l => {
            const date = new Date(l.openDate);
            return date.getDate() === day && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
        });
    }

    return (
        <div className="h-full bg-white p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Anterior</button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Próximo</button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="text-center font-bold text-gray-500">{day}</div>)}
                {emptyDays.map(d => <div key={d} />)}
                {days.map(day => {
                    const dayLaunches = getLaunchesForDay(day);
                    return (
                        <div key={day} className="border border-gray-200 p-2 h-32 overflow-y-auto rounded-lg">
                            <div className="font-bold text-gray-700">{day}</div>
                            {dayLaunches.map(l => (
                                <div key={l.id} onClick={() => onLaunchClick(l)} className="text-xs bg-indigo-100 text-indigo-700 p-1 mb-1 rounded cursor-pointer truncate hover:bg-indigo-200">
                                    {l.productName}
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export const LaunchPipeline: React.FC<Props> = ({ producers }) => {
    const { addToast } = useToast();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'KANBAN' | 'CALENDAR'>('KANBAN');
    const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transitionGuard, setTransitionGuard] = useState<{ launch: Launch; targetStatus: LaunchStatus } | null>(null);

    useEffect(() => {
        const unsubLaunches = db.collection('launches').onSnapshot(snap => {
            setLaunches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Launch)));
        });
        const unsubUsers = db.collection('users').onSnapshot(snap => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario)));
        });
        return () => { unsubLaunches(); unsubUsers(); };
    }, []);

    const stats = useMemo(() => {
        const totalCount = launches.length;
        const approvedCount = launches.filter(l => l.status === 'APROVADO').length;
        const liveCount = launches.filter(l => l.status === 'AO_VIVO').length;

        return { totalCount, approvedCount, liveCount };
    }, [launches]);

    const handleSaveLaunch = async (data: Partial<Launch>) => {
        try {
            const now = new Date().toISOString();
            
            // Lógica de Alerta Automático (Short Notice)
            if (data.openDate && data.notifiedAt) {
                const open = new Date(data.openDate);
                const notified = new Date(data.notifiedAt);
                const diffDays = Math.ceil((open.getTime() - notified.getTime()) / (1000 * 60 * 60 * 24));
                data.isShortNotice = diffDays < 5;
            }

            if (data.id) {
                await db.collection('launches').doc(data.id).update({
                    ...data,
                    updatedAt: now
                });
                addToast({ message: 'Lançamento atualizado com sucesso', type: 'success' });
            } else {
                await db.collection('launches').add({
                    ...data,
                    createdAt: now,
                    updatedAt: now
                });
                addToast({ message: 'Novo lançamento registrado', type: 'success' });
            }
            setIsModalOpen(false);
            setSelectedLaunch(null);
        } catch (err) {
            console.error(err);
            addToast({ message: 'Erro ao salvar lançamento', type: 'error' });
        }
    };

    const handleConfirmTransition = async (note: string, updatedTests?: Launch['tests']) => {
        if (!transitionGuard) return;
        const { launch, targetStatus } = transitionGuard;

        try {
            const updateData: any = {
                status: targetStatus,
                updatedAt: new Date().toISOString(),
                statusHistory: [
                    ...(launch.statusHistory || []),
                    {
                        from: launch.status,
                        to: targetStatus,
                        timestamp: new Date().toISOString(),
                        userId: auth.currentUser?.uid || 'system',
                        note
                    }
                ]
            };
            if (updatedTests) updateData.tests = updatedTests;

            await db.collection('launches').doc(launch.id).update(updateData);
            addToast({ message: `Status atualizado para ${targetStatus}`, type: 'success' });
        } catch (err) {
            addToast({ message: 'Erro ao atualizar status', type: 'error' });
        } finally {
            setTransitionGuard(null);
        }
    };

    const handleDrop = async (e: React.DragEvent, status: LaunchStatus) => {
        e.preventDefault();
        const launchId = e.dataTransfer.getData('launchId');
        const launch = launches.find(l => l.id === launchId);
        
        if (launch && launch.status !== status) {
            setTransitionGuard({ launch, targetStatus: status });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#F2F2F7] overflow-hidden">
            {isModalOpen && (
                selectedLaunch ? (
                    <LaunchDetailView 
                        launch={selectedLaunch}
                        producers={producers}
                        users={users}
                        onClose={() => { setIsModalOpen(false); setSelectedLaunch(null); }}
                        onSave={handleSaveLaunch}
                    />
                ) : (
                    <LaunchDetailsModal 
                        launch={null}
                        producers={producers}
                        users={users}
                        onClose={() => { setIsModalOpen(false); setSelectedLaunch(null); }}
                        onSave={handleSaveLaunch}
                    />
                )
            )}

            {transitionGuard && (
                <LaunchTransitionGuard 
                    launch={transitionGuard.launch}
                    targetStatus={transitionGuard.targetStatus}
                    onClose={() => setTransitionGuard(null)}
                    onConfirm={handleConfirmTransition}
                />
            )}

            {/* Header Estratégico - Elite Apple Style */}
            <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-2xl border-b border-black/[0.08] px-8 py-5">
                <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central de Lançamento</h1>
                        </div>

                        {/* Strategic Stats Bar */}
                        <div className="hidden xl:flex items-center gap-1 bg-black/[0.04] p-1 rounded-2xl border border-black/[0.02]">
                            <div className="px-4 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white transition-all cursor-default group">
                                <Rocket size={14} className="text-indigo-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">
                                        {stats.totalCount}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                            <div className="w-px h-4 bg-black/[0.1]"></div>
                            <div className="px-4 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white transition-all cursor-default group">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{stats.approvedCount}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aprovado</span>
                                </div>
                            </div>
                            <div className="w-px h-4 bg-black/[0.1]"></div>
                            <div className="px-4 py-2 rounded-xl flex items-center gap-2.5 hover:bg-white transition-all cursor-default group">
                                <Play size={14} className="text-rose-500" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{stats.liveCount}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ao Vivo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 w-full lg:w-auto">
                        <div className="relative group flex-1 lg:flex-none">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                            <input 
                                type="text" 
                                placeholder="Buscar lançamento..." 
                                className="pl-11 pr-5 py-2.5 bg-black/[0.04] border border-black/[0.02] rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/30 focus:ring-8 focus:ring-indigo-500/[0.04] transition-all w-full lg:w-72 placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => setViewMode(viewMode === 'KANBAN' ? 'CALENDAR' : 'KANBAN')}
                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-indigo-100 text-indigo-700' : 'bg-black/[0.04] text-slate-600'}`}
                        >
                            {viewMode === 'KANBAN' ? 'Calendário' : 'Kanban'}
                        </button>
                        <button 
                            onClick={() => { setSelectedLaunch(null); setIsModalOpen(true); }}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                        >
                            Novo Lançamento
                        </button>
                    </div>
                </div>
            </header>

            {/* Kanban Board */}
            <main className="flex-1 overflow-hidden relative">
                {viewMode === 'KANBAN' ? (
                    <>
                        <div 
                            className="h-full overflow-x-auto overflow-y-hidden px-8 py-10 custom-scrollbar"
                        >
                            <div className="h-full flex space-x-8 min-w-max">
                                {COLUMNS.map(col => {
                                    const items = launches.filter(l => l.status === col.id);
                                    
                                    return (
                                        <div 
                                            key={col.id}
                                            className="w-[320px] flex-shrink-0 flex flex-col bg-slate-100/50 rounded-[28px] border border-slate-200/60 overflow-hidden"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, col.id)}
                                        >
                                            {/* Column Header */}
                                            <div className="p-5 px-6 flex items-center justify-between bg-white/60 backdrop-blur-sm border-b border-slate-200/60">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${col.accent} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                                                    <h3 className="font-semibold text-slate-800 text-[13px] tracking-tight">{col.label}</h3>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                                        {items.length}
                                                    </span>
                                                </div>
                                                <button className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-200/50 rounded-lg">
                                                    <MoreHorizontal size={14} />
                                                </button>
                                            </div>

                                            {/* Cards List */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar-thin">
                                                {items.map(launch => {
                                                    const producer = producers.find(p => p.id === launch.producerId);
                                                    const isRisk = launch.isShortNotice && launch.status === 'PRE_LANCAMENTO';
                                                    
                                                    return (
                                                        <div
                                                            key={launch.id}
                                                            draggable
                                                            onDragStart={(e) => e.dataTransfer.setData('launchId', launch.id)}
                                                            onClick={() => { setSelectedLaunch(launch); setIsModalOpen(true); }}
                                                            className={`group relative bg-white p-5 rounded-[20px] border ${isRisk ? 'border-rose-500/30' : 'border-slate-200/60'} shadow-sm hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:border-indigo-500/30 hover:-translate-y-1 cursor-pointer active:scale-[0.98] overflow-hidden`}
                                                        >
                                                            {isRisk && (
                                                                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-pulse"></div>
                                                            )}

                                                            <div className="flex items-center gap-4 mb-4">
                                                                <Avatar src={producer?.foto_url} name={producer?.nome_display || 'P'} alt={producer?.nome_display || 'P'} className="w-10 h-10 rounded-[12px] border border-slate-100 shadow-sm" />
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-[13px] font-semibold text-slate-900 truncate tracking-tight">{launch.productName}</h4>
                                                                    <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider mt-0.5">
                                                                        {producer?.nome_display}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                                {launch.priority === 'CRITICA' && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-100 uppercase">Crítica</span>
                                                                )}
                                                                {launch.volumeExpectation === 'PICO' && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-100 uppercase">Pico</span>
                                                                )}
                                                                {launch.isStrategicMonth && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 uppercase">Estratégico</span>
                                                                )}
                                                            </div>

                                                            <div className="bg-slate-50 p-3 rounded-[16px] border border-slate-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={12} className="text-slate-400" />
                                                                    <span className="text-[11px] font-semibold text-slate-600">
                                                                        {new Date(launch.openDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Zap size={12} className="text-amber-500" />
                                                                    <span className="text-[11px] font-bold text-slate-900">
                                                                        R$ {(launch.revenueGoal || 0).toLocaleString('pt-BR', { notation: 'compact' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {items.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 mb-2"></div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vazio</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <CalendarView 
                        launches={launches} 
                        producers={producers} 
                        onLaunchClick={(launch) => { setSelectedLaunch(launch); setIsModalOpen(true); }}
                    />
                )}
            </main>
        </div>
    );
};
