
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Usuario, UserRole, EvolutionInstance, Producer, WorkTask } from '../types';
import { db, fieldValue, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { SmartCommandCenter } from '../components/SmartCommandCenter';
import { TimeInStageBadge } from '../components/TimeInStageBadge';
import { 
    Users, Shield, UserPlus, Search, XCircle, Mail, Briefcase, 
    Edit2, ShieldAlert, Smartphone, Building2, GitFork, UserCheck, 
    Save, LayoutList, ZoomIn, ZoomOut, Move, Activity, Wifi, 
    WifiOff, AlertCircle, Loader2, Copy, KeyRound, Check, 
    MoreVertical, Trash2, LogOut, Lock, Eye, Filter, ShieldCheck, ChevronDown, Clock, BarChart2, TrendingUp, DollarSign, ListChecks, Ticket, Target, History
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { AuditService } from '../services/systemServices';
import { useToast } from '../contexts/ToastContext'; 
import { getFirebaseErrorMessage } from '../utils/errorHandling';

import { OrganizationSettings } from '../components/OrganizationSettings';

// Configurações serão carregadas dinamicamente


// --- ELITE COMPONENTS ---

const EliteSelect = ({ 
    label, 
    value, 
    options, 
    onChange, 
    placeholder = "Selecione...",
    icon: LabelIcon 
}: { 
    label: string, 
    value: string, 
    options: { value: string, label: string, subLabel?: string, icon?: any, isAvatar?: boolean, statusColor?: string }[], 
    onChange: (val: string) => void,
    placeholder?: string,
    icon?: any
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                {LabelIcon && <LabelIcon size={12} className="text-brand-600"/>}
                {label}
            </label>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3.5 bg-white border rounded-xl text-sm transition-all shadow-sm ${isOpen ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {selectedOption ? (
                        <>
                            {selectedOption.isAvatar ? (
                                <Avatar src={selectedOption.icon} name={selectedOption.label} alt="" className="w-6 h-6 rounded-full border border-gray-100 flex-shrink-0"/>
                            ) : selectedOption.icon ? (
                                <div className={`p-1 rounded-md bg-gray-50 text-gray-500 flex-shrink-0`}>
                                    {React.createElement(selectedOption.icon, { size: 14 })}
                                </div>
                            ) : null}
                            <div className="flex flex-col items-start truncate">
                                <span className="font-bold text-gray-900 truncate">{selectedOption.label}</span>
                            </div>
                        </>
                    ) : (
                        <span className="text-gray-400 font-medium">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95 origin-top">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left group ${value === opt.value ? 'bg-brand-50 border border-brand-100' : 'hover:bg-gray-50 border border-transparent'}`}
                        >
                            {opt.isAvatar ? (
                                <Avatar src={opt.icon} name={opt.label} alt="" className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"/>
                            ) : opt.icon ? (
                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${value === opt.value ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                    {React.createElement(opt.icon, { size: 16 })}
                                </div>
                            ) : null}
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-bold truncate ${value === opt.value ? 'text-brand-900' : 'text-gray-700'}`}>{opt.label}</span>
                                    {opt.statusColor && <div className={`w-2 h-2 rounded-full ${opt.statusColor} shadow-sm mr-2`}></div>}
                                </div>
                                {opt.subLabel && (
                                    <span className={`text-[10px] truncate block font-medium ${value === opt.value ? 'text-brand-600' : 'text-gray-400'}`}>{opt.subLabel}</span>
                                )}
                            </div>
                            
                            {value === opt.value && <Check size={16} className="text-brand-600"/>}
                        </button>
                    ))}
                    {options.length === 0 && <div className="p-4 text-center text-xs text-gray-400 italic">Nenhuma opção disponível</div>}
                </div>
            )}
        </div>
    );
};

const ActionDropdown = ({ user, onAction }: { user: Usuario, onAction: (action: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`p-2 rounded-xl transition-all duration-200 ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
                <MoreVertical size={18} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="p-1.5 space-y-0.5">
                        <button onClick={() => { onAction('edit'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                            <Edit2 size={14} /> Editar Perfil
                        </button>
                        {user.status === 'pending' && (
                            <button onClick={() => { onAction('copy_invite'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                                <Copy size={14} /> Copiar Convite
                            </button>
                        )}
                        <button onClick={() => { onAction('reset_password'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                            <KeyRound size={14} /> Resetar Senha
                        </button>
                        <button onClick={() => { onAction('view_performance'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                            <Activity size={14} /> Ver Performance
                        </button>
                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                        <button onClick={() => { onAction(user.status === 'inactive' ? 'activate' : 'deactivate'); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold ${user.status === 'inactive' ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'} rounded-xl transition-colors`}>
                            {user.status === 'inactive' ? <Check size={14} /> : <XCircle size={14} />} 
                            {user.status === 'inactive' ? 'Ativar Conta' : 'Desativar Conta'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { useOrganization } from '../hooks/useOrganization';

interface UserRowProps {
    user: Usuario;
    manager?: Usuario;
    linkedInstance?: EvolutionInstance;
    onAction: (action: string, user: Usuario) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, manager, linkedInstance, onAction }) => {
    const { getRoleConfig, getRoleIcon } = useOrganization();
    const roleConfig = getRoleConfig(user.role);
    const RoleIcon = getRoleIcon(roleConfig.iconName);
    
    return (
        <div className="group relative bg-white hover:bg-gray-50/50 rounded-2xl p-4 border border-gray-100 hover:border-brand-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-4 flex-1 min-w-[240px]">
                <div className="relative">
                    <Avatar src={user.avatar} name={user.nome} alt={user.nome} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${user.status === 'active' ? 'bg-green-500' : user.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        {user.status === 'active' && <Check size={8} className="text-white" strokeWidth={4} />}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 text-sm">{user.nome}</h4>
                    <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                </div>
            </div>

            <div className="w-full md:w-48">
                <div className="flex flex-col items-start gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${roleConfig.color}`}>
                        <RoleIcon size={10} />
                        {roleConfig.label}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 pl-1">{user.department || 'Geral'}</span>
                </div>
            </div>

            <div className="w-full md:w-40">
                {linkedInstance ? (
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${linkedInstance.connectionStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <div>
                            <p className="text-xs font-bold text-gray-700">{linkedInstance.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">{linkedInstance.connectionStatus === 'ONLINE' ? 'Conectado' : 'Offline'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400 opacity-60">
                        <WifiOff size={14} />
                        <span className="text-xs font-medium">Sem WhatsApp</span>
                    </div>
                )}
            </div>

            <div className="w-full md:w-40 hidden lg:block">
                {manager ? (
                    <div className="flex items-center gap-2">
                        <Avatar src={manager.avatar} name={manager.nome} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Reporta a</span>
                            <span className="text-xs font-bold text-gray-700">{manager.nome.split(' ')[0]}</span>
                        </div>
                    </div>
                ) : (
                    <span className="text-[10px] text-gray-300 italic font-medium pl-2">Gestão Direta</span>
                )}
            </div>

            <div className="w-full md:w-32 hidden xl:block">
                <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tempo de Resposta</span>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${(user.performance?.avgResponseTime ?? 0) <= 30 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${Math.max(0, 100 - (user.performance?.avgResponseTime ?? 0))}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-black text-gray-700">{(user.performance?.avgResponseTime ?? 0)}m</span>
                    </div>
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <ActionDropdown user={user} onAction={(action) => onAction(action, user)} />
            </div>
        </div>
    );
};

const PerformanceDashboard = ({ metrics, onSelectDetail }: { metrics: any[], onSelectDetail: (m: any) => void }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resumo Global */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl flex items-center gap-4">
                    <div className="p-4 bg-brand-50 text-brand-600 rounded-2xl"><Users size={24}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Clientes</p>
                        <p className="text-2xl font-black text-gray-900">{metrics.reduce((acc, m) => acc + m.clientsCount, 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl flex items-center gap-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Clock size={24}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aguardando</p>
                        <p className="text-2xl font-black text-gray-900">{metrics.reduce((acc, m) => acc + m.waitingClientsCount, 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ListChecks size={24}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tarefas Concluídas</p>
                        <p className="text-2xl font-black text-gray-900">{metrics.reduce((acc, m) => acc + m.tasksCompleted, 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl flex items-center gap-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Clock size={24}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo Médio de Resposta</p>
                        <p className="text-2xl font-black text-gray-900">
                            {Math.round(metrics.reduce((acc, m) => acc + m.avgResponseTime, 0) / (metrics.length || 1))}m
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid de CSs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((cs) => (
                    <motion.div 
                        key={cs.userId}
                        whileHover={{ y: -5 }}
                        className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden group"
                    >
                        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                            <div className="relative">
                                <Avatar src={cs.avatar} name={cs.userName} alt={cs.userName} className="w-14 h-14 rounded-2xl border-2 border-white shadow-md" />
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${cs.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-gray-900 truncate">{cs.userName}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cs.avgResponseTime > 0 && cs.avgResponseTime <= 30 ? 'bg-green-50 text-green-600' : cs.avgResponseTime <= 60 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                        TMR: {cs.avgResponseTime}m
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                                        {cs.slaScore}% SLA
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carteira</p>
                                <p className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    {cs.clientsCount} <span className="text-xs font-medium text-gray-400">clientes</span>
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aguardando</p>
                                <p className="text-lg font-black text-amber-600 flex items-center gap-2">
                                    {cs.waitingClientsCount} <span className="text-xs font-medium text-gray-400">chats</span>
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tarefas</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-black text-gray-900">{cs.tasksCompleted}</p>
                                    <span className="text-xs font-medium text-gray-400">/ {cs.tasksTotal}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Não Lidas</p>
                                <p className="text-lg font-black text-brand-600">{cs.unreadMessagesCount}</p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {cs.lastActive ? `Ativo ${new Date(cs.lastActive).toLocaleTimeString()}` : 'Offline'}
                            </span>
                            <button 
                                onClick={() => onSelectDetail(cs)}
                                className="text-[10px] font-black text-brand-600 hover:underline uppercase tracking-wider"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const UserPerformanceDetail = ({ 
    performance, 
    producers, 
    tasks, 
    onClose 
}: { 
    performance: any, 
    producers: Producer[], 
    tasks: WorkTask[],
    onClose: () => void 
}) => {
    const userProducers = producers.filter(p => p.gerente_conta === performance.userId);
    const userTasks = tasks.filter(t => t.assignedTo?.includes(performance.userId));
    const pendingTasks = userTasks.filter(t => t.status !== 'COMPLETED');
    const [timeline, setTimeline] = useState<any[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);

    useEffect(() => {
        if (!performance.userId) return;
        setIsLoadingTimeline(true);
        // Busca eventos da timeline onde o usuário foi o autor (Collection Group Query)
        const unsub = db.collectionGroup('timeline')
            .where('authorId', '==', performance.userId)
            .orderBy('timestamp', 'desc')
            .limit(30)
            .onSnapshot(snap => {
                try {
                    setTimeline(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    setIsLoadingTimeline(false);
                } catch (err) {
                    console.error("Erro ao processar dados da timeline:", err);
                    setIsLoadingTimeline(false);
                }
            }, err => {
                console.warn("Erro ao buscar timeline do usuário (verifique índices e permissões):", err);
                if (err.message?.includes('permission')) {
                    console.info("Dica: Adicione a regra match /{path=**}/timeline/{eventId} { allow read: if isSignedIn(); } no Firestore.");
                }
                setIsLoadingTimeline(false);
            });
        return () => unsub();
    }, [performance.userId]);

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'STAGE_CHANGE': return <GitFork size={14} className="text-blue-500" />;
            case 'TASK_UPDATE': return <ListChecks size={14} className="text-emerald-500" />;
            case 'NOTE': return <Mail size={14} className="text-amber-500" />;
            default: return <Activity size={14} className="text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#09090b]/60 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col border border-white/20 overflow-hidden max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Avatar src={performance.avatar} name={performance.userName} alt={performance.userName} className="w-20 h-20 rounded-[1.5rem] border-4 border-white shadow-xl" />
                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${performance.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{performance.userName}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] font-bold px-3 py-1 bg-brand-50 text-brand-600 rounded-lg uppercase tracking-widest border border-brand-100">
                                    {performance.role || 'Colaborador'}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Clock size={12} />
                                    {performance.lastActive ? `Atividade: ${new Date(performance.lastActive).toLocaleTimeString()}` : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all">
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Content - Grid Layout */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#FAFAFA]">
                    <div className="grid grid-cols-12 gap-8">
                        
                        {/* Left Column: Metrics & Clients */}
                        <div className="col-span-12 lg:col-span-7 space-y-8">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo Médio de Resposta</p>
                                            <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Clock size={16}/></div>
                                        </div>
                                        <p className={`text-3xl font-black ${(performance.avgResponseTime ?? 0) <= 30 ? 'text-green-600' : 'text-amber-600'}`}>{performance.avgResponseTime ?? 0}m</p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-1">SLA Histórico: {performance.slaScore ?? 100}%</p>
                                    </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atendimento</p>
                                        <div className="p-2 bg-brand-50 text-brand-600 rounded-xl"><Mail size={16}/></div>
                                    </div>
                                    <p className="text-3xl font-black text-brand-600">{performance.unreadMessagesCount}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1">Mensagens não lidas</p>
                                </div>
                            </div>

                            {/* Producers List */}
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        Clientes sob Gestão
                                        <span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px]">{userProducers.length}</span>
                                    </h3>
                                </div>
                                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {userProducers.length > 0 ? userProducers.map(p => (
                                        <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all group">
                                            <Avatar src={p.foto_url} name={p.nome_display} alt={p.nome_display} className="w-10 h-10 rounded-xl" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{p.nome_display}</p>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{p.produto_principal}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase">
                                                    {p.onboarding_stage?.replace('_', ' ') || 'ATIVO'}
                                                </span>
                                                <TimeInStageBadge statusUpdatedAt={p.tracking_metadata?.entered_stage_at} className="scale-75 origin-right" />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-12 text-center text-gray-400 text-xs font-medium italic">
                                            Nenhum cliente vinculado.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Tasks & Activity */}
                        <div className="col-span-12 lg:col-span-5 space-y-8">
                            {/* Pending Tasks */}
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        Tarefas Pendentes
                                        <span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-[10px]">{pendingTasks.length}</span>
                                    </h3>
                                </div>
                                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {pendingTasks.length > 0 ? pendingTasks.map(t => (
                                        <div key={t.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-start gap-4 group hover:bg-white hover:shadow-md transition-all">
                                            <div className={`p-2 rounded-xl mt-0.5 ${t.priority === 'CRITICAL' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <ListChecks size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 leading-tight">{t.title}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                                                        <Clock size={10}/> {new Date(t.dueDate).toLocaleDateString()}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase ${t.priority === 'CRITICAL' ? 'text-red-500' : 'text-gray-400'}`}>{t.priority}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="p-12 text-center text-gray-400 text-xs font-medium italic">
                                            Sem tarefas pendentes.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timeline History */}
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        Linha do Tempo de Atividades
                                        <History size={14} className="text-gray-400" />
                                    </h3>
                                </div>
                                <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {isLoadingTimeline ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Loader2 size={24} className="text-brand-500 animate-spin" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Carregando histórico...</p>
                                        </div>
                                    ) : timeline.length > 0 ? (
                                        <div className="relative space-y-8 before:absolute before:inset-0 before:left-[11px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-100 before:via-gray-200 before:to-transparent">
                                            {timeline.map((event, idx) => (
                                                <div key={event.id} className="relative flex items-start gap-4 group">
                                                    <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-gray-100 z-10 shadow-sm group-hover:border-brand-200 transition-all shrink-0 mt-0.5">
                                                        {getEventIcon(event.type)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                {event.type?.replace('_', ' ')}
                                                            </p>
                                                            <span className="text-[9px] font-bold text-gray-300">
                                                                {new Date(event.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-700 leading-relaxed">
                                                            {event.content}
                                                        </p>
                                                        {event.authorName && (
                                                            <p className="text-[9px] font-bold text-brand-500 uppercase mt-1.5">
                                                                {event.authorName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-gray-400 text-xs font-medium italic">
                                            Nenhum registro de atividade encontrado.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const Pipeline360 = ({ producers, onSelect }: { producers: Producer[], onSelect: (p: Producer) => void }) => {
    return null;
};

interface UserNode extends Usuario {
    children: UserNode[];
}

const OrgNode: React.FC<{ node: UserNode; level?: number }> = ({ node, level = 0 }) => {
    const hasChildren = node.children && node.children.length > 0;
    const { getRoleConfig } = useOrganization();
    const roleConfig = getRoleConfig(node.role);

    return (
        <div className="flex flex-col items-center relative px-4">
            <div className={`relative z-10 w-64 bg-white rounded-2xl border hover:shadow-xl transition-all duration-300 group ${node.status === 'inactive' ? 'opacity-60 grayscale border-gray-200' : 'border-gray-200 hover:border-brand-300 shadow-sm'}`}>
                {level > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-300"></div>
                )}
                
                <div className="p-4 flex items-center gap-4">
                    <div className="relative">
                        <Avatar src={node.avatar} name={node.nome} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${node.status === 'active' ? 'bg-green-500' : node.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                            {node.role === 'admin' && <Shield size={8} className="text-white"/>}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{node.nome}</h4>
                        <p className="text-xs text-gray-500 truncate">{node.department || 'Geral'}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-1 ${roleConfig.color}`}>
                            {roleConfig.label}
                        </span>
                    </div>
                </div>

                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        {hasChildren ? <Users size={10}/> : <UserCheck size={10}/>} 
                        {hasChildren ? `${node.children.length} liderados` : 'Membro'}
                    </span>
                    <button onClick={() => window.location.hash = `#/admin?edit=${node.id}`} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-brand-600 transition-colors">
                        <Edit2 size={12}/>
                    </button>
                </div>
            </div>

            {hasChildren && (
                <>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <div className="flex relative">
                        {node.children.length > 1 && (
                            <div className="absolute top-0 left-[calc(50%/var(--child-count))] right-[calc(50%/var(--child-count))] h-0.5 bg-gray-300"></div>
                        )}
                        <div className="flex gap-4 pt-0" style={{ '--child-count': node.children.length } as any}>
                            {node.children.map(child => (
                                <OrgNode key={child.id} node={child} level={level + 1} />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export const AdminPanel: React.FC = () => {
    const { addToast } = useToast();
    const { roles, departments, getRoleConfig, getRoleIcon } = useOrganization();
    const [users, setUsers] = useState<Usuario[]>([]);
    const [instances, setInstances] = useState<EvolutionInstance[]>([]); 
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('TODOS');
    const [viewMode, setViewMode] = useState<'LIST' | 'CHART' | 'PERFORMANCE' | 'SETTINGS'>('LIST');
    const [producers, setProducers] = useState<Producer[]>([]);
    const [tasks, setTasks] = useState<WorkTask[]>([]);
    const [allChats, setAllChats] = useState<any[]>([]);
    const [permissionError, setPermissionError] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<Usuario>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [inviteData, setInviteData] = useState<{ code: string, email: string, name: string } | null>(null);

    useEffect(() => {
        const unsubUsers = db.collection('users').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as Usuario));
            setUsers(data);
            setLoading(false);
            setPermissionError(false);
        }, (error) => {
            console.error("Erro de permissão ao carregar usuários:", error);
            if (error.code === 'permission-denied') {
                setPermissionError(true);
            }
            setLoading(false);
        });

        const unsubInstances = db.collection('instances').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvolutionInstance));
            setInstances(data);
        }, (error) => {
            console.warn("Erro ao carregar instâncias:", error);
        });

        const unsubProducers = db.collection('producers').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producer));
            setProducers(data);
        });

        const unsubTasks = db.collection('tasks').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkTask));
            setTasks(data);
        });

        // Listener Global para Chats (Collection Group) para métricas reais de SLA
        const unsubAllChats = db.collectionGroup('chats').onSnapshot(snapshot => {
            try {
                const data = snapshot.docs.map(doc => {
                    const parentDoc = doc.ref.parent.parent;
                    return { 
                        id: doc.id, 
                        ...doc.data(),
                        instanceId: parentDoc ? parentDoc.id : null // Captura o ID da instância pai com segurança
                    };
                });
                setAllChats(data);
            } catch (err) {
                console.error("Erro ao processar dados de chats globais:", err);
            }
        }, (error) => {
            console.warn("Erro ao carregar chats globais (verifique índices e permissões):", error);
            if (error.message?.includes('permission')) {
                console.info("Dica: Adicione a regra match /{path=**}/chats/{chatId} { allow read: if isSignedIn(); } no Firestore.");
            }
        });

        return () => {
            unsubUsers();
            unsubInstances();
            unsubProducers();
            unsubTasks();
            unsubAllChats();
        };
    }, []);

    const [selectedUserPerformance, setSelectedUserPerformance] = useState<any | null>(null);

    // CS Performance Metrics Calculation (100% REAL DATA)
    const csPerformance = useMemo(() => {
        return users.map(user => {
            const userProducers = producers.filter(p => p.gerente_conta === user.id);
            const userTasks = tasks.filter(t => t.assignedTo?.includes(user.id));
            const completedTasks = userTasks.filter(t => t.status === 'COMPLETED');
            
            // Chats da instância vinculada ao CS (Real-time Snapshot)
            const userChats = allChats.filter(c => c.instanceId === user.linkedInstanceId);
            const unreadCount = userChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
            const waitingChats = userChats.filter(c => (c.unreadCount > 0));

            // Métricas Históricas Persistidas (Se não houver dados, mostra 100% como default positivo)
            const perf = user.performance || { slaScore: 100, avgResponseTime: 0 };

            return {
                userId: user.id,
                userName: user.nome,
                avatar: user.avatar,
                status: user.status === 'active' ? 'online' : 'offline',
                slaScore: perf.slaScore || 0,
                avgResponseTime: perf.avgResponseTime || 0,
                clientsCount: userProducers.length,
                waitingClientsCount: waitingChats.length,
                unreadMessagesCount: unreadCount,
                tasksTotal: userTasks.length,
                tasksCompleted: completedTasks.length,
                lastActive: user.lastActive
            };
        });
    }, [users, producers, tasks, allChats]);

    // Stats Calculation
    const stats = useMemo(() => {
        const total = users.length;
        const active = users.filter(u => u.status === 'active').length;
        const connected = instances.filter(i => i.connectionStatus === 'ONLINE').length;
        const avgResponseTime = Math.round(csPerformance.reduce((acc, p) => acc + p.avgResponseTime, 0) / (csPerformance.length || 1));

        return { total, active, connected, avgResponseTime };
    }, [users, instances, csPerformance]);

    // Filter Logic
    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDepartment === 'TODOS' || u.department === selectedDepartment;
        return matchesSearch && matchesDept;
    });

    // Safe Recursive Tree Builder with Cycle Detection
    const userTree = useMemo(() => {
        const visited = new Set<string>();
        const maxDepth = 10; // Safety brake

        const buildTree = (managerId: string | null, depth: number): UserNode[] => {
            if (depth > maxDepth) return [];
            
            return users
                .filter(u => {
                    if (visited.has(u.id)) return false; // Prevent cycles
                    // Match manager or root
                    return (u.managerId === managerId) || (!managerId && !u.managerId);
                })
                .map(u => {
                    visited.add(u.id);
                    return {
                        ...u,
                        children: buildTree(u.id, depth + 1)
                    };
                });
        };

        // Reset visited for each root calculation attempt
        // Note: Real hierarchy allows multiple roots but distinct branches. 
        // We need to build from roots down.
        
        const allIds = new Set(users.map(u => u.id));
        const rootUsers = users.filter(u => !u.managerId || !allIds.has(u.managerId));
        
        return rootUsers.map(root => {
            visited.add(root.id);
            return {
                ...root,
                children: buildTree(root.id, 1)
            };
        });
    }, [users]);

    const availableManagers = users.filter(u => ['admin', 'cs_manager'].includes(u.role));

    const handleUserAction = async (action: string, user: Usuario) => {
        if (action === 'edit') {
            handleOpenEdit(user);
        } else if (action === 'copy_invite') {
            if (user.inviteCode) {
                const text = `👋 Olá ${user.nome}!\n\nVocê foi convidado para o *B4You Hub*.\n\n🔗 Acesse: ${window.location.origin}\n🔑 Clique em *"Ativar Conta"* e use o código:\n\n*${user.inviteCode}*\n\n📧 Email: ${user.email}`;
                navigator.clipboard.writeText(text);
                addToast({ type: 'success', message: 'Convite copiado! Envie para o colaborador.' });
            } else {
                addToast({ type: 'error', message: 'Código de convite não encontrado.' });
            }
        } else if (action === 'deactivate') {
            try {
                await db.collection('users').doc(user.id).update({ status: 'inactive' });
                addToast({ type: 'success', message: 'Conta desativada com sucesso.' });
            } catch (error) {
                addToast({ type: 'error', message: 'Erro ao desativar conta.' });
            }
        } else if (action === 'activate') {
            try {
                await db.collection('users').doc(user.id).update({ status: 'active' });
                addToast({ type: 'success', message: 'Conta ativada com sucesso.' });
            } catch (error) {
                addToast({ type: 'error', message: 'Erro ao ativar conta.' });
            }
        } else if (action === 'view_performance') {
            setViewMode('PERFORMANCE');
            const perf = csPerformance.find(p => p.userId === user.id);
            if (perf) {
                setSelectedUserPerformance(perf);
            } else {
                addToast({ type: 'info', message: 'Sem dados de performance para este usuário.' });
            }
        } else if (action === 'reset_password') {
            try {
                await sendPasswordResetEmail(auth, user.email);
                addToast({ type: 'success', message: `E-mail de redefinição de senha enviado para ${user.email}.` });
            } catch (error: any) {
                console.error("Erro ao enviar e-mail de redefinição:", error);
                addToast({ type: 'error', message: getFirebaseErrorMessage(error) });
            }
        }
    };

    const handleOpenEdit = (user?: Usuario) => {
        if (user) {
            setEditingUser({ ...user });
        } else {
            setEditingUser({
                role: 'hunter',
                status: 'pending',
                department: 'Comercial'
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser.nome || !editingUser.email) {
            addToast({ type: 'error', message: 'Nome e Email são obrigatórios.' });
            return;
        }

        setIsSaving(true);
        try {
            if (editingUser.id) {
                // Update existing
                await db.collection('users').doc(editingUser.id).update(editingUser);
                addToast({ type: 'success', message: 'Perfil atualizado com sucesso.' });
                setIsEditModalOpen(false);
            } else {
                // Create new (Invite Flow)
                // Check if email already exists
                const check = await db.collection('users').where('email', '==', editingUser.email).get();
                if (!check.empty) {
                    addToast({ type: 'error', message: 'Este email já está em uso.' });
                    setIsSaving(false);
                    return;
                }

                const inviteCode = `B4-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                const newId = inviteCode; // Use invite code as document ID for secure retrieval
                
                await db.collection('users').doc(newId).set({
                    ...editingUser,
                    id: newId,
                    inviteCode,
                    status: 'pending',
                    createdAt: fieldValue.serverTimestamp(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(editingUser.nome)}&background=random`
                });

                setInviteData({
                    code: inviteCode,
                    email: editingUser.email!,
                    name: editingUser.nome!
                });
                
                AuditService.logAction('USER_INVITE', newId, 'users', { inviteCode, email: editingUser.email });
                setIsEditModalOpen(false);
            }
        } catch (error: any) {
            console.error(error);
            addToast({ type: 'error', message: getFirebaseErrorMessage(error) });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyInvite = () => {
        if (!inviteData) return;
        const text = `👋 Olá ${inviteData.name}!\n\nVocê foi convidado para o *B4You Hub*.\n\n🔗 Acesse: ${window.location.origin}\n🔑 Clique em *"Ativar Conta"* e use o código:\n\n*${inviteData.code}*\n\n📧 Email: ${inviteData.email}`;
        navigator.clipboard.writeText(text);
        addToast({ type: 'success', message: 'Convite copiado! Envie para o colaborador.' });
        setInviteData(null);
    };

    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <ShieldAlert size={48} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito ao Banco de Dados</h2>
                <p className="text-gray-600 max-w-md mb-6">
                    O sistema não conseguiu carregar a lista de usuários. Isso geralmente ocorre quando as 
                    <strong> Regras de Segurança do Firestore</strong> não foram atualizadas.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto space-y-8 pb-20 animate-in fade-in duration-500 px-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">Gestão de Acessos</h1>
                    <p className="text-gray-500 font-medium mt-1">Gerencie a equipe, cargos, hierarquia e conexões.</p>
                </div>
                <div className="flex gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-1 flex shadow-sm">
                            <button onClick={() => setViewMode('LIST')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'LIST' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutList size={14}/> Lista</button>
                            <button onClick={() => setViewMode('CHART')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'CHART' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><GitFork size={14}/> Organograma</button>
                            <button onClick={() => setViewMode('PERFORMANCE')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'PERFORMANCE' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><Activity size={14}/> Performance</button>
                            <button onClick={() => setViewMode('SETTINGS')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'SETTINGS' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><Shield size={14}/> Cargos</button>
                        </div>
                    <button onClick={() => handleOpenEdit()} className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-brand-200 hover:-translate-y-0.5 group text-xs"><UserPlus size={16}/> Adicionar Usuário</button>
                </div>
            </div>

            {/* Content Switch */}
            <div className="min-h-[500px]">
                {viewMode === 'LIST' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl"><Users size={20}/></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Colaboradores</p>
                                    <p className="text-xl font-black text-gray-900">{stats.total}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={20}/></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ativos Agora</p>
                                    <p className="text-xl font-black text-gray-900">{stats.active}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Smartphone size={20}/></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WhatsApps ON</p>
                                    <p className="text-xl font-black text-gray-900">{stats.connected}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Clock size={20}/></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TMR Global</p>
                                    <p className="text-xl font-black text-gray-900">{stats.avgResponseTime}m</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters & List */}
                        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
                             <div className="relative w-full md:w-80 group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input type="text" placeholder="Buscar por nome ou email..." className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            
                            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                <button 
                                    onClick={() => setSelectedDepartment('TODOS')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedDepartment === 'TODOS' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    Todos
                                </button>
                                {departments.map(dept => (
                                    <button 
                                        key={dept}
                                        onClick={() => setSelectedDepartment(dept)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${selectedDepartment === dept ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse"></div>) : 
                                filteredUsers.map(user => (
                                    <UserRow key={user.id} user={user} manager={users.find(u => u.id === user.managerId)} linkedInstance={instances.find(i => i.id === user.linkedInstanceId)} onAction={handleUserAction} />
                                ))
                            }
                        </div>
                    </div>
                )}

                {viewMode === 'CHART' && (
                    <div className="bg-[#F8FAFC] rounded-3xl border border-gray-200 shadow-inner overflow-hidden h-[700px] relative flex flex-col">
                        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomIn size={18}/></button>
                            <button onClick={() => setZoom(1)} className="p-2 hover:bg-gray-100 rounded text-gray-500"><Move size={18}/></button>
                            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-2 hover:bg-gray-100 rounded text-gray-500"><ZoomOut size={18}/></button>
                        </div>
                        <div className="flex-1 overflow-auto p-10 cursor-grab active:cursor-grabbing flex justify-center items-start custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-50">
                            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }} className="flex gap-12 pt-10">
                                {userTree.map(rootNode => (<OrgNode key={rootNode.id} node={rootNode} />))}
                                {userTree.length === 0 && <div className="text-center text-gray-400 mt-20">Nenhuma hierarquia definida.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'PERFORMANCE' && (
                    <PerformanceDashboard 
                        metrics={csPerformance} 
                        onSelectDetail={setSelectedUserPerformance}
                    />
                )}

                {viewMode === 'SETTINGS' && (
                    <OrganizationSettings />
                )}
            </div>

            <AnimatePresence>
                {selectedUserPerformance && (
                    <UserPerformanceDetail 
                        performance={selectedUserPerformance}
                        producers={producers}
                        tasks={tasks}
                        onClose={() => setSelectedUserPerformance(null)}
                    />
                )}
            </AnimatePresence>

            {/* Modal de Edição/Criação */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090b]/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    {editingUser.id ? <Edit2 size={20} className="text-brand-600"/> : <UserPlus size={20} className="text-brand-600"/>}
                                    {editingUser.id ? 'Editar Perfil' : 'Novo Colaborador'}
                                </h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    {editingUser.id ? 'Atualize as informações de acesso.' : 'Preencha os dados para gerar o convite.'}
                                </p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><XCircle size={20}/></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar bg-[#FAFAFA]">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Nome Completo</label>
                                    <input autoFocus type="text" value={editingUser.nome || ''} onChange={e => setEditingUser({...editingUser, nome: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-gray-300" placeholder="Ex: Ana Silva" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Email Corporativo</label>
                                    <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-gray-300" placeholder="ana@b4you.com.br" disabled={!!editingUser.id && editingUser.status === 'active'} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <EliteSelect 
                                    label="Cargo / Função"
                                    value={editingUser.role || 'hunter'}
                                    options={roles.map(r => ({ value: r.id, label: r.label, icon: getRoleIcon(r.iconName), statusColor: r.badgeColor.replace('bg-', 'bg-') }))}
                                    onChange={(val) => setEditingUser({...editingUser, role: val as any})}
                                />
                                <EliteSelect 
                                    label="Departamento"
                                    value={editingUser.department || 'Comercial'}
                                    options={departments.map(d => ({ value: d, label: d, icon: Building2 }))}
                                    onChange={(val) => setEditingUser({...editingUser, department: val})}
                                />
                            </div>

                            <EliteSelect 
                                label="Gestor Responsável"
                                value={editingUser.managerId || ''}
                                options={[{ value: '', label: 'Sem Gestor', icon: Shield }, ...availableManagers.map(u => ({ value: u.id, label: u.nome, subLabel: u.role, icon: u.avatar, isAvatar: true }))]}
                                onChange={(val) => setEditingUser({...editingUser, managerId: val})}
                                placeholder="Selecione um gestor..."
                            />
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-white flex gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs uppercase tracking-wide">Cancelar</button>
                            <button onClick={handleSaveUser} disabled={isSaving} className="flex-[2] py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-xs uppercase tracking-wide">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
                                {editingUser.id ? 'Salvar Alterações' : 'Gerar Convite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Convite Gerado */}
            {inviteData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-white/20 overflow-hidden text-center p-8">
                        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-brand-100">
                            <Ticket size={40} className="text-brand-600"/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">Convite Gerado!</h2>
                        <p className="text-sm text-gray-500 font-medium mb-8 px-4">
                            Envie o código abaixo para <strong>{inviteData.name}</strong> ativar a conta.
                        </p>

                        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8 relative group">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Código de Ativação</p>
                            <p className="text-4xl font-black text-gray-900 tracking-widest font-mono">{inviteData.code}</p>
                            <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] rounded-2xl cursor-pointer" onClick={handleCopyInvite}>
                                <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                                    <Copy size={12}/> Clique para Copiar
                                </span>
                            </div>
                        </div>

                        <button onClick={handleCopyInvite} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide transform hover:-translate-y-1">
                            <Copy size={18}/> Copiar e Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
