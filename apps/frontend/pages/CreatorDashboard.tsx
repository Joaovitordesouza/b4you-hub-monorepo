
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Producer, ProducerStage, Usuario, WorkTask, TimelineEvent, TaskStatus, Launch, HealthStatus } from '../types';
import { db, auth, fieldValue } from '../firebase';
import { 
    AlertCircle, Search, X, Plus,  
    TrendingUp, TrendingDown, Activity, 
    LayoutGrid, List, Filter, ArrowUpRight, 
    Users, DollarSign, Wallet, ShieldAlert,
    BarChart3, MoreHorizontal, Briefcase,
    ChevronRight, ChevronLeft, ArrowRight, Smartphone,
    FileText, CheckSquare, Clock, Paperclip,
    Send, Save, Edit2, Mail, Instagram,
    Calendar, CheckCircle2, AlertTriangle, Link as LinkIcon, DownloadCloud, Trash2, Globe,
    Check, Rocket, Database, SlidersHorizontal, UserPlus, Loader2, UploadCloud, Layers, User,
    CreditCard, Layout, Sparkles, MoreVertical, MessageSquare, Flag, ExternalLink,
    PlayCircle, PauseCircle, StopCircle, RefreshCw, Link2, History, AtSign, MessageCircle, CalendarDays,
    StickyNote, Zap, Eye, CheckCircle, ChevronDown, Radio, Radar, HeartPulse, XCircle, ShieldCheck
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useMedia } from '../hooks/useMedia';
import { SmartCommandCenter } from '../components/SmartCommandCenter';

interface Props {
  leads: any[]; 
  producers?: Producer[];
}

const HEALTH_COLUMNS: { id: HealthStatus; label: string; color: string; bg: string; icon: any; border: string, accent: string }[] = [
    { id: 'SAUDAVEL', label: 'Saudável', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: HeartPulse, border: 'border-emerald-200', accent: 'bg-emerald-500' },
    { id: 'ATENCAO', label: 'Em Atenção', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle, border: 'border-amber-200', accent: 'bg-amber-500' },
    { id: 'RISCO', label: 'Risco de Churn', color: 'text-orange-700', bg: 'bg-orange-50', icon: TrendingUp, border: 'border-orange-200', accent: 'bg-orange-500' },
    { id: 'CHURN', label: 'Churn Confirmado', color: 'text-rose-700', bg: 'bg-rose-50', icon: XCircle, border: 'border-rose-200', accent: 'bg-rose-500' },
];

interface ClientFile {
    id: string;
    name: string;
    url: string;
    type: string;
    size: string;
    createdAt: string;
    date?: string;
    authorName?: string;
}

const STAGE_CONFIG: Record<ProducerStage, { label: string, color: string, bg: string, border: string, icon: any, ring: string }> = {
    'AQUISICAO': { label: 'Aquisição', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-100', icon: Rocket },
    'ONBOARDING': { label: 'Onboarding', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', ring: 'ring-purple-100', icon: Database },
    'GROWTH': { label: 'Growth', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-100', icon: TrendingUp },
    'RISCO': { label: 'Risco', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-100', icon: AlertTriangle },
    'ACTIVE': { label: 'Ativo', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', ring: 'ring-gray-100', icon: Activity },
    'BLOCKED': { label: 'Bloqueado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-100', icon: X }
};

const TASK_STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, icon: any, ring: string }> = {
    'PENDING': { label: 'Pendente', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', ring: 'ring-gray-100', icon: Clock },
    'IN_PROGRESS': { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-100', icon: Loader2 },
    'COMPLETED': { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-100', icon: CheckCircle2 },
    'WAITING': { label: 'Aguardando', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-100', icon: PauseCircle },
    'STUCK': { label: 'Travado', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-100', icon: AlertCircle }
};

const StatPill = ({ label, value, trend, trendValue, icon: Icon, alert = false }: any) => (
    <div className={`relative flex items-center gap-5 px-6 py-5 rounded-[1.5rem] bg-white transition-all duration-500 group
        ${alert 
            ? 'shadow-[0_8px_30px_-6px_rgba(239,68,68,0.15)] border border-red-200' 
            : 'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)] border border-transparent hover:border-gray-200 hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5'
        }`}
    >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner
            ${alert ? 'bg-red-50 text-red-500' : 'bg-[#FAFAFA] text-gray-900 border border-gray-200'}`}
        >
            <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
            <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900 tracking-tight leading-none">{value}</span>
                {trend && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center border
                        ${trend === 'up' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}
                    >
                        {trend === 'up' ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}
                        {trendValue}
                    </span>
                )}
            </div>
        </div>
    </div>
);

const CreatorCard: React.FC<{ 
    producer: Producer, 
    onClick: () => void, 
    teamMembers: Usuario[], 
    onSendToRadar: () => void,
    activeLaunchesCount: number,
    pendingTasksCount: number
}> = ({ producer, onClick, teamMembers, onSendToRadar, activeLaunchesCount, pendingTasksCount }) => {
    const config = STAGE_CONFIG[producer.stage] || STAGE_CONFIG['ACTIVE'];
    const manager = teamMembers.find(u => u.id === producer.gerente_conta);
    const health = producer.stats_financeiros?.health_score || 0;
    
    const getHealthColor = (score: number) => {
        if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-400' };
        if (score >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-500', gradient: 'from-yellow-400 to-orange-400' };
        return { text: 'text-rose-600', bg: 'bg-rose-500', gradient: 'from-rose-500 to-red-500' };
    };
    
    const healthStyle = getHealthColor(health);

    return (
        <div 
            onClick={onClick}
            className="group relative bg-white rounded-[2rem] p-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            border border-gray-200
            shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.02)]
            hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)]
            hover:border-brand-200
            hover:-translate-y-1.5 cursor-pointer overflow-hidden flex flex-col justify-between h-full min-h-[300px] z-0 hover:z-10"
        >
            <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${config.bg} blur-[80px] opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none rounded-full -mr-16 -mt-16`}></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="p-1 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-gray-200 transition-colors">
                                <Avatar 
                                    src={producer.foto_url} 
                                    name={producer.nome_display} 
                                    alt="" 
                                    className="w-14 h-14 rounded-xl object-cover transition-transform duration-500 group-hover:scale-105" 
                                />
                            </div>
                            <div className="absolute -bottom-1.5 -right-1.5 bg-white p-1 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-gray-100 z-10">
                                {producer.plataforma_origem === 'Kiwify' ? (
                                    <div className="w-4 h-4 bg-[#2ECC71] rounded-full flex items-center justify-center text-[8px] text-white font-bold">K</div>
                                ) : (
                                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">H</div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-[15px] leading-tight group-hover:text-brand-700 transition-colors truncate pr-2">
                                {producer.nome_display}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide border ${config.bg} ${config.color} ${config.border}`}>
                                    {config.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Botão Radar */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSendToRadar(); }}
                        className={`p-2 rounded-xl transition-all ${producer.tracking_status ? 'text-blue-500 bg-blue-50 border border-blue-100' : 'text-gray-300 hover:text-brand-600 hover:bg-gray-50 border border-transparent hover:border-gray-200'}`}
                        title={producer.tracking_status ? 'Em Acompanhamento' : 'Enviar para Radar'}
                    >
                        <Radar size={18} className={producer.tracking_status ? 'animate-pulse' : ''} />
                    </button>
                </div>

                {/* Indicadores de Atividade Real */}
                <div className="flex gap-2 mb-5">
                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border transition-colors ${activeLaunchesCount > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <Rocket size={14} className="mb-1" />
                        <span className="text-[10px] font-black">{activeLaunchesCount}</span>
                        <span className="text-[8px] font-bold uppercase tracking-tighter">Lançamentos</span>
                    </div>
                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border transition-colors ${pendingTasksCount > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <CheckSquare size={14} className="mb-1" />
                        <span className="text-[10px] font-black">{pendingTasksCount}</span>
                        <span className="text-[8px] font-bold uppercase tracking-tighter">Tarefas</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            MRR Mensal
                        </p>
                        <p className="text-2xl font-black text-gray-900 tracking-tight flex items-baseline gap-1">
                            <span className="text-sm font-semibold text-gray-400 align-top mt-1">R$</span>
                            {(producer.stats_financeiros?.faturamento_mes || 0).toLocaleString('pt-BR', { notation: 'compact' })}
                        </p>
                    </div>
                    
                    <div className="space-y-1 pl-4 border-l border-gray-100 group-hover:border-gray-200 transition-colors">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saúde</p>
                            <span className={`text-[10px] font-black ${healthStyle.text}`}>{health}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                            <div className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${healthStyle.gradient} opacity-80`} style={{ width: `${health}%` }}></div>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 truncate font-medium">
                            {health > 80 ? 'Excelente performance' : health > 50 ? 'Atenção necessária' : 'Risco de Churn'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative pt-4 mt-auto border-t border-gray-50 group-hover:border-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
                        {manager ? (
                            <>
                                <Avatar src={manager.avatar} name={manager.nome} alt={manager.nome} className="w-6 h-6 rounded-full border border-gray-100 bg-gray-50"/>
                                <span className="text-[11px] text-gray-500 font-medium">{manager.nome.split(' ')[0]}</span>
                            </>
                        ) : (
                            <span className="text-[10px] text-gray-400 italic">Sem gerente</span>
                        )}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); window.location.hash = `#/inbox?chatId=${producer.whatsapp_contato?.replace(/\D/g,'')}@s.whatsapp.net`}}
                                className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-xl transition-colors border border-gray-200 hover:border-green-200 hover:shadow-sm" 
                                title="WhatsApp"
                            >
                                <Smartphone size={14}/>
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors border border-gray-200 hover:border-blue-200 hover:shadow-sm" title="Email">
                                <Mail size={14}/>
                            </button>
                        </div>
                        
                        <button className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-[10px] font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            Detalhes <ArrowRight size={12}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CUSTOM SELECT COMPONENT ---
const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    const selectedOption = options.find((opt: any) => opt.value === value);
    const filteredOptions = options.filter((opt: any) => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full pl-11 pr-10 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-left outline-none transition-all flex items-center justify-between group
                    ${isOpen ? 'bg-white border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-200 hover:border-gray-300 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`absolute left-4 transition-colors ${isOpen || value ? 'text-brand-500' : 'text-gray-400'}`}>
                        {selectedOption?.icon ? <selectedOption.icon size={18} /> : (Icon && <Icon size={18} />)}
                    </div>
                    <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : 'group-hover:text-gray-600'}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-[2rem] shadow-2xl shadow-black/10 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="px-3 pb-2 mb-1 border-b border-gray-50">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Filtrar opções..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-0 outline-none placeholder:text-gray-400"
                            />
                        </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar px-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt: any) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-xs font-bold text-left rounded-xl transition-all flex items-center gap-3 mb-0.5 last:mb-0
                                        ${value === opt.value 
                                            ? 'bg-brand-50 text-brand-700 shadow-sm' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                                        ${value === opt.value ? 'bg-white text-brand-500 shadow-sm' : 'bg-gray-100 text-gray-400 group-hover:bg-white'}`}>
                                        {opt.icon ? <opt.icon size={14} /> : (Icon && <Icon size={14} />)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span>{opt.label}</span>
                                            {value === opt.value && <Check size={14} className="text-brand-500" />}
                                        </div>
                                        {opt.description && <p className="text-[9px] font-medium text-gray-400 mt-0.5">{opt.description}</p>}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <Search size={24} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nenhum resultado</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateProducerModal = ({ onClose, teamMembers }: { onClose: () => void, teamMembers: Usuario[] }) => {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [instagram, setInstagram] = useState('');
    const [product, setProduct] = useState('');
    const [platform, setPlatform] = useState('Kiwify');
    const [customPlatform, setCustomPlatform] = useState('');
    const [managerId, setManagerId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatWhatsApp = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWhatsapp(formatWhatsApp(e.target.value));
    };

    const handleSubmit = async () => {
        if (!name || !email) {
            addToast({ type: 'error', message: 'Nome e Email são obrigatórios' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            addToast({ type: 'error', message: 'Por favor, insira um e-mail válido' });
            return;
        }

        setIsSubmitting(true);
        try {
            const id = `prod_${Date.now()}`;
            const finalPlatform = platform === 'Outra' ? customPlatform : platform;
            
            const newProducer: Partial<Producer> = {
                id,
                nome_display: name,
                email_contato: email,
                whatsapp_contato: whatsapp,
                instagram_username: instagram.replace('@', ''),
                produto_principal: product || 'Produto Principal',
                plataforma_origem: finalPlatform,
                gerente_conta: managerId,
                stage: 'AQUISICAO',
                tracking_status: 'PRECISA_CONTATO',
                tags: [],
                createdAt: fieldValue.serverTimestamp(),
                updatedAt: fieldValue.serverTimestamp(),
                data_inicio_parceria: new Date().toISOString(),
                foto_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`,
                stats_financeiros: {
                    faturamento_mes: 0,
                    faturamento_total: 0,
                    comissao_pendente: 0,
                    vendas_count: 0,
                    health_score: 100,
                    status_health: 'SAUDAVEL',
                    ultima_venda: '',
                    tendencia: 'estavel'
                },
                tracking_metadata: {
                    entered_stage_at: new Date().toISOString(),
                    last_interaction_at: new Date().toISOString(),
                    sla_status: 'OK'
                }
            };

            await db.collection('producers').doc(id).set(newProducer);
            
            // Log inicial na timeline
            await db.collection('producers').doc(id).collection('timeline').add({
                type: 'SYSTEM_LOG',
                content: 'Cliente criado e adicionado à carteira',
                timestamp: Date.now(),
                authorName: auth.currentUser?.displayName || 'Sistema',
                authorId: auth.currentUser?.uid,
                category: 'SYSTEM'
            });

            addToast({ type: 'success', message: 'Cliente criado com sucesso' });
            onClose();
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao criar cliente' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Novo Cliente</h2>
                        <p className="text-sm text-gray-500 font-medium">Preencha os dados para iniciar o acompanhamento.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-8">
                        {/* Coluna 1: Dados de Contato */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 bg-brand-500 rounded-full"></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Informações de Contato</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">Nome Completo / Display</label>
                                    <div className="relative group">
                                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            autoFocus 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            placeholder="Ex: João Silva" 
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">E-mail Principal</label>
                                    <div className="relative group">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            type="email"
                                            value={email} 
                                            onChange={e => setEmail(e.target.value.toLowerCase())} 
                                            placeholder="contato@exemplo.com" 
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">WhatsApp</label>
                                    <div className="relative group">
                                        <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            value={whatsapp} 
                                            onChange={handleWhatsAppChange} 
                                            placeholder="(11) 99999-9999" 
                                            maxLength={15}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">Instagram (Username)</label>
                                    <div className="relative group">
                                        <Instagram size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            value={instagram} 
                                            onChange={e => setInstagram(e.target.value)} 
                                            placeholder="@usuario" 
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Dados do Negócio */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Detalhes do Negócio</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">Produto Principal</label>
                                    <div className="relative group">
                                        <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            value={product} 
                                            onChange={e => setProduct(e.target.value)} 
                                            placeholder="Nome do produto" 
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">Plataforma de Vendas</label>
                                    <CustomSelect 
                                        value={platform}
                                        onChange={setPlatform}
                                        icon={Layers}
                                        placeholder="Selecione a plataforma"
                                        options={[
                                            { value: 'Kiwify', label: 'Kiwify', icon: Globe, description: 'Plataforma popular para infoprodutos' },
                                            { value: 'Hotmart', label: 'Hotmart', icon: Rocket, description: 'Líder de mercado na América Latina' },
                                            { value: 'Eduzz', label: 'Eduzz', icon: CreditCard, description: 'Foco em produtores e afiliados' },
                                            { value: 'Kirvano', label: 'Kirvano', icon: Zap, description: 'Nova plataforma com foco em conversão' },
                                            { value: 'Ticto', label: 'Ticto', icon: Activity, description: 'Foco em alta performance e escala' },
                                            { value: 'Perfect Pay', label: 'Perfect Pay', icon: DollarSign, description: 'Checkout otimizado e alta conversão' },
                                            { value: 'Braip', label: 'Braip', icon: Layers, description: 'Especialista em produtos físicos e digitais' },
                                            { value: 'Doppus', label: 'Doppus', icon: ShieldCheck, description: 'Segurança e estabilidade para o produtor' },
                                            { value: 'Greenn', label: 'Greenn', icon: Sparkles, description: 'Plataforma moderna e intuitiva' },
                                            { value: 'Vindi', label: 'Vindi', icon: RefreshCw, description: 'Especialista em recorrência e assinaturas' },
                                            { value: 'Pagar.me', label: 'Pagar.me', icon: CreditCard, description: 'Gateway de pagamento robusto' },
                                            { value: 'Stripe', label: 'Stripe', icon: Globe, description: 'Infraestrutura global de pagamentos' },
                                            { value: 'CartPanda', label: 'CartPanda', icon: Layout, description: 'Checkout e plataforma completa' },
                                            { value: 'Yampi', label: 'Yampi', icon: LayoutGrid, description: 'Checkout transparente e dropshipping' },
                                            { value: 'Hubla', label: 'Hubla', icon: Users, description: 'Gestão de comunidades e grupos' },
                                            { value: 'Monetizze', label: 'Monetizze', icon: Wallet, description: 'Plataforma tradicional de afiliados' },
                                            { value: 'Appmax', label: 'Appmax', icon: TrendingUp, description: 'Foco em maximizar resultados' },
                                            { value: 'Outra', label: 'Outra (Especificar)', icon: Plus, description: 'Usar uma plataforma não listada' },
                                        ]}
                                    />
                                </div>

                                {platform === 'Outra' && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-[11px] font-bold text-gray-500 ml-1">Qual plataforma?</label>
                                        <div className="relative group">
                                            <LayoutGrid size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                value={customPlatform} 
                                                onChange={e => setCustomPlatform(e.target.value)} 
                                                placeholder="Nome da plataforma" 
                                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all" 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 ml-1">Gerente de Conta (CS)</label>
                                    <CustomSelect 
                                        value={managerId}
                                        onChange={setManagerId}
                                        icon={UserPlus}
                                        placeholder="Selecione um gerente..."
                                        options={[...teamMembers]
                                            .sort((a, b) => a.nome.localeCompare(b.nome))
                                            .map(member => {
                                                const roleMap: Record<string, string> = {
                                                    admin: 'Admin',
                                                    cs_manager: 'Gerente CS',
                                                    hunter: 'Hunter',
                                                    prospector: 'Prospector',
                                                    support: 'Suporte'
                                                };
                                                return {
                                                    value: member.id,
                                                    label: member.nome,
                                                    description: roleMap[member.role] || member.role,
                                                    icon: User
                                                };
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl font-bold border border-gray-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className="flex-[2] py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Criar Cliente
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreatorRow: React.FC<{ producer: Producer, onClick: () => void, teamMembers: Usuario[] }> = ({ producer, onClick, teamMembers }) => {
    const health = producer.stats_financeiros?.health_score || 0;
    const manager = teamMembers.find(u => u.id === producer.gerente_conta);
    
    return (
        <div onClick={onClick} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer group transition-colors">
            <div className="col-span-4 flex items-center gap-3 pl-2">
                <Avatar src={producer.foto_url} name={producer.nome_display} alt={producer.nome_display} className="w-8 h-8 rounded-lg"/>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{producer.nome_display}</p>
                    <p className="text-[10px] text-gray-500 truncate">{producer.produto_principal}</p>
                </div>
            </div>
            <div className="col-span-2">
                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                    {producer.stage}
                </span>
            </div>
            <div className="col-span-3 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${health > 70 ? 'bg-green-500' : health > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium text-gray-600">{health}% Saúde</span>
            </div>
            <div className="col-span-2">
                <span className="text-sm font-bold text-gray-900">R$ {(producer.stats_financeiros?.faturamento_mes || 0).toLocaleString('pt-BR', {notation:'compact'})}</span>
            </div>
            <div className="col-span-1 flex justify-end">
                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500"/>
            </div>
        </div>
    );
};

export const CreatorDashboard: React.FC<Props> = ({ leads, producers = [] }) => {
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const [viewType, setViewType] = useState<'PORTFOLIO' | 'HEALTH'>('PORTFOLIO');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [tasks, setTasks] = useState<WorkTask[]>([]);

    useEffect(() => {
        const unsubUsers = db.collection('users').onSnapshot(
            (snap) => {
                setTeamMembers(snap.docs.map(d => ({id: d.id, ...d.data()} as Usuario)));
            },
            (error) => {
                console.error("Erro ao carregar membros da equipe (Dashboard):", error);
            }
        );
        
        const unsubLaunches = db.collection('launches').onSnapshot(
            (snap) => {
                setLaunches(snap.docs.map(d => ({id: d.id, ...d.data()} as Launch)));
            },
            (error) => {
                console.error("Erro ao carregar lançamentos (Dashboard):", error);
            }
        );

        const unsubTasks = db.collection('tasks').onSnapshot(
            (snap) => {
                setTasks(snap.docs.map(d => ({id: d.id, ...d.data()} as WorkTask)));
            },
            (error) => {
                console.error("Erro ao carregar tarefas (Dashboard):", error);
            }
        );

        return () => {
            unsubUsers();
            unsubLaunches();
            unsubTasks();
        };
    }, []);

    const handleSendToRadar = async (producer: Producer) => {
        if (producer.tracking_status) {
            addToast({ type: 'info', message: 'Cliente já está sendo acompanhado.' });
            return;
        }

        try {
            await db.collection('producers').doc(producer.id).update({
                tracking_status: 'PRECISA_CONTATO',
                'tracking_metadata.entered_stage_at': new Date().toISOString(),
                'tracking_metadata.last_interaction_at': new Date().toISOString(),
                updatedAt: fieldValue.serverTimestamp()
            });
            
            // Log na timeline
            await db.collection('producers').doc(producer.id).collection('timeline').add({
                type: 'SYSTEM_LOG',
                content: 'Enviado para o Radar de Acompanhamento via Dashboard',
                timestamp: Date.now(),
                authorName: auth.currentUser?.displayName || 'Admin',
                authorId: auth.currentUser?.uid,
                category: 'SYSTEM'
            });

            addToast({ type: 'success', message: 'Enviado para o Radar de Acompanhamento!' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao adicionar ao radar.' });
        }
    };

    const filteredProducers = useMemo(() => {
        const list: Producer[] = producers || [];
        const currentUser = teamMembers.find(u => u.id === auth.currentUser?.uid);
        const isAdmin = currentUser?.role === 'admin';

        return list.filter(p => {
            // Filter by assigned CS unless admin
            if (!isAdmin && p.gerente_conta !== auth.currentUser?.uid) {
                return false;
            }

            return (p.nome_display || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.produto_principal || '').toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [producers, searchTerm, teamMembers]);

    const groupedProducers = useMemo(() => {
        const groups: Record<HealthStatus, Producer[]> = {
            'SAUDAVEL': [],
            'ATENCAO': [],
            'RISCO': [],
            'CHURN': []
        };
        
        filteredProducers.forEach(p => {
            const status = p.stats_financeiros?.status_health || 'SAUDAVEL';
            if (groups[status]) groups[status].push(p);
        });
        
        return groups;
    }, [filteredProducers]);

    const activeProducer = useMemo(() => {
        return producers.find(p => p.id === selectedProducerId) || null;
    }, [producers, selectedProducerId]);

    const totalMRR = filteredProducers.reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0);
    const totalClients = filteredProducers.length;
    const healthyClients = filteredProducers.filter(p => (p.stats_financeiros?.health_score || 0) > 70).length;

    const getProducerStats = (producerId: string) => {
        const producerLaunches = launches.filter(l => l.producerId === producerId && l.status !== 'FINALIZADO');
        const producerTasks = tasks.filter(t => (t.clientId === producerId || t.leadId === producerId) && t.status !== 'COMPLETED');
        return {
            launchesCount: producerLaunches.length,
            tasksCount: producerTasks.length
        };
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden bg-[#FAFAFA] relative animate-in fade-in duration-500 font-sans">
            {activeProducer && (
                <SmartCommandCenter 
                    producer={activeProducer} 
                    teamMembers={teamMembers} 
                    initialTab="PERFIL"
                    onClose={() => setSelectedProducerId(null)} 
                    onInitiateTransition={(producer, targetStatus) => {
                        console.log('Transition initiated:', producer.id, targetStatus);
                    }}
                    onUpdateStatus={async (status, note) => {
                        try {
                            await db.collection('producers').doc(activeProducer.id).update({
                                tracking_status: status,
                                'tracking_metadata.entered_stage_at': new Date().toISOString(),
                                'tracking_metadata.last_interaction_at': new Date().toISOString(),
                                updatedAt: fieldValue.serverTimestamp()
                            });
                            
                            // Log na timeline
                            await db.collection('producers').doc(activeProducer.id).collection('timeline').add({
                                type: 'SYSTEM_LOG',
                                content: note || `Status alterado para ${status}`,
                                timestamp: Date.now(),
                                authorName: auth.currentUser?.displayName || 'Admin',
                                authorId: auth.currentUser?.uid,
                                category: 'SYSTEM'
                            });

                            addToast({ type: 'success', message: 'Status atualizado com sucesso!' });
                        } catch (error) {
                            console.error(error);
                            addToast({ type: 'error', message: 'Erro ao atualizar status.' });
                        }
                    }}
                />
            )}

            {isCreateModalOpen && (
                <CreateProducerModal 
                    onClose={() => setIsCreateModalOpen(false)} 
                    teamMembers={teamMembers} 
                />
            )}

            <div className="flex-none px-8 py-6 border-b border-gray-200 bg-white z-10">
                <div className="flex justify-between items-end mb-6">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                Carteira de Clientes
                            </h1>
                            <p className="text-gray-500 font-medium mt-1">Gerencie os infoprodutores parceiros e acompanhe resultados.</p>
                        </div>
                        
                        {/* Seletor de Visão Principal */}
                        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                            <button 
                                onClick={() => setViewType('PORTFOLIO')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewType === 'PORTFOLIO' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Users size={14} /> Todos
                            </button>
                            <button 
                                onClick={() => setViewType('HEALTH')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewType === 'HEALTH' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <HeartPulse size={14} /> Saúde
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 hover:-translate-y-0.5"
                    >
                        <UserPlus size={18} /> Novo Cliente
                    </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-4">
                        <StatPill label="MRR Total" value={`R$ ${(totalMRR/1000).toLocaleString('pt-BR')}k`} icon={DollarSign} trend="up" trendValue="+12%" />
                        <StatPill label="Clientes Ativos" value={totalClients} icon={Users} />
                        <StatPill label="Saúde Alta" value={healthyClients} icon={Activity} />
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Buscar cliente..." 
                                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {viewType === 'PORTFOLIO' && (
                            <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex">
                                <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18}/></button>
                                <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><List size={18}/></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {viewType === 'HEALTH' ? (
                    <div className="h-full flex space-x-6 overflow-x-auto pb-20 custom-scrollbar">
                        {HEALTH_COLUMNS.map(col => {
                            const items = groupedProducers[col.id];
                            const colMRR = items.reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0);

                            return (
                                <div key={col.id} className="w-[340px] flex-shrink-0 flex flex-col bg-gray-50/50 rounded-[2rem] border border-gray-200 overflow-hidden">
                                    <div className="p-5 bg-white border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${col.bg} ${col.color} border ${col.border}`}>
                                                    <col.icon size={18} strokeWidth={2.5}/>
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-base">{col.label}</h3>
                                            </div>
                                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded-lg font-black border border-gray-200">
                                                {items.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">MRR Acumulado</span>
                                            <span className="text-xs font-black text-gray-900">R$ {(colMRR / 1000).toLocaleString('pt-BR')}k</span>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                                        {items.map(producer => {
                                            const stats = getProducerStats(producer.id);
                                            return (
                                                <CreatorCard 
                                                    key={producer.id} 
                                                    producer={producer} 
                                                    onClick={() => setSelectedProducerId(producer.id)}
                                                    teamMembers={teamMembers}
                                                    onSendToRadar={() => handleSendToRadar(producer)}
                                                    activeLaunchesCount={stats.launchesCount}
                                                    pendingTasksCount={stats.tasksCount}
                                                />
                                            );
                                        })}
                                        {items.length === 0 && (
                                            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {filteredProducers.map(producer => {
                            const stats = getProducerStats(producer.id);
                            return (
                                <CreatorCard 
                                    key={producer.id} 
                                    producer={producer} 
                                    onClick={() => setSelectedProducerId(producer.id)}
                                    teamMembers={teamMembers}
                                    onSendToRadar={() => handleSendToRadar(producer)}
                                    activeLaunchesCount={stats.launchesCount}
                                    pendingTasksCount={stats.tasksCount}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden pb-20">
                        <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <div className="col-span-4 pl-2">Cliente / Produto</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-3">Performance</div>
                            <div className="col-span-2">Financeiro</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {filteredProducers.map(producer => (
                                <CreatorRow 
                                    key={producer.id} 
                                    producer={producer} 
                                    onClick={() => setSelectedProducerId(producer.id)} 
                                    teamMembers={teamMembers}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
