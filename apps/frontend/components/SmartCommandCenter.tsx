
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Phone, Clock, Wrench, Zap, AlertTriangle, 
    CheckCircle2, ArrowRight, MessageSquare, Calendar, 
    Sparkles, Shield, Send, StickyNote, PlayCircle, 
    TrendingUp, AlertCircle, Copy, Check, MoreHorizontal,
    Briefcase, FileText, ChevronRight, Tag, Globe, Activity,
    Timer, Flame, Search, ExternalLink, History, User, Save, Loader2,
    Mail, Instagram, CheckSquare, Filter, Plus, DownloadCloud, Link as LinkIcon,
    CreditCard, Layout, Hash, AlertOctagon, RefreshCw, Wand2, Smartphone, Target, LayoutDashboard,
    ChevronLeft, Trash2, AlignLeft, MoveHorizontal, Type, ThumbsUp, Smile,
    Lightbulb, Edit2, Rocket, DollarSign, MessageCircle, Mic, Video, CalendarClock,
    PhoneOutgoing, PhoneMissed, FileCheck, ClipboardEdit, Paperclip, Files, CalendarDays, BellPlus,
    MousePointerClick, MessageCircleQuestion, Maximize2, Minimize2, Users, Hourglass,
    Bug, MonitorSmartphone, Server, BarChart3, Megaphone, Presentation, LineChart, Circle,
    ListTodo, Bell, CalendarCheck, UserCheck, Ticket, Settings, LifeBuoy, CornerDownRight, CheckCircle, ChevronDown
} from 'lucide-react';
import { Producer, TrackingStatus, Usuario, TimelineEvent, WorkTask, TaskStatus, Launch } from '../types';

import { NotificationService } from '../services/systemServices';
import { Avatar } from './Avatar';
import { db, auth, fieldValue } from '../firebase';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useMedia } from '../hooks/useMedia';
import { SmartTaskCard } from './Task/SmartTaskCard';
import { MentionsInput, Mention } from 'react-mentions';
import { DateTimePicker } from './DateTimePicker';
import { TimeInStageBadge } from './TimeInStageBadge';

// --- CONFIGURAÇÃO DAS ETAPAS ---
const mentionsStyles = {
    control: {
        backgroundColor: 'transparent',
        fontSize: 14,
        lineHeight: 1.5,
        fontFamily: 'inherit',
        overflow: 'visible',
    },
    '&multiLine': {
        control: {
            fontFamily: 'inherit',
            minHeight: 100,
        },
        highlighter: {
            padding: 16,
            border: '1px solid transparent',
        },
        input: {
            padding: 16,
            border: '1px solid transparent',
            outline: 'none',
        },
    },
    suggestions: {
        list: {
            backgroundColor: 'white',
            border: '1px solid rgba(0,0,0,0.1)',
            fontSize: 14,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            zIndex: 9999999,
            position: 'absolute' as const,
        },
        item: {
            padding: '10px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            '&focused': {
                backgroundColor: '#f9fafb',
                color: '#000',
            },
        },
    },
};

const MiniCalendar = ({ selectedDate, onChange, onClose }: { selectedDate: string, onChange: (date: string) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);

    const handleDateClick = (day: number) => {
        // Formato YYYY-MM-DD local
        const d = new Date(year, month, day);
        const isoDate = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
        onChange(isoDate);
        onClose();
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    return (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 w-72 animate-in fade-in zoom-in-95 origin-top-right ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={16}/></button>
                <span className="text-sm font-bold text-gray-800 capitalize">{monthNames[month]} {year}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 text-center uppercase">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const currentDateStr = new Date(year, month, day).toLocaleDateString('en-CA');
                    const isSelected = selectedDate === currentDateStr;
                    const isToday = new Date().toLocaleDateString('en-CA') === currentDateStr;

                    return (
                        <button 
                            key={day} 
                            onClick={() => handleDateClick(day)}
                            className={`
                                h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                                ${isSelected ? 'bg-gray-900 text-white shadow-md' : isToday ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            {selectedDate && (
                <div className="pt-3 border-t border-gray-100 mt-2">
                    <button onClick={() => { onChange(''); onClose(); }} className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={12}/> Limpar Filtro
                    </button>
                </div>
            )}
        </div>
    );
};

interface Props {
    producer: Producer;
    onClose: () => void;
    onUpdateStatus: (status: TrackingStatus, note?: string) => void | Promise<void>;
    onInitiateTransition: (producer: Producer, targetStatus: TrackingStatus) => void;
    onSendToOnboarding: (producer: Producer) => void;
    teamMembers: Usuario[];
    initialTab?: 'PERFIL' | 'ETAPA' | 'TIMELINE' | 'TAREFAS' | 'ARQUIVOS';
}

// Configuração Visual por Estágio
const STAGE_THEMES: Record<string, { label: string, bg: string, border: string, text: string, icon: any, lightBg: string, accent: string, description: string }> = {
    'PRECISA_CONTATO': { 
        label: 'Precisa de Contato', 
        bg: 'bg-rose-50', 
        border: 'border-rose-100', 
        text: 'text-rose-700', 
        icon: AlertTriangle, 
        lightBg: 'bg-white', 
        accent: 'border-l-rose-500', 
        description: 'Alerta Operacional: Cliente sem interação recente.'
    },
    'EM_ANDAMENTO': { 
        label: 'Em Tratativa', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-100', 
        text: 'text-emerald-700', 
        icon: Phone, 
        lightBg: 'bg-white', 
        accent: 'border-l-emerald-500', 
        description: 'Interação ativa iniciada pelo gerente.'
    },
    'AGUARDANDO_RETORNO': { 
        label: 'Aguardando Retorno', 
        bg: 'bg-amber-50', 
        border: 'border-amber-100', 
        text: 'text-amber-700', 
        icon: Clock, 
        lightBg: 'bg-white', 
        accent: 'border-l-amber-500', 
        description: 'Aguardando resposta ou ação do cliente.'
    },
    'EM_SUPORTE': { 
        label: 'Em Suporte', 
        bg: 'bg-indigo-50', 
        border: 'border-indigo-100', 
        text: 'text-indigo-700', 
        icon: LifeBuoy, 
        lightBg: 'bg-white', 
        accent: 'border-l-indigo-500', 
        description: 'Ticket técnico aberto ou resolução de bug.'
    },
    'ACAO_ESTRATEGICA': { 
        label: 'Estratégico', 
        bg: 'bg-blue-50', 
        border: 'border-blue-100', 
        text: 'text-blue-700', 
        icon: Zap, 
        lightBg: 'bg-white', 
        accent: 'border-l-blue-500', 
        description: 'Ações de Growth, Upsell ou Recuperação.'
    },
};

const NEXT_STEP_LOGIC: Record<string, TrackingStatus> = {
    'PRECISA_CONTATO': 'EM_ANDAMENTO',
    'EM_ANDAMENTO': 'AGUARDANDO_RETORNO',
    'AGUARDANDO_RETORNO': 'EM_ANDAMENTO',
    'EM_SUPORTE': 'EM_ANDAMENTO',
    'ACAO_ESTRATEGICA': null
};

// Templates de Estratégia
const STRATEGY_TEMPLATES = {
    'GROWTH': "📈 PLANO DE ESCALA\n\n• Objetivo Financeiro (Meta): R$ \n\n• Canais de Aquisição (Ads/Orgânico):\n\n• Ação Principal:\n",
    'ACTIVATION': "📣 CAMPANHA DE ATIVAÇÃO\n\n• Mecânica da Ação (Promo/Lançamento):\n\n• Data de Disparo:\n\n• Público Alvo:\n",
    'OFFER': "🏷️ AJUSTE DE OFERTA\n\n• O que será alterado (Preço/Bônus):\n\n• Motivo da mudança:\n\n• Expectativa de Conversão:\n",
    'CREATORS': "🤝 GESTÃO DE CREATORS\n\n• Novos Influenciadores:\n\n• Budget Aprovado:\n\n• Briefing Resumido:\n"
};

// Config para Tracking Status Dropdown
const TRACKING_STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, icon: any }> = {
    'PRECISA_CONTATO': { label: 'Precisa Contato', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle },
    'EM_ANDAMENTO': { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: Phone },
    'AGUARDANDO_RETORNO': { label: 'Aguardando', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock },
    'EM_SUPORTE': { label: 'Suporte', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: LifeBuoy },
    'ACAO_ESTRATEGICA': { label: 'Estratégico', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Zap },
    'null': { label: 'Sem Status', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: CheckCircle2 } 
};

// --- SUPPORT TICKET TYPES & CONFIG ---
type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type TicketType = 'BUG' | 'FINANCEIRO' | 'CONFIG' | 'DUVIDA';

const PRIORITY_STYLES: Record<TicketPriority, { label: string, bg: string, text: string, border: string, icon: any }> = {
    'CRITICAL': { label: 'Crítica', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Flame },
    'HIGH': { label: 'Alta', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertCircle },
    'MEDIUM': { label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Circle },
    'LOW': { label: 'Baixa', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: ArrowRight }
};

const TICKET_TYPES: Record<TicketType, { label: string, icon: any }> = {
    'BUG': { label: 'Bug / Erro', icon: Bug },
    'FINANCEIRO': { label: 'Financeiro', icon: CreditCard },
    'CONFIG': { label: 'Configuração', icon: Settings },
    'DUVIDA': { label: 'Dúvida Geral', icon: LifeBuoy }
};

interface ActiveTicket {
    id: string;
    externalId: string;
    type: TicketType;
    priority: TicketPriority;
    title: string;
    description: string;
    openedAt: string;
    status: 'OPEN' | 'RESOLVED';
}

interface ArchivedTicket extends ActiveTicket {
    resolvedAt: string;
    resolutionNote?: string;
}

// --- STRATEGY TYPES & CONFIG ---
type StrategyType = 'GROWTH' | 'ACTIVATION' | 'OFFER' | 'CREATORS';
type StrategyImpact = 'HIGH' | 'MEDIUM' | 'LOW';

const STRATEGY_CONFIG: Record<StrategyType, { label: string, icon: any, color: string, description: string }> = {
    'GROWTH': { label: 'Plano de Crescimento', icon: TrendingUp, color: 'text-emerald-500', description: 'Escala de tráfego e aumento de LTV.' },
    'ACTIVATION': { label: 'Ativação de Base', icon: Zap, color: 'text-amber-500', description: 'Recuperação e promoções rápidas.' },
    'OFFER': { label: 'Ajuste de Oferta', icon: DollarSign, color: 'text-blue-500', description: 'Otimização de preço e bônus.' },
    'CREATORS': { label: 'Estratégia Creators', icon: Users, color: 'text-purple-500', description: 'Parcerias e tráfego de influência.' }
};

interface ActiveStrategy {
    id: string;
    type: StrategyType;
    impact: StrategyImpact;
    title: string;
    objective: string;
    actionPlan: string;
    startedAt: string;
    status: 'ACTIVE' | 'COMPLETED';
}

interface ArchivedStrategy extends ActiveStrategy {
    completedAt: string;
    resultNote?: string;
}

export const SmartCommandCenter: React.FC<Props> = ({ producer, onClose, onUpdateStatus, onInitiateTransition, onSendToOnboarding, teamMembers, initialTab }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { uploadFile, isUploading } = useMedia();
    
    const [activeTab, setActiveTab] = useState<'PERFIL' | 'ETAPA' | 'TIMELINE' | 'TAREFAS' | 'ARQUIVOS'>(initialTab || 'ETAPA');
    const [timelineFilter, setTimelineFilter] = useState<'TUDO' | 'NOTAS' | 'TASKS' | 'SISTEMA'>('TUDO');
    
    // Date Picker State
    const [timelineDateFilter, setTimelineDateFilter] = useState<string>(''); 
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const [isAddingNote, setIsAddingNote] = useState(false);
    
    // --- STRATEGY STATE (NEW) ---
    const propActiveStrategy = (producer.tracking_metadata as any)?.active_strategy as ActiveStrategy | undefined;
    const archivedStrategies = ((producer.tracking_metadata as any)?.archived_strategies || []) as ArchivedStrategy[];
    
    const [localActiveStrategy, setLocalActiveStrategy] = useState<ActiveStrategy | null>(propActiveStrategy || null);
    const lastResolvedStrategyIdRef = useRef<string | null>(null);

    // Sync strategy props
    useEffect(() => {
        if (!propActiveStrategy) {
            setLocalActiveStrategy(null);
            lastResolvedStrategyIdRef.current = null;
            return;
        }
        if (propActiveStrategy) {
            if (lastResolvedStrategyIdRef.current === propActiveStrategy.id) return;
            if (JSON.stringify(propActiveStrategy) !== JSON.stringify(localActiveStrategy)) {
                setLocalActiveStrategy(propActiveStrategy);
            }
        }
    }, [propActiveStrategy]);

    const [newStrategy, setNewStrategy] = useState<{
        type: StrategyType;
        impact: StrategyImpact;
        title: string;
        objective: string;
        actionPlan: string;
    }>({
        type: 'GROWTH',
        impact: 'MEDIUM',
        title: '',
        objective: '',
        actionPlan: ''
    });

    const [strategyUpdateText, setStrategyUpdateText] = useState('');
    const [strategyResultNote, setStrategyResultNote] = useState('');
    const [isResolvingStrategy, setIsResolvingStrategy] = useState(false);
    
    // Dados Principais
    const [note, setNote] = useState('');
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [tasks, setTasks] = useState<WorkTask[]>([]);
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    
    // Task Creation State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'LOW'|'MEDIUM'|'HIGH'>('MEDIUM');

    // Custom Reminder State (Follow-up Manager)
    const [customReminderTitle, setCustomReminderTitle] = useState('');
    const [customReminderDate, setCustomReminderDate] = useState('');
    const [isCustomReminderOpen, setIsCustomReminderOpen] = useState(false);
    const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false);
    const [reminderAssignee, setReminderAssignee] = useState<'ME' | 'CLIENT'>('ME');
    const customReminderMenuRef = useRef<HTMLDivElement>(null);

    // Log Note State (Editor)
    const [logNote, setLogNote] = useState('');
    const [lastLoadedEventDate, setLastLoadedEventDate] = useState<number | null>(null);
    
    // --- SUPPORT STATE (NEW) ---
    // Derived Active Ticket from Producer Metadata
    const propActiveTicket = (producer.tracking_metadata as any)?.active_ticket as ActiveTicket | undefined;
    const archivedTickets = ((producer.tracking_metadata as any)?.archived_tickets || []) as ArchivedTicket[];
    
    // Local State for Optimistic UI
    const [localActiveTicket, setLocalActiveTicket] = useState<ActiveTicket | null>(propActiveTicket || null);
    
    // REF para evitar que o ticket resolvido "volte" via prop antes do firebase confirmar a deleção
    const lastResolvedIdRef = useRef<string | null>(null);

    // Sync prop changes to local state (handle external updates)
    useEffect(() => {
        // Se a prop ficou vazia (backend confirmou deleção), limpa local e reseta o ref
        if (!propActiveTicket) {
            setLocalActiveTicket(null);
            lastResolvedIdRef.current = null;
            return;
        }

        // Se recebemos um ticket via prop
        if (propActiveTicket) {
            // Se for o mesmo ticket que acabamos de resolver otimistamente, IGNORA a prop antiga
            if (lastResolvedIdRef.current === propActiveTicket.id) {
                return;
            }
            
            // Caso contrário, sincroniza (ex: edição em outro lugar ou novo ticket)
            if (JSON.stringify(propActiveTicket) !== JSON.stringify(localActiveTicket)) {
                setLocalActiveTicket(propActiveTicket);
            }
        }
    }, [propActiveTicket]);
    
    // Form States for New Ticket
    const [newTicket, setNewTicket] = useState<{
        type: TicketType;
        priority: TicketPriority;
        title: string;
        description: string;
        externalId: string;
    }>({
        type: 'BUG',
        priority: 'MEDIUM',
        title: '',
        description: '',
        externalId: ''
    });
    
    // Update Input for Active Ticket
    const [ticketUpdateText, setTicketUpdateText] = useState('');

    // State para ACAO_ESTRATEGICA
    const [strategyType, setStrategyType] = useState<'GROWTH' | 'ACTIVATION' | 'OFFER' | 'CREATORS'>('GROWTH');
    const [impactLevel, setImpactLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const trackingMenuRef = useRef<HTMLDivElement>(null);

    const searchMembers = (search: string, callback: (data: any[]) => void) => {
        if (!teamMembers || teamMembers.length === 0) {
            callback([{ id: 'empty', display: 'Nenhum membro encontrado' }]);
            return;
        }
        
        const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        const filtered = teamMembers
            .filter(u => u && u.nome)
            .filter(u => {
                const normalizedName = String(u.nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return normalizedName.includes(normalizedSearch);
            })
            .map(u => ({
                id: String(u.id || 'unknown'),
                display: String(u.nome || 'Usuário')
            }));
            
        callback(filtered);
    };

    const [isTrackingOpen, setIsTrackingOpen] = useState(false);

    const currentStatus = producer.tracking_status || 'PRECISA_CONTATO';
    const theme = STAGE_THEMES[currentStatus] || STAGE_THEMES['EM_ANDAMENTO'];
    const nextStep = NEXT_STEP_LOGIC[currentStatus];

    const lastStrategyEvent = useMemo(() => {
        return timeline.find(t => t.metadata?.type === 'STRATEGY');
    }, [timeline]);

    // Hydration for Strategy
    useEffect(() => {
        if (currentStatus === 'ACAO_ESTRATEGICA' && lastStrategyEvent && !logNote) {
            const contentParts = lastStrategyEvent.content?.split('\n\n');
            const desc = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : lastStrategyEvent.content;

            setLogNote(desc);
            setStrategyType(lastStrategyEvent.metadata.strategyType || 'GROWTH');
            setImpactLevel(lastStrategyEvent.metadata.impactLevel || 'MEDIUM');
            setLastLoadedEventDate(typeof lastStrategyEvent.timestamp === 'number' ? lastStrategyEvent.timestamp : new Date(lastStrategyEvent.timestamp).getTime());
        }
    }, [currentStatus, lastStrategyEvent]);


    // Helper: Registro na Timeline
    const logTimelineEvent = async (type: 'TASK_UPDATE' | 'SYSTEM_LOG' | 'NOTE' | 'STAGE_CHANGE', category: 'TASK' | 'SYSTEM' | 'NOTE', content: string, metadata?: any) => {
        try {
            await db.collection('producers').doc(producer.id).collection('timeline').add({
                type,
                content,
                timestamp: Date.now(),
                authorName: currentUser?.nome || 'Sistema',
                authorId: currentUser?.id || 'SYSTEM',
                category,
                metadata: metadata || {}
            });
        } catch (e) {
            console.error("Erro ao logar na timeline:", e);
        }
    };

    // Helper: Formata data
    const formatDate = (date: string | number) => {
        if(!date) return '-';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', hour: '2-digit', minute: '2-digit'});
    };

    // Fechar date picker ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
            if (trackingMenuRef.current && !trackingMenuRef.current.contains(event.target as Node)) {
                setIsTrackingOpen(false);
            }
            if (customReminderMenuRef.current && !customReminderMenuRef.current.contains(event.target as Node)) {
                setIsDateTimePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!producer.id) return;
        
        let hasErrorTimeline = false;
        let hasErrorTasks = false;
        let hasErrorFiles = false;
        let hasErrorLaunches = false;

        // Timeline
        const unsubTimeline = db.collection('producers').doc(producer.id).collection('timeline')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .onSnapshot(
                snap => setTimeline(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimelineEvent))),
                err => { console.error("Error fetching timeline:", err); hasErrorTimeline = true; }
            );

        // Tasks
        const searchIds = Array.from(new Set([producer.id, producer.leadId].filter(Boolean)));
        const unsubTasks = db.collection('tasks')
            .where('leadId', 'in', searchIds)
            .onSnapshot(
                snap => {
                    const loadedTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkTask));
                    loadedTasks.sort((a, b) => {
                        // Prioritize PENDING status
                        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;

                        // For PENDING tasks, sort by dueDate ascending (closest first)
                        if (a.status === 'PENDING' && b.status === 'PENDING') {
                            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                            
                            if (dateA !== dateB) return dateA - dateB;

                            // If same date, prioritize tasks with specific time (ISO string contains 'T')
                            const hasTimeA = a.dueDate?.includes('T');
                            const hasTimeB = b.dueDate?.includes('T');
                            if (hasTimeA && !hasTimeB) return -1;
                            if (!hasTimeA && hasTimeB) return 1;
                            
                            return 0;
                        }

                        // For other statuses, sort by updatedAt or createdAt descending
                        const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                        const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                        return tB - tA;
                    });
                    setTasks(loadedTasks);
                },
                err => { console.error("Error fetching tasks:", err); hasErrorTasks = true; }
            );

        // Files
        const unsubFiles = db.collection('producers').doc(producer.id).collection('files')
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snap => setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))),
                err => { console.error("Error fetching files:", err); hasErrorFiles = true; }
            );

        // Launches
        const unsubLaunches = db.collection('launches')
            .where('producerId', '==', producer.id)
            .onSnapshot(
                snap => setLaunches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Launch))),
                err => { console.error("Error fetching launches:", err); hasErrorLaunches = true; }
            );

        return () => { 
            if (!hasErrorTimeline) { try { unsubTimeline(); } catch (e) { console.error(e); } }
            if (!hasErrorTasks) { try { unsubTasks(); } catch (e) { console.error(e); } }
            if (!hasErrorFiles) { try { unsubFiles(); } catch (e) { console.error(e); } }
            if (!hasErrorLaunches) { try { unsubLaunches(); } catch (e) { console.error(e); } }
        };
    }, [producer.id, producer.leadId]);

    const timeInStage = useMemo(() => {
        const enteredAt = producer.tracking_metadata?.entered_stage_at 
            ? new Date(producer.tracking_metadata.entered_stage_at).getTime() 
            : (producer.updatedAt ? new Date(producer.updatedAt).getTime() : Date.now());
        
        const diff = Date.now() - enteredAt;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return { days };
    }, [producer]);

    const silenceTime = useMemo(() => {
        const lastInteractionStr = producer.tracking_metadata?.last_interaction_at || producer.updatedAt || new Date().toISOString();
        const lastInteraction = new Date(lastInteractionStr).getTime();
        const diff = Date.now() - lastInteraction;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return { days };
    }, [producer]);

    const groupedTimeline = useMemo(() => {
        const filtered = timeline.filter(item => {
            if (timelineDateFilter) {
                const itemDate = new Date(item.timestamp).toLocaleDateString('en-CA');
                if (itemDate !== timelineDateFilter) return false;
            }
            if (timelineFilter === 'TUDO') return true;
            if (timelineFilter === 'NOTAS') return item.type === 'NOTE';
            if (timelineFilter === 'TASKS') return item.category === 'TASK';
            if (timelineFilter === 'SISTEMA') return item.category === 'SYSTEM' || item.type === 'STAGE_CHANGE';
            return true;
        });

        const groups: Record<string, TimelineEvent[]> = {};
        filtered.forEach(event => {
            const date = new Date(event.timestamp);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);

            let key = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
            if (date.toDateString() === today.toDateString()) key = 'Hoje';
            else if (date.toDateString() === yesterday.toDateString()) key = 'Ontem';

            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
        });
        return groups;
    }, [timeline, timelineFilter, timelineDateFilter]);

    // --- HANDLERS ---

    const handleSaveNote = async () => {
        if (!note.trim()) return;
        try {
            // Extrair menções do texto: @[Nome](ID)
            const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
            const mentions: string[] = [];
            let match;
            while ((match = mentionRegex.exec(note)) !== null) {
                mentions.push(match[2]); // O ID está no segundo grupo de captura
            }

            await logTimelineEvent('NOTE', 'NOTE', note, { 
                isInternal: true,
                mentions: mentions.length > 0 ? mentions : undefined
            });

            // Notificar usuários mencionados
            if (mentions.length > 0) {
                const currentUserId = auth.currentUser?.uid;
                const mentionNotifications = mentions
                    .filter(id => id !== currentUserId)
                    .map(id => NotificationService.notifyUser(id, {
                        type: 'MENTION',
                        title: 'Nova Menção',
                        body: `${auth.currentUser?.displayName || 'Um colaborador'} mencionou você em uma nota sobre ${producer.nome_display}.`,
                        link: `/inbox?producerId=${producer.id}`
                    }));
                
                await Promise.all(mentionNotifications);
            }

            setNote('');
            setIsAddingNote(false);
            addToast({ type: 'success', message: 'Nota registrada.' });
        } catch (error) { 
            console.error('Erro ao salvar nota:', error);
            addToast({ type: 'error', message: 'Erro ao salvar.' }); 
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && producer.id) {
            const file = e.target.files[0];
            try {
                const url = await uploadFile(file, `attachments/${producer.id}/${Date.now()}_${file.name}`);
                await db.collection('producers').doc(producer.id).collection('files').add({
                    name: file.name,
                    url,
                    size: (file.size / 1024).toFixed(2) + ' KB',
                    createdAt: new Date().toISOString(),
                    type: file.type
                });
                addToast({type: 'success', message: 'Arquivo enviado'});
            } catch(err) {
                console.error(err);
                addToast({type: 'error', message: 'Erro no upload'});
            }
        }
    };

    const handleCreateTask = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newTaskTitle.trim()) {
            addToast({ type: 'error', message: 'Título obrigatório' });
            return;
        }
        try {
            const taskRef = db.collection('tasks').doc();
            await taskRef.set({
                id: taskRef.id,
                title: newTaskTitle,
                description: `Tarefa criada no painel de ${producer.nome_display}`,
                dueDate: newTaskDate || new Date().toLocaleDateString('en-CA'),
                priority: newTaskPriority,
                status: 'PENDING',
                type: 'MANUAL',
                responsibility: 'B4YOU',
                leadId: producer.id,
                userId: currentUser?.id,
                assignedTo: [currentUser?.id],
                creatorName: currentUser?.nome,
                createdAt: fieldValue.serverTimestamp(),
                updatedAt: fieldValue.serverTimestamp()
            });
            
            await logTimelineEvent('TASK_UPDATE', 'TASK', `Nova tarefa criada: "${newTaskTitle}"`, { taskId: taskRef.id, action: 'CREATE' });

            setNewTaskTitle('');
            setNewTaskDate('');
            addToast({ type: 'success', message: 'Tarefa adicionada' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao criar tarefa' });
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                status: newStatus,
                updatedAt: fieldValue.serverTimestamp()
            });
            const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
            await logTimelineEvent('TASK_UPDATE', 'TASK', `Tarefa "${taskTitle}" atualizada para ${newStatus}.`, { taskId, action: 'STATUS_CHANGE', newValue: newStatus });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar status' });
        }
    };

    const handleUpdateTaskTitle = async (taskId: string, title: string) => {
        try {
            await db.collection('tasks').doc(taskId).update({ title, updatedAt: fieldValue.serverTimestamp() });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar título.' });
        }
    };

    const handleUpdateTaskDate = async (taskId: string, date: string) => {
        try {
            await db.collection('tasks').doc(taskId).update({ dueDate: date, updatedAt: fieldValue.serverTimestamp() });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar data.' });
        }
    };

    const handleUpdateTaskAssignee = async (taskId: string, userIds: string[]) => {
        try {
            await db.collection('tasks').doc(taskId).update({ assignedTo: userIds, updatedAt: fieldValue.serverTimestamp() });
            addToast({ type: 'success', message: 'Responsável atualizado.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar responsável.' });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Excluir esta tarefa permanentemente?')) return;
        const taskTitle = tasks.find(t => t.id === taskId)?.title || 'Tarefa';
        try {
            await db.collection('tasks').doc(taskId).delete();
            await logTimelineEvent('TASK_UPDATE', 'TASK', `Tarefa "${taskTitle}" excluída.`, { taskId, action: 'DELETE' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleTrackingChange = async (newStatus: TrackingStatus) => {
        if (newStatus !== producer.tracking_status) {
            const now = new Date().toISOString();
            const lastStatus = producer.tracking_status || 'PRECISA_CONTATO';
            const enteredAt = producer.tracking_metadata?.entered_stage_at || producer.updatedAt || now;
            
            const durationMs = new Date(now).getTime() - new Date(enteredAt).getTime();
            const durationMinutes = Math.floor(durationMs / 60000);
            
            const historyEntry = {
                stage: lastStatus,
                enteredAt: enteredAt,
                exitedAt: now,
                durationMinutes: durationMinutes,
                changedBy: currentUser?.nome || 'Sistema',
                note: 'Alteração manual via painel'
            };

            try {
                await db.collection('producers').doc(producer.id).update({
                    tracking_status: newStatus,
                    'tracking_metadata.entered_stage_at': now,
                    statusHistory: fieldValue.arrayUnion(historyEntry)
                });

                // Log na timeline com a duração
                const durationText = formatDuration(durationMs);
                await logTimelineEvent('STAGE_CHANGE', 'SYSTEM', `Etapa alterada de ${lastStatus} para ${newStatus}. Permaneceu em ${lastStatus} por ${durationText}.`, {
                    oldStatus: lastStatus,
                    newStatus: newStatus,
                    durationMinutes
                });

                setIsTrackingOpen(false);
                addToast({ type: 'success', message: `Status atualizado para ${newStatus}` });
            } catch (error) {
                console.error("Erro ao atualizar status:", error);
                addToast({ type: 'error', message: 'Erro ao atualizar status.' });
            }
        }
    };

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const handleSelectStrategy = (type: 'GROWTH' | 'ACTIVATION' | 'OFFER' | 'CREATORS') => {
        setStrategyType(type);
        if (!logNote) setLogNote(STRATEGY_TEMPLATES[type]);
    };

    const handleOpenStrategy = async () => {
        if (!newStrategy.title.trim() || !newStrategy.actionPlan.trim()) {
            addToast({ type: 'error', message: 'Título e plano de ação são obrigatórios.' });
            return;
        }

        const strategyData = sanitizeForFirestore({
            id: `strat_${Date.now()}`,
            title: newStrategy.title,
            type: newStrategy.type,
            impact: newStrategy.impact,
            objective: newStrategy.objective,
            actionPlan: newStrategy.actionPlan,
            startedAt: new Date().toISOString(),
            status: 'ACTIVE'
        }) as ActiveStrategy;

        setLocalActiveStrategy(strategyData);

        try {
            await db.collection('producers').doc(producer.id).update({
                'tracking_metadata.active_strategy': strategyData
            });

            await logTimelineEvent('SYSTEM_LOG', 'SYSTEM', `Ciclo Estratégico Iniciado: ${newStrategy.title} [${newStrategy.type}]`, { 
                strategyId: strategyData.id, 
                action: 'STRATEGY_OPEN',
                details: strategyData
            });

            addToast({ type: 'success', message: 'Estratégia ativada com sucesso.' });
            setNewStrategy({ type: 'GROWTH', impact: 'MEDIUM', title: '', objective: '', actionPlan: '' });
        } catch (error) {
            setLocalActiveStrategy(null);
            addToast({ type: 'error', message: 'Erro ao ativar estratégia.' });
        }
    };

    const handleUpdateStrategy = async () => {
        if (!localActiveStrategy || !strategyUpdateText.trim()) return;
        try {
            await logTimelineEvent('NOTE', 'NOTE', `[Evolução Estratégica]: ${strategyUpdateText}`, {
                strategyId: localActiveStrategy.id,
                action: 'STRATEGY_UPDATE',
                isInternal: true
            });
            setStrategyUpdateText('');
            addToast({ type: 'success', message: 'Progresso registrado.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar.' });
        }
    };

    const handleResolveStrategy = async () => {
        if (!localActiveStrategy) return;
        
        const archivedData = sanitizeForFirestore({
            ...localActiveStrategy,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
            resultNote: strategyResultNote || "Ciclo concluído."
        }) as ArchivedStrategy;

        lastResolvedStrategyIdRef.current = localActiveStrategy.id;
        setLocalActiveStrategy(null);
        setIsResolvingStrategy(false);

        try {
            await db.collection('producers').doc(producer.id).update({
                'tracking_metadata.active_strategy': fieldValue.delete(),
                'tracking_metadata.archived_strategies': fieldValue.arrayUnion(archivedData)
            });

            await logTimelineEvent('SYSTEM_LOG', 'SYSTEM', `Ciclo Estratégico Concluído: ${archivedData.title}`, {
                strategyId: archivedData.id,
                action: 'STRATEGY_RESOLVE',
                result: strategyResultNote
            });

            addToast({ type: 'success', message: 'Ciclo estratégico finalizado e arquivado.' });
            setStrategyResultNote('');
        } catch (error) {
            setLocalActiveStrategy(archivedData);
            addToast({ type: 'error', message: 'Erro ao finalizar ciclo.' });
        }
    };

    // --- SUPPORT TICKET HANDLERS ---

    // Helper para evitar erros de 'undefined' no Firestore
    const sanitizeForFirestore = (obj: any) => {
        const sanitized = { ...obj };
        Object.keys(sanitized).forEach(key => {
            if (sanitized[key] === undefined) {
                delete sanitized[key];
            }
        });
        return sanitized;
    };

    const handleOpenTicket = async () => {
        if (!newTicket.title.trim() || !newTicket.description.trim()) {
            addToast({ type: 'error', message: 'Título e descrição são obrigatórios.' });
            return;
        }

        console.log('Abrindo novo ticket:', newTicket.title);
        addToast({ type: 'info', message: 'Abrindo chamado...' });

        const ticketData = sanitizeForFirestore({
            id: `ticket_${Date.now()}`,
            title: newTicket.title,
            type: newTicket.type,
            priority: newTicket.priority,
            description: newTicket.description,
            externalId: newTicket.externalId || '',
            openedAt: new Date().toISOString(),
            status: 'OPEN'
        }) as ActiveTicket;

        // Optimistic UI Update
        setLocalActiveTicket(ticketData);

        try {
            // Atualiza Producer com ticket ativo
            await db.collection('producers').doc(producer.id).update({
                'tracking_metadata.active_ticket': ticketData
            });

            // Log de Abertura
            await logTimelineEvent('SYSTEM_LOG', 'SYSTEM', `Ticket Aberto: ${newTicket.title} (#${newTicket.type})`, { 
                ticketId: ticketData.id, 
                action: 'TICKET_OPEN',
                details: ticketData
            });

            addToast({ type: 'success', message: 'Chamado aberto com sucesso.' });
            
            // Reset form
            setNewTicket({
                type: 'BUG',
                priority: 'MEDIUM',
                title: '',
                description: '',
                externalId: ''
            });

        } catch (error) {
            console.error(error);
            setLocalActiveTicket(null); // Revert
            addToast({ type: 'error', message: 'Erro ao abrir chamado.' });
        }
    };

    const handleTicketUpdate = async () => {
        if (!localActiveTicket || !ticketUpdateText.trim()) return;

        try {
            await logTimelineEvent('NOTE', 'NOTE', `[Atualização Ticket]: ${ticketUpdateText}`, {
                ticketId: localActiveTicket.id,
                action: 'TICKET_UPDATE',
                isInternal: true
            });
            setTicketUpdateText('');
            addToast({ type: 'success', message: 'Atualização registrada.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar.' });
        }
    };

    const handleResolveTicket = async () => {
        if (!localActiveTicket) {
            console.warn('Tentativa de resolver ticket sem ticket ativo local.');
            return;
        }
        
        console.log('Resolvendo ticket:', localActiveTicket.id);
        
        const resolutionNote = ""; 

        const archivedData = sanitizeForFirestore({
            ...localActiveTicket,
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            resolutionNote: resolutionNote || "" // Use empty string instead of undefined
        }) as ArchivedTicket;

        // 1. Guardamos o ID para bloquear reversão via props
        lastResolvedIdRef.current = localActiveTicket.id;

        // 2. Optimistic UI Update
        setLocalActiveTicket(null);
        addToast({ type: 'info', message: 'Processando resolução...' });

        try {
            // Remove ticket ativo e arquiva
            await db.collection('producers').doc(producer.id).update({
                'tracking_metadata.active_ticket': fieldValue.delete(),
                'tracking_metadata.archived_tickets': fieldValue.arrayUnion(archivedData)
            });

            await logTimelineEvent('SYSTEM_LOG', 'SYSTEM', `Ticket Resolvido: ${archivedData.title} ${resolutionNote ? `(Nota: ${resolutionNote})` : ''}`, {
                ticketId: archivedData.id,
                action: 'TICKET_RESOLVE'
            });

            addToast({ type: 'success', message: 'Chamado encerrado e arquivado.' });

        } catch (error) {
            console.error(error);
            setLocalActiveTicket(archivedData); // Revert (kinda)
            addToast({ type: 'error', message: 'Erro ao resolver.' });
        }
    };

    const handleMoveToNext = () => {
        console.log('handleMoveToNext triggered, nextStep:', nextStep);
        if (nextStep) {
            onUpdateStatus(nextStep, 'Movido via Command Center');
        }
    };

    // --- RENDER PERFIL ---
    // --- PERFIL STATE ---
    const [localData, setLocalData] = useState({
        nome_display: producer.nome_display || '',
        email_contato: producer.email_contato || '',
        whatsapp_contato: producer.whatsapp_contato || '',
        produto_principal: producer.produto_principal || '',
        plataforma_origem: producer.plataforma_origem || '',
        gerente_conta: producer.gerente_conta || ''
    });

    useEffect(() => {
        setLocalData({
            nome_display: producer.nome_display || '',
            email_contato: producer.email_contato || '',
            whatsapp_contato: producer.whatsapp_contato || '',
            produto_principal: producer.produto_principal || '',
            plataforma_origem: producer.plataforma_origem || '',
            gerente_conta: producer.gerente_conta || ''
        });
    }, [producer]);

    const renderPerfilContent = () => {
        const handleUpdate = async (field: string, value: string) => {
            if (producer[field as keyof Producer] !== value) {
                try {
                    await db.collection('producers').doc(producer.id).update({ [field]: value });
                    addToast({ type: 'success', message: 'Dado atualizado com sucesso' });
                } catch (error) {
                    addToast({ type: 'error', message: 'Erro ao atualizar' });
                }
            }
        };

        return (
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Dados do Cliente</h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">Informações de contato e negócio.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Contato */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-4 bg-brand-500 rounded-full"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contato</h4>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">Nome</label>
                                <input 
                                    type="text" 
                                    value={localData.nome_display}
                                    onChange={(e) => setLocalData({ ...localData, nome_display: e.target.value })}
                                    onBlur={(e) => handleUpdate('nome_display', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">Email</label>
                                <input 
                                    type="email" 
                                    value={localData.email_contato}
                                    onChange={(e) => setLocalData({ ...localData, email_contato: e.target.value })}
                                    onBlur={(e) => handleUpdate('email_contato', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">WhatsApp</label>
                                <input 
                                    type="text" 
                                    value={localData.whatsapp_contato}
                                    onChange={(e) => setLocalData({ ...localData, whatsapp_contato: e.target.value })}
                                    onBlur={(e) => handleUpdate('whatsapp_contato', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Negócio */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Negócio</h4>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">Produto Principal</label>
                                <input 
                                    type="text" 
                                    value={localData.produto_principal}
                                    onChange={(e) => setLocalData({ ...localData, produto_principal: e.target.value })}
                                    onBlur={(e) => handleUpdate('produto_principal', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">Plataforma</label>
                                <input 
                                    type="text" 
                                    value={localData.plataforma_origem}
                                    onChange={(e) => setLocalData({ ...localData, plataforma_origem: e.target.value })}
                                    onBlur={(e) => handleUpdate('plataforma_origem', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 ml-1">Gerente de Conta</label>
                                <select
                                    value={localData.gerente_conta}
                                    onChange={(e) => {
                                        setLocalData({ ...localData, gerente_conta: e.target.value });
                                        handleUpdate('gerente_conta', e.target.value);
                                    }}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                >
                                    <option value="">Sem gerente</option>
                                    {teamMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER ETAPA ---
    const renderEtapaContent = () => {
        if (currentStatus === 'EM_SUPORTE') {
            return (
                <div className="bg-slate-50/30 rounded-[2.5rem] p-1.5 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-2 h-full ${theme.accent.replace('border-l-', 'bg-')}`}></div>
                    
                    {localActiveTicket ? (
                        // --- DASHBOARD TICKET ATIVO (SUPORTE DE ELITE) ---
                        <div className="flex flex-col min-h-[500px] flex-1">
                            {/* Header de Comando do Ticket */}
                            <div className="px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-2">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${PRIORITY_STYLES[localActiveTicket.priority].bg} ${PRIORITY_STYLES[localActiveTicket.priority].text} ${PRIORITY_STYLES[localActiveTicket.priority].border} flex items-center gap-2 shadow-sm`}>
                                            {React.createElement(PRIORITY_STYLES[localActiveTicket.priority].icon, { size: 10 })}
                                            {PRIORITY_STYLES[localActiveTicket.priority].label}
                                        </span>
                                        <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                                            ID: {localActiveTicket.externalId || localActiveTicket.id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none">{localActiveTicket.title}</h3>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.15em] block mb-1.5">SLA Status</span>
                                    <div className="flex items-center justify-end gap-2 text-indigo-600 font-black bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
                                        <Timer size={14}/> 
                                        {Math.floor((Date.now() - new Date(localActiveTicket.openedAt).getTime()) / (1000 * 60 * 60))}h Ativo
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* Detalhes & Feed Estilo Log */}
                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/50 space-y-8">
                                    
                                    {/* Descrição do Problema (Glass Card) */}
                                    <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <AlignLeft size={14}/> Contexto Técnico
                                        </h4>
                                        <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{localActiveTicket.description}</p>
                                    </div>

                                    {/* Feed de Atualizações (Log de Sistema) */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-slate-200"></div>
                                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em]">Registro de Atividades</span>
                                            <div className="h-px flex-1 bg-slate-200"></div>
                                        </div>
                                        
                                        {timeline.filter(t => t.metadata?.ticketId === localActiveTicket.id || t.type === 'NOTE').slice(0, 5).map((event, idx) => (
                                            <div key={idx} className="flex gap-4 animate-in slide-in-from-bottom-2">
                                                <div className="mt-1">
                                                    <Avatar name={event.authorName || 'Sistema'} src="" alt={event.authorName || 'Sistema'} className="w-10 h-10 rounded-2xl border border-slate-100 bg-white shadow-sm"/>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm max-w-[85%]">
                                                    <div className="flex justify-between items-baseline mb-2 gap-6">
                                                        <span className="text-xs font-black text-slate-900 tracking-tight">{event.authorName}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{formatDate(event.timestamp)}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{event.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Input Area (Command Header Style) */}
                            <div className="px-10 py-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-4 items-end">
                                <div className="flex-1 relative group">
                                    {teamMembers.length === 0 && (
                                        <div className="absolute -top-5 left-2 text-[9px] text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse z-10">
                                            Carregando membros...
                                        </div>
                                    )}
                                    <MentionsInput
                                        value={ticketUpdateText || ''}
                                        onChange={e => setTicketUpdateText(e.target.value || '')}
                                        placeholder="Adicionar atualização técnica... Use @ para mencionar"
                                        className="mentions-input w-full bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm p-4 min-h-[100px] resize-none"
                                        suggestionsPortalHost={document.body}
                                        allowSuggestionsAboveCursor={true}
                                    >
                                        <Mention
                                            trigger="@"
                                            data={searchMembers}
                                            displayTransform={(id, display) => `@${display || id || 'Usuário'}`}
                                            markup="@[__display__](__id__)"
                                            className="bg-indigo-100 text-indigo-700 font-bold px-0.5 rounded"
                                            appendSpaceOnAdd
                                            renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
                                                <div className={`flex items-center gap-3 px-4 py-2 ${focused ? 'bg-slate-50' : ''}`}>
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 uppercase">
                                                        {suggestion.display ? String(suggestion.display).charAt(0) : '?'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{highlightedDisplay}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Membro da Equipe</span>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </MentionsInput>
                                    <MessageSquare size={16} className="absolute top-4 right-4 text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors"/>
                                </div>
                                <button 
                                    onClick={handleTicketUpdate} 
                                    disabled={!ticketUpdateText.trim()} 
                                    className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all disabled:opacity-50 shadow-sm border border-indigo-100"
                                >
                                    <Send size={20}/>
                                </button>
                                <div className="w-px h-10 bg-slate-200 mx-2"></div>
                                <button 
                                    onClick={handleResolveTicket}
                                    className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-100 flex items-center gap-3 transform active:scale-95"
                                >
                                    <CheckCircle2 size={18}/> Resolver Ticket
                                </button>
                            </div>
                        </div>
                    ) : (
                        // --- FORMULÁRIO DE ABERTURA (SUPORTE DE ELITE) ---
                        <div className="flex flex-col lg:flex-row min-h-[450px] flex-1 transition-all duration-500 ease-in-out">
                            <div className="w-full lg:w-[280px] p-5 lg:p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 bg-white/60 backdrop-blur-xl">
                                <div className="flex items-center gap-2.5 text-indigo-700 font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                                     <LifeBuoy size={16} className="text-indigo-500"/> Novo Chamado
                                 </div>
                                 
                                 <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-1">
                                     <div className="space-y-2.5">
                                         <div className="flex items-center justify-between">
                                             <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] block">Categoria</label>
                                             <Tag size={10} className="text-slate-300" />
                                         </div>
                                         <div className="grid grid-cols-2 gap-2">
                                             {(Object.keys(TICKET_TYPES) as TicketType[]).map(type => (
                                                 <button 
                                                     key={type} 
                                                     onClick={() => setNewTicket({...newTicket, type})} 
                                                     className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 group relative overflow-hidden ${newTicket.type === type ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}
                                                 >
                                                     <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${newTicket.type === type ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                         {React.createElement(TICKET_TYPES[type].icon, { size: 12 })}
                                                     </div>
                                                     <span className="text-[9px] font-black tracking-tight leading-tight">{TICKET_TYPES[type].label}</span>
                                                 </button>
                                             ))}
                                         </div>
                                     </div>

                                     <div className="space-y-2.5">
                                         <div className="flex items-center justify-between">
                                             <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] block">Prioridade</label>
                                             <Flame size={10} className="text-slate-300" />
                                         </div>
                                         <div className="flex flex-col gap-1.5">
                                             {(Object.keys(PRIORITY_STYLES) as TicketPriority[]).map(p => (
                                                 <button 
                                                     key={p} 
                                                     onClick={() => setNewTicket({...newTicket, priority: p})} 
                                                     className={`flex items-center justify-between p-2 rounded-xl border transition-all group ${newTicket.priority === p ? `${PRIORITY_STYLES[p].bg} ${PRIORITY_STYLES[p].border} ring-2 ring-indigo-500/5 shadow-sm` : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}
                                                 >
                                                     <div className="flex items-center gap-2">
                                                         <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${newTicket.priority === p ? 'bg-white shadow-sm' : 'bg-slate-50 group-hover:bg-white transition-colors'}`}>
                                                             {React.createElement(PRIORITY_STYLES[p].icon, { size: 10, className: PRIORITY_STYLES[p].text })}
                                                         </div>
                                                         <span className={`text-[9px] font-bold tracking-tight ${newTicket.priority === p ? PRIORITY_STYLES[p].text : 'text-slate-500'}`}>{PRIORITY_STYLES[p].label}</span>
                                                     </div>
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                            </div>

                            <div className="flex-1 p-5 lg:p-8 bg-slate-50/30 relative flex flex-col overflow-y-auto custom-scrollbar">
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-9 space-y-2">
                                            <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] block ml-1">Título do Problema</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                                    <Type size={14} />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={newTicket.title} 
                                                    onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
                                                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:font-normal placeholder:text-slate-300 shadow-sm"
                                                    placeholder="Ex: Erro na integração de pagamentos..."
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] block ml-1">ID Externo</label>
                                            <div className="relative group">
                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                                    <Hash size={12} />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    value={newTicket.externalId} 
                                                    onChange={e => setNewTicket({...newTicket, externalId: e.target.value})} 
                                                    className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-600 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm placeholder:text-slate-300"
                                                    placeholder="#12345"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] block">Descrição Detalhada</label>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Markdown Suportado</span>
                                        </div>
                                        <div className="relative group">
                                            <textarea 
                                                value={newTicket.description} 
                                                onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                                                className="w-full p-5 text-sm text-slate-700 font-medium leading-relaxed outline-none resize-none bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 min-h-[140px]" 
                                                placeholder="Descreva o problema, passos para reproduzir e impacto técnico..."
                                            />
                                            <div className="absolute bottom-4 right-4 text-slate-100 pointer-events-none group-focus-within:text-indigo-50 transition-colors">
                                                <AlignLeft size={32} strokeWidth={1} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                                        <button 
                                            onClick={() => {
                                                onClose();
                                                onUpdateStatus('EM_ANDAMENTO', 'Suporte técnico concluído');
                                            }}
                                            className="px-5 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-sm"
                                        >
                                            <CheckCircle2 size={14} className="text-emerald-500"/> Concluir Suporte
                                        </button>
                                        
                                        <button 
                                            onClick={handleOpenTicket} 
                                            disabled={!newTicket.title || !newTicket.description}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 disabled:shadow-none hover:-translate-y-0.5 active:scale-95"
                                        >
                                            <LifeBuoy size={16}/> Abrir Chamado Técnico
                                        </button>
                                    </div>
                                </div>

                                {/* --- HISTÓRICO DE TICKETS RESOLVIDOS --- */}
                                {archivedTickets.length > 0 && (
                                    <div className="mt-12 pt-8 border-t border-slate-200">
                                        <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <History size={14}/> Histórico de Resoluções
                                        </h4>
                                        <div className="space-y-4">
                                            {archivedTickets.map((ticket, i) => (
                                                <div key={i} className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all group opacity-80 hover:opacity-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-black text-slate-900 text-xs flex items-center gap-2 tracking-tight">
                                                            {React.createElement(TICKET_TYPES[ticket.type]?.icon || Bug, { size: 14, className: 'text-slate-400' })}
                                                            {ticket.title}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400">{formatDate(ticket.resolvedAt || ticket.openedAt)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 line-clamp-1 font-medium italic">"{ticket.resolutionNote || ticket.description}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

                if (currentStatus === 'ACAO_ESTRATEGICA') {
            return (
                <div className="bg-[#F8FAFC] rounded-[2.5rem] p-1.5 border border-slate-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                    
                    {localActiveStrategy ? (
                        // --- DASHBOARD ESTRATÉGIA ATIVA (ELITE DOSSIER UI) ---
                        <div className="flex flex-col min-h-[600px] flex-1">
                                    {/* Header de Comando - Estilo Dossier */}
                                    <div className="px-8 py-8 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/30 rounded-full blur-3xl -mr-24 -mt-24"></div>
                                        <div className="space-y-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm">
                                                    {React.createElement(STRATEGY_CONFIG[localActiveStrategy.type].icon, { size: 12, className: "text-indigo-600" })}
                                                    <span className="text-[9px] font-black text-indigo-700 uppercase tracking-[0.15em]">{STRATEGY_CONFIG[localActiveStrategy.type].label}</span>
                                                </div>
                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${localActiveStrategy.impact === 'HIGH' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${localActiveStrategy.impact === 'HIGH' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">Impacto {localActiveStrategy.impact}</span>
                                                </div>
                                            </div>
                                            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter leading-[0.95] max-w-xl">{localActiveStrategy.title}</h3>
                                            <div className="flex items-center gap-6 text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-300" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(localActiveStrategy.startedAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-slate-300" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{currentUser?.nome?.split(' ')[0] || 'Time'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl flex flex-col items-center justify-center min-w-[140px] transform hover:scale-105 transition-all duration-500 border border-slate-800 relative group/timer">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">Tempo de Ciclo</span>
                                            <div className="text-3xl font-black font-mono tracking-tighter flex items-baseline gap-1 relative z-10">
                                                {Math.floor((Date.now() - new Date(localActiveStrategy.startedAt).getTime()) / (1000 * 60 * 60 * 24))}
                                                <span className="text-[10px] text-slate-600 uppercase font-sans tracking-widest">Dias</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                        {/* Coluna de Detalhes (Esquerda) */}
                                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8 border-r border-slate-100 bg-white">
                                            <div className="grid grid-cols-1 gap-6">
                                                <section className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                                            <Target size={16} />
                                                        </div>
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objetivo Estratégico</h4>
                                                    </div>
                                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner relative overflow-hidden">
                                                        <p className="text-xl font-black text-slate-800 leading-tight tracking-tight">"{localActiveStrategy.objective || "Definir norte..."}"</p>
                                                    </div>
                                                </section>

                                                <section className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                                            <Rocket size={16} />
                                                        </div>
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Plano de Execução</h4>
                                                    </div>
                                                    <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group/plan">
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap relative z-10">{localActiveStrategy.actionPlan}</p>
                                                    </div>
                                                </section>
                                            </div>
                                        </div>

                                        {/* Coluna de Evolução (Direita) */}
                                        <div className="w-full lg:w-[320px] bg-slate-50/50 p-8 overflow-y-auto custom-scrollbar flex flex-col">
                                            <div className="flex items-center justify-between mb-8">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Log de Evolução</h4>
                                                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest">Histórico</div>
                                            </div>

                                            <div className="space-y-6 flex-1">
                                                {timeline.filter(t => t.metadata?.strategyId === localActiveStrategy.id).length > 0 ? (
                                                    timeline.filter(t => t.metadata?.strategyId === localActiveStrategy.id).slice(0, 8).map((event, idx) => (
                                                        <div key={idx} className="flex gap-4 group/item relative">
                                                            <div className="flex flex-col items-center relative z-10">
                                                                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover/item:border-indigo-300 group-hover/item:text-indigo-600 transition-all">
                                                                    <MessageSquare size={14} />
                                                                </div>
                                                                <div className="w-px flex-1 bg-slate-200 my-2 group-last/item:hidden"></div>
                                                            </div>
                                                            <div className="flex-1 pb-6">
                                                                <div className="flex justify-between items-center mb-1.5">
                                                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-tight bg-slate-100 px-1.5 py-0.5 rounded">{event.authorName?.split(' ')[0]}</span>
                                                                    <span className="text-[8px] font-mono font-bold text-slate-400">{formatDate(event.timestamp)}</span>
                                                                </div>
                                                                <div className="p-3 bg-white/50 rounded-xl border border-transparent group-hover/item:border-slate-100 group-hover/item:bg-white transition-all">
                                                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{event.content}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                                        <History size={16} className="text-slate-300 mb-2" />
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sem atualizações</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                            {/* Footer de Ações - Estilo Command Bar */}
                            <div className="px-8 py-6 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-6 items-stretch md:items-center">
                                <div className="flex-1 relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-all">
                                        <Sparkles size={18} />
                                    </div>
                                    <input 
                                        type="text"
                                        value={strategyUpdateText}
                                        onChange={e => setStrategyUpdateText(e.target.value)}
                                        placeholder="Registrar progresso..."
                                        className="w-full pl-12 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-[2rem] text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-inner"
                                    />
                                    <button 
                                        onClick={handleUpdateStrategy} 
                                        disabled={!strategyUpdateText.trim()} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-lg shadow-indigo-200"
                                    >
                                        <Send size={16}/>
                                    </button>
                                </div>
                                <div className="w-px h-10 bg-slate-100 hidden md:block"></div>
                                <button 
                                    onClick={() => setIsResolvingStrategy(true)}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-lg flex items-center justify-center gap-3 transform active:scale-95 group"
                                >
                                    <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform"/> Finalizar Ciclo
                                </button>
                            </div>

                            {/* Modal de Finalização - Estilo Apple Sheet */}
                            {isResolvingStrategy && (
                                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-xl p-12 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-10 duration-500">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                                        <Rocket size={40} className="text-indigo-600" />
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Relatório de Resultados</h3>
                                    <p className="text-slate-500 mb-10 max-w-md text-lg font-medium leading-relaxed">Antes de arquivar este ciclo, registre os principais aprendizados e métricas alcançadas.</p>
                                    
                                    <div className="w-full max-w-2xl relative group">
                                        <textarea 
                                            value={strategyResultNote}
                                            onChange={e => setStrategyResultNote(e.target.value)}
                                            placeholder="Descreva o impacto final... (Ex: ROI de 4.5x, aumento de 15% na retenção)"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-[3rem] p-10 text-base font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all min-h-[200px] shadow-inner placeholder:text-slate-300"
                                        />
                                    </div>
                                    
                                    <div className="flex gap-6 mt-10">
                                        <button onClick={() => setIsResolvingStrategy(false)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">Manter Ativo</button>
                                        <button onClick={handleResolveStrategy} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all transform hover:-translate-y-1">Arquivar Ciclo</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- CENTRO DE ESTRATÉGIA (CRIAÇÃO ELITE STUDIO) ---
                        <div className="flex flex-col lg:flex-row min-h-[450px] flex-1 transition-all duration-700 ease-in-out">
                            {/* Sidebar de Configuração */}
                            <div className="w-full lg:w-[280px] p-5 lg:p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 bg-white">
                                <div className="flex items-center gap-2.5 text-indigo-600 font-black text-[9px] uppercase tracking-[0.25em] mb-6">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <Zap size={14} className="fill-indigo-100"/>
                                    </div>
                                    Centro de Estratégia
                                </div>
                                
                                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
                                    <div className="space-y-2.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Arquitetura do Plano</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {(Object.keys(STRATEGY_CONFIG) as StrategyType[]).map(type => (
                                                <button 
                                                    key={type} 
                                                    onClick={() => setNewStrategy({...newStrategy, type})} 
                                                    className={`p-3 rounded-[1.25rem] border text-left transition-all flex items-center gap-3 group relative overflow-hidden ${newStrategy.type === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200/50' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50 shadow-sm'}`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${newStrategy.type === type ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-white shadow-inner'}`}>
                                                        {React.createElement(STRATEGY_CONFIG[type].icon, { size: 16 })}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={`text-[10px] font-black tracking-tight block mb-0.5 ${newStrategy.type === type ? 'text-white' : 'text-slate-900'}`}>{STRATEGY_CONFIG[type].label}</span>
                                                        <span className={`text-[8px] font-medium leading-tight block ${newStrategy.type === type ? 'text-indigo-100' : 'text-slate-400'}`}>{STRATEGY_CONFIG[type].description}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Impacto Estratégico</label>
                                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                            {(['LOW', 'MEDIUM', 'HIGH'] as StrategyImpact[]).map(level => (
                                                <button 
                                                    key={level} 
                                                    onClick={() => setNewStrategy({...newStrategy, impact: level})} 
                                                    className={`flex-1 py-1.5 text-[8px] font-black rounded-md transition-all uppercase tracking-widest ${newStrategy.impact === level ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Editor de Estratégia */}
                            <div className="flex-1 p-5 lg:p-8 bg-white relative flex flex-col overflow-y-auto custom-scrollbar">
                                <div className="max-w-3xl mx-auto w-full space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">Identificação do Ciclo</label>
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                value={newStrategy.title} 
                                                onChange={e => setNewStrategy({...newStrategy, title: e.target.value})} 
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-base font-black text-slate-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:font-bold placeholder:text-slate-300 shadow-sm"
                                                placeholder="Ex: Escala de Tráfego - Q2 2024"
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-indigo-200 transition-colors">
                                                <Type size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block ml-1">Objetivo Principal (KPI)</label>
                                        <div className="relative group">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:scale-110 transition-transform">
                                                <Target size={18} />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={newStrategy.objective} 
                                                onChange={e => setNewStrategy({...newStrategy, objective: e.target.value})} 
                                                className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 border border-indigo-100 rounded-[1.5rem] text-sm font-black text-indigo-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm placeholder:text-indigo-200"
                                                placeholder="Ex: Bater R$ 500k de faturamento mensal"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block">Plano de Ação Detalhado</label>
                                            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                                                <AlignLeft size={9} /> Passo a Passo
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <textarea 
                                                value={newStrategy.actionPlan} 
                                                onChange={e => setNewStrategy({...newStrategy, actionPlan: e.target.value})} 
                                                className="w-full p-6 text-xs text-slate-700 font-medium leading-relaxed outline-none resize-none bg-slate-50 rounded-[2rem] shadow-sm border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-300 min-h-[200px]" 
                                                placeholder="Descreva as etapas práticas, canais e mecânicas da ação..."
                                            />
                                            <div className="absolute bottom-5 right-5 opacity-10 pointer-events-none">
                                                <Rocket size={32} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button 
                                            onClick={handleOpenStrategy} 
                                            disabled={!newStrategy.title || !newStrategy.actionPlan}
                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:shadow-none hover:-translate-y-0.5 active:scale-95 group"
                                        >
                                            <Rocket size={18} className="group-hover:animate-bounce"/> Iniciar Ciclo Estratégico
                                        </button>
                                    </div>
                                </div>
                                
                                {/* --- HISTÓRICO DE ESTRATÉGIAS - ESTILO DOSSIER --- */}
                                {archivedStrategies.length > 0 && (
                                    <div className="mt-20 pt-12 border-t border-slate-100 max-w-3xl mx-auto w-full">
                                        <div className="flex items-center justify-between mb-10">
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                                <History size={16}/> Arquivo de Ciclos
                                            </h4>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{archivedStrategies.length} Planos Concluídos</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {archivedStrategies.map((strat, i) => (
                                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-200 hover:shadow-[0_30px_60px_rgba(79,70,229,0.08)] transition-all group cursor-pointer relative overflow-hidden flex flex-col min-h-[180px]">
                                                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] group-hover:scale-125 transition-all duration-700">
                                                        {React.createElement(STRATEGY_CONFIG[strat.type]?.icon || Zap, { size: 100 })}
                                                    </div>
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all shadow-sm border border-slate-100">
                                                            {React.createElement(STRATEGY_CONFIG[strat.type]?.icon || Zap, { size: 18 })}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Concluído em</span>
                                                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{formatDate(strat.completedAt)}</span>
                                                        </div>
                                                    </div>
                                                    <h5 className="font-black text-slate-900 text-base mb-3 tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">{strat.title}</h5>
                                                    <p className="text-xs text-slate-500 font-medium italic line-clamp-2 leading-relaxed flex-1">"{strat.resultNote || strat.objective}"</p>
                                                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // --- NOVA IMPLEMENTAÇÃO: AGUARDANDO RETORNO (Follow-up Manager) ---
        if (currentStatus === 'AGUARDANDO_RETORNO') {
            const nextReminder = tasks.find(t => t.status === 'PENDING' && new Date(t.dueDate) > new Date()) || null;
            
            const handleQuickTask = async (title: string, daysToAdd: number, customDate?: string, assigneeType: 'ME' | 'CLIENT' = 'ME') => {
                try {
                    let dueDateStr = '';
                    if (customDate) {
                        const parsedDate = new Date(customDate);
                        if (isNaN(parsedDate.getTime())) {
                            throw new Error("Data inválida");
                        }
                        dueDateStr = customDate;
                    } else {
                        const d = new Date();
                        d.setDate(d.getDate() + daysToAdd);
                        dueDateStr = d.toISOString().split('T')[0];
                    }
                    
                    const finalTitle = assigneeType === 'CLIENT' ? `[Cliente] ${title}` : title;
                    const assignedTo = currentUser?.id ? [currentUser.id] : [];
                    const responsibility = assigneeType === 'CLIENT' ? 'CLIENT' : 'B4YOU';
                    
                    const taskRef = db.collection('tasks').doc();
                    await taskRef.set({
                        id: taskRef.id,
                        title: finalTitle,
                        description: `Follow-up agendado no painel de ${producer.nome_display}`,
                        dueDate: dueDateStr,
                        priority: 'HIGH',
                        status: 'PENDING',
                        type: 'REMINDER',
                        responsibility: responsibility,
                        leadId: producer.id,
                        userId: currentUser?.id,
                        assignedTo: assignedTo,
                        creatorName: currentUser?.nome,
                        createdAt: fieldValue.serverTimestamp(),
                        updatedAt: fieldValue.serverTimestamp()
                    });
                    
                    await logTimelineEvent('TASK_UPDATE', 'TASK', `Lembrete agendado: "${finalTitle}" para ${new Date(dueDateStr).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}`, { taskId: taskRef.id, action: 'CREATE' });
                    addToast({ type: 'success', message: 'Lembrete agendado com sucesso!' });
                } catch (error) {
                    console.error(error);
                    addToast({ type: 'error', message: 'Erro ao agendar lembrete' });
                }
            };

            const handleCreateCustomReminder = () => {
                if (!customReminderTitle.trim() || !customReminderDate) return;
                handleQuickTask(customReminderTitle, 0, customReminderDate, reminderAssignee);
                setCustomReminderTitle('');
                setCustomReminderDate('');
                setReminderAssignee('ME');
                setIsCustomReminderOpen(false);
            };

            return (
                <div className="bg-gradient-to-br from-[#FFFBF0] to-white rounded-[2rem] p-1.5 border border-amber-100/50 shadow-sm relative group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400/80 rounded-l-[2rem]"></div>
                    <div className="flex flex-col min-h-[400px] flex-1 p-6">
                        
                        {/* Header de Status */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="flex items-center gap-2 text-amber-700 font-black text-sm uppercase tracking-widest mb-2">
                                    <Clock size={16} className="text-amber-500 fill-amber-100"/> Aguardando Cliente
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gestão de Follow-up</h2>
                                <p className="text-gray-500 mt-1 font-medium">Gerencie os lembretes para não perder o timing da cobrança.</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tempo de Espera</span>
                                <div className="text-lg font-black text-amber-500 font-mono tracking-tighter">
                                    <TimeInStageBadge 
                                        statusUpdatedAt={producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || producer.lastContactAt} 
                                        stageType="NORMAL"
                                    />
                                </div>
                                {/* Barra de progresso visual */}
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${silenceTime.days > 3 ? 'bg-rose-500' : silenceTime.days > 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min((silenceTime.days / 5) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                            {/* Coluna 1: Próximo Lembrete (Ticket Premium) */}
                            <div className="relative bg-white rounded-[2rem] border border-amber-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex flex-col overflow-hidden group/ticket">
                                {/* Ticket Cutouts */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FFFBF0] rounded-full border-r border-amber-100/60"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#FFFBF0] rounded-full border-l border-amber-100/60"></div>
                                
                                <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover/ticket:scale-110 transition-transform duration-700">
                                    <Bell size={120} className="text-amber-900"/>
                                </div>
                                
                                <div className="flex items-center justify-between mb-5 z-10">
                                    <h3 className="text-xs font-black text-amber-800/50 uppercase tracking-[0.2em]">Próximo Lembrete</h3>
                                    {nextReminder && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                                </div>
                                
                                {nextReminder ? (
                                    <div className="flex-1 flex flex-col justify-center z-10">
                                        <div className="text-5xl font-black text-gray-900 mb-2 tracking-tighter">
                                            {new Date(nextReminder.dueDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                        </div>
                                        <div className="text-lg font-bold text-amber-500 flex items-center gap-2 mb-6">
                                            <Clock size={16}/> 
                                            {new Date(nextReminder.dueDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                        </div>
                                        <div className="mt-auto p-3.5 bg-gradient-to-r from-amber-50 to-transparent rounded-xl border-l-2 border-amber-400 text-amber-900 text-sm font-medium leading-snug">
                                            "{nextReminder.title}"
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center z-10 opacity-60">
                                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                                            <BellPlus size={20} className="text-amber-400"/>
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">Nenhum lembrete definido</p>
                                        <p className="text-xs text-gray-400 mt-1">Use as ações rápidas ao lado</p>
                                    </div>
                                )}
                            </div>

                            {/* Coluna 2: Ações Rápidas */}
                            <div className="flex flex-col gap-3 justify-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Agendamento em 1-Clique</label>
                                
                                {isCustomReminderOpen ? (
                                    <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2 relative">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-amber-800 text-sm">Lembrete Personalizado</span>
                                            <button onClick={() => setIsCustomReminderOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                                        </div>

                                        <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                                            <button 
                                                onClick={() => setReminderAssignee('ME')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${reminderAssignee === 'ME' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Minha Ação
                                            </button>
                                            <button 
                                                onClick={() => setReminderAssignee('CLIENT')}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${reminderAssignee === 'CLIENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Ação do Cliente
                                            </button>
                                        </div>

                                        <input 
                                            type="text" 
                                            placeholder={reminderAssignee === 'ME' ? "Ex: Ligar para o cliente..." : "Ex: Aguardando envio de documento..."}
                                            value={customReminderTitle}
                                            onChange={e => setCustomReminderTitle(e.target.value)}
                                            className="w-full p-2.5 mb-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                        />
                                        
                                        <div className="relative mb-4" ref={customReminderMenuRef}>
                                            <button 
                                                onClick={() => setIsDateTimePickerOpen(!isDateTimePickerOpen)}
                                                className={`w-full flex items-center justify-between p-3 border rounded-xl text-sm font-medium transition-all ${customReminderDate ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-1.5 rounded-lg ${customReminderDate ? 'bg-amber-100 text-amber-600' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                        <CalendarClock size={16} />
                                                    </div>
                                                    <span className={customReminderDate ? 'font-bold' : ''}>
                                                        {customReminderDate && !isNaN(new Date(customReminderDate).getTime()) 
                                                            ? new Date(customReminderDate).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}).replace(',', ' às') 
                                                            : 'Definir Data e Hora'}
                                                    </span>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform ${isDateTimePickerOpen ? 'rotate-180' : ''} ${customReminderDate ? 'text-amber-600' : 'text-gray-400'}`}/>
                                            </button>
                                            
                                            {isDateTimePickerOpen && (
                                                <DateTimePicker 
                                                    selectedDateTime={customReminderDate}
                                                    onChange={(date) => {
                                                        setCustomReminderDate(date);
                                                        setIsDateTimePickerOpen(false);
                                                    }}
                                                    onClose={() => setIsDateTimePickerOpen(false)}
                                                    align="right"
                                                />
                                            )}
                                        </div>

                                        <button 
                                            onClick={handleCreateCustomReminder}
                                            disabled={!customReminderTitle.trim() || !customReminderDate}
                                            className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Check size={16}/> Agendar Lembrete
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => handleQuickTask('Cobrar retorno do cliente (Amanhã)', 1)}
                                            className="p-4 bg-white border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 rounded-2xl transition-all text-left group shadow-sm hover:shadow-md relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="flex justify-between items-center mb-1 relative z-10">
                                                <span className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Lembrar Amanhã</span>
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all">
                                                    <ArrowRight size={14} className="text-gray-400 group-hover:text-amber-600"/>
                                                </div>
                                            </div>
                                            <p className="text-[11px] leading-tight text-gray-500 relative z-10">Criar tarefa para amanhã cedo</p>
                                        </button>

                                        <button 
                                            onClick={() => handleQuickTask('Follow-up de 3 dias', 3)}
                                            className="p-4 bg-white border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 rounded-2xl transition-all text-left group shadow-sm hover:shadow-md relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="flex justify-between items-center mb-1 relative z-10">
                                                <span className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Daqui a 3 Dias</span>
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all">
                                                    <ArrowRight size={14} className="text-gray-400 group-hover:text-amber-600"/>
                                                </div>
                                            </div>
                                            <p className="text-[11px] leading-tight text-gray-500 relative z-10">Cobrança padrão de meio de semana</p>
                                        </button>

                                        <button 
                                            onClick={() => setIsCustomReminderOpen(true)}
                                            className="p-3 border border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all text-center text-[11px] font-bold text-gray-500 hover:text-amber-600 flex items-center justify-center gap-2"
                                        >
                                            <CalendarClock size={14}/> Personalizar Data e Hora
                                        </button>
                                    </>
                                )}

                                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-3"></div>

                                <button 
                                    onClick={() => {
                                        onClose();
                                        onInitiateTransition(producer, 'EM_ANDAMENTO');
                                    }}
                                    className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 border border-emerald-100 hover:border-emerald-300 rounded-2xl transition-all text-left group shadow-sm hover:shadow-md relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <span className="font-bold text-emerald-800">Cliente Respondeu!</span>
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 group-hover:scale-110 transition-all">
                                            <CheckCircle2 size={16} className="text-emerald-600"/>
                                        </div>
                                    </div>
                                    <p className="text-[11px] leading-tight text-emerald-600 relative z-10">Mover para "Em Tratativa" imediatamente</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- NOVA IMPLEMENTAÇÃO: PRECISA DE CONTATO (SLA Monitor) ---
        if (currentStatus === 'PRECISA_CONTATO') {
            const hoursInStage = Math.floor((Date.now() - (producer.updatedAt?.seconds * 1000 || Date.now())) / (1000 * 60 * 60));
            const slaStatus = hoursInStage < 4 ? 'SAFE' : hoursInStage < 24 ? 'WARNING' : 'CRITICAL';
            
        // Extrair última mensagem/nota para o resumo
        const lastInteraction = timeline.find(t => t.type === 'NOTE' || t.category === 'SYSTEM');
        const interactionSummary = lastInteraction ? lastInteraction.content : "Nenhuma interação recente registrada.";
        const interactionDate = lastInteraction?.timestamp ? new Date(typeof lastInteraction.timestamp === 'number' ? lastInteraction.timestamp : (lastInteraction.timestamp as any).seconds * 1000) : null;

            return (
                <div className="bg-gradient-to-br from-rose-50 to-white rounded-[2rem] p-1.5 border border-rose-100 shadow-sm relative group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-400 rounded-l-[2rem]"></div>
                    <div className="flex flex-col min-h-[400px] flex-1 p-6">
                        
                        {/* Header de Status */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-widest mb-2">
                                    <AlertTriangle size={16} className="text-rose-500 fill-rose-100"/> Ação Necessária
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Iniciar Tratativa</h2>
                                <p className="text-gray-500 mt-1 font-medium">Analise o contexto e inicie o contato com o cliente.</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tempo de Espera</span>
                                <div className="text-lg font-black text-rose-600 font-mono tracking-tighter">
                                    <TimeInStageBadge 
                                        statusUpdatedAt={producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || producer.lastContactAt} 
                                        stageType="NORMAL"
                                    />
                                </div>
                                {/* Barra de progresso visual */}
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full ${slaStatus === 'CRITICAL' ? 'bg-rose-500' : slaStatus === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min((hoursInStage / 24) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                            {/* Coluna 1: Contexto (Ticket Premium) */}
                            <div className="relative bg-white rounded-[2rem] border border-rose-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 flex flex-col overflow-hidden group/ticket">
                                {/* Ticket Cutouts */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-rose-50 rounded-full border-r border-rose-100/60"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-rose-50 rounded-full border-l border-rose-100/60"></div>
                                
                                <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] group-hover/ticket:scale-110 transition-transform duration-700">
                                    <History size={120} className="text-rose-900"/>
                                </div>
                                
                                <div className="flex items-center justify-between mb-5 z-10">
                                    <h3 className="text-xs font-black text-rose-800/50 uppercase tracking-[0.2em]">Último Contexto</h3>
                                </div>
                                
                                <div className="flex-1 flex flex-col justify-center z-10">
                                    {interactionDate && (
                                        <div className="text-sm font-bold text-rose-600 flex items-center gap-2 mb-4">
                                            <Clock size={16}/> 
                                            {interactionDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} às {interactionDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                                        </div>
                                    )}
                                    <div className="mt-auto p-3.5 bg-gradient-to-r from-rose-50 to-transparent rounded-xl border-l-2 border-rose-400 text-rose-900 text-sm font-medium leading-snug">
                                        "{interactionSummary}"
                                    </div>
                                </div>
                            </div>

                            {/* Coluna 2: Ações Rápidas */}
                            <div className="flex flex-col gap-3 justify-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Ações Disponíveis</label>
                                
                                <button 
                                    onClick={() => { onClose(); window.location.hash = `#/inbox?chatId=${producer.whatsapp_contato?.replace(/\D/g,'')}@s.whatsapp.net` }}
                                    className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50/30 border border-emerald-100 hover:border-emerald-300 rounded-2xl transition-all text-left group shadow-sm hover:shadow-md relative overflow-hidden mb-2"
                                >
                                    <div className="absolute inset-0 bg-emerald-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-center mb-2 relative z-10">
                                        <span className="font-bold text-emerald-800 flex items-center gap-2">
                                            <MessageSquare size={16} /> Chamar no WhatsApp
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 group-hover:scale-110 transition-all">
                                            <ArrowRight size={16} className="text-emerald-600"/>
                                        </div>
                                    </div>
                                    <p className="text-[11px] leading-tight text-emerald-600 relative z-10">Abrir conversa para entender o cenário atual.</p>
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => { onClose(); onSendToOnboarding(producer); }}
                                        className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl transition-all text-center group shadow-sm flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Sparkles size={16} className="text-indigo-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-indigo-700">Enviar p/ Onboarding</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => { onClose(); onInitiateTransition(producer, 'AGUARDANDO_RETORNO'); }}
                                        className="p-4 bg-amber-50 border border-amber-200 rounded-2xl transition-all text-center group shadow-sm flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                            <CalendarClock size={16} className="text-amber-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-700">Agendar Retorno</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => { onClose(); onInitiateTransition(producer, 'EM_ANDAMENTO'); }}
                                        className="p-4 bg-blue-50 border border-blue-200 rounded-2xl transition-all text-center group shadow-sm flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <CheckCircle2 size={16} className="text-blue-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-700">Em Tratativa</span>
                                    </button>

                                    <button 
                                        onClick={() => { onClose(); onInitiateTransition(producer, 'EM_SUPORTE'); }}
                                        className="p-4 bg-purple-50 border border-purple-200 rounded-2xl transition-all text-center group shadow-sm flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                            <LifeBuoy size={16} className="text-purple-600" />
                                        </div>
                                        <span className="text-[10px] font-bold text-purple-700">Abrir Chamado</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- NOVA IMPLEMENTAÇÃO: EM ANDAMENTO (Action Hub) ---
        if (currentStatus === 'EM_ANDAMENTO') {
            return (
                <div className="bg-gradient-to-br from-[#F0FDF4] to-white rounded-[2rem] p-1.5 border border-emerald-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
                    
                    {/* Efeito de fundo radial suave */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50/50 rounded-full blur-[60px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                    <div className="flex flex-col min-h-[400px] flex-1 p-6 relative z-10">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase tracking-widest mb-2">
                                    <Activity size={16} className="text-emerald-500 fill-emerald-100"/> Em Tratativa Ativa
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Action Hub</h2>
                                <p className="text-gray-500 mt-1 font-medium">Registre o progresso e defina o próximo passo.</p>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm text-xs font-black text-emerald-600 flex items-center gap-3 uppercase tracking-widest">
                                <div className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </div>
                                Online
                            </div>
                        </div>

                        {/* Área Principal: Registro de Ação */}
                        <div className="flex-1 bg-white rounded-[2rem] border border-emerald-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 mb-6 relative overflow-hidden flex flex-col group/hub">
                            <div className="absolute -bottom-10 -right-10 p-6 opacity-[0.02] group-hover/hub:scale-110 transition-transform duration-700 pointer-events-none">
                                <MessageCircle size={120}/>
                            </div>
                            
                            <h3 className="text-xs font-black text-emerald-800/50 uppercase tracking-[0.2em] mb-4">Registro Rápido</h3>
                            
                            <div className="flex-1 relative">
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="O que está sendo tratado com o cliente agora? Registre detalhes importantes da conversa..."
                                    className="w-full bg-[#FAFAFA] border border-gray-100 rounded-2xl text-sm font-medium outline-none focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-sm p-4 min-h-[120px] resize-none text-gray-700"
                                />
                            </div>
                            
                            <div className="flex justify-between items-center mt-4 relative z-10">
                                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                    <CheckCircle2 size={12}/> Salva no histórico automaticamente
                                </span>
                                <button 
                                    onClick={handleSaveNote}
                                    disabled={!note.trim()}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center gap-2"
                                >
                                    <Send size={16}/> Registrar Interação
                                </button>
                            </div>
                        </div>

                        {/* Ações de Escalonamento / Pausa */}
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => {
                                    onClose();
                                    onInitiateTransition(producer, 'AGUARDANDO_RETORNO');
                                }}
                                className="p-4 bg-white border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 rounded-2xl transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                                        <Clock size={16} className="text-amber-600"/>
                                    </div>
                                    <span className="font-bold text-gray-900 group-hover:text-amber-800 transition-colors">Aguardar Retorno</span>
                                </div>
                                <p className="text-[11px] leading-tight text-gray-500 relative z-10 pl-[52px]">Pausar tratativa e aguardar o cliente responder</p>
                            </button>

                            <button 
                                onClick={() => {
                                    onClose();
                                    onInitiateTransition(producer, 'EM_SUPORTE');
                                }}
                                className="p-4 bg-white border border-gray-100 hover:border-purple-300 hover:bg-purple-50/50 rounded-2xl transition-all text-left group relative overflow-hidden shadow-sm hover:shadow-md"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                        <LifeBuoy size={16} className="text-purple-600"/>
                                    </div>
                                    <span className="font-bold text-gray-900 group-hover:text-purple-800 transition-colors">Abrir Chamado</span>
                                </div>
                                <p className="text-[11px] leading-tight text-gray-500 relative z-10 pl-[52px]">Escalar problema para o suporte técnico</p>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-white p-12 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto mt-10">
                <div className={`p-6 rounded-full bg-gray-50 ${theme.text} mb-2`}>
                    <theme.icon size={64} strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{theme.label}</h3>
                    <p className="text-base text-gray-500 max-w-lg leading-relaxed mx-auto">{theme.description}</p>
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#09090b]/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
            <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 text-[10px] rounded-lg z-[999999] pointer-events-none">
                DEBUG: {teamMembers.length} membros carregados
            </div>
            <div className="bg-[#FAFAFA] rounded-[2.5rem] w-full max-w-6xl h-[92vh] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex overflow-hidden relative border border-white/60 ring-1 ring-white/20 animate-in zoom-in-95 duration-300">
                
                {/* --- LEFT SIDEBAR (PROFILE & INFO) --- */}
                <div className="w-[340px] bg-white border-r border-gray-100 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.015)] overflow-y-auto custom-scrollbar relative hidden lg:flex">
                    <div className="p-6 flex flex-col items-center">
                        <div className="relative mb-6 group cursor-pointer">
                            <div className="p-2 bg-white rounded-[2rem] shadow-[0_8px_16px_rgba(0,0,0,0.06)] border border-gray-50">
                                <Avatar src={producer.foto_url} name={producer.nome_display} alt={producer.nome_display} className="w-28 h-28 rounded-[1.6rem] object-cover transition-transform group-hover:scale-105" />
                            </div>
                            <div className={`absolute -bottom-2 -right-2 p-2 rounded-xl shadow-md border border-white ${producer.stats_financeiros?.health_score > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                <Activity size={16} />
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-black text-gray-900 text-center leading-tight mb-2">{producer.nome_display}</h2>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{producer.produto_principal || 'Expert'}</span>

                        {/* Botões de Ação Rápida */}
                        <div className="flex gap-2 w-full justify-center my-8 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                            <button onClick={() => { onClose(); window.location.hash = `#/inbox?chatId=${producer.whatsapp_contato?.replace(/\D/g,'')}@s.whatsapp.net` }} className="flex-1 py-3 rounded-xl bg-white shadow-sm text-gray-600 hover:text-green-600 hover:shadow-md transition-all flex items-center justify-center gap-2 border border-gray-100 group">
                                <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <button onClick={() => window.open(`mailto:${producer.email_contato}`)} className="flex-1 py-3 rounded-xl hover:bg-white hover:shadow-sm text-gray-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 group">
                                <Mail size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <div className="w-px bg-gray-200 my-1"></div>
                            <button onClick={() => window.open(`https://instagram.com/${producer.instagram_username}`, '_blank')} className="flex-1 py-3 rounded-xl hover:bg-white hover:shadow-sm text-gray-400 hover:text-pink-600 transition-all flex items-center justify-center gap-2 group">
                                <Instagram size={16} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        <div className="w-full space-y-6">
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <User size={14}/> Dados de Contato
                                </h4>
                                <div className="space-y-2">
                                    <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-3 group hover:border-gray-200 transition-colors">
                                        <Mail size={16} className="text-gray-400 group-hover:text-gray-600"/>
                                        <span className="text-sm font-medium text-gray-700 truncate">{producer.email_contato || '-'}</span>
                                    </div>
                                    <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center gap-3 group hover:border-gray-200 transition-colors">
                                        <Phone size={16} className="text-gray-400 group-hover:text-gray-600"/>
                                        <span className="text-sm font-medium text-gray-700 truncate">{producer.whatsapp_contato || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Briefcase size={14}/> Negócio
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Plataforma</span>
                                        <span className="text-sm font-bold text-gray-900">{producer.plataforma_origem}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Health Score</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${producer.stats_financeiros?.health_score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <span className="text-sm font-bold text-gray-900">{producer.stats_financeiros?.health_score || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumo de Atividade */}
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Activity size={14}/> Resumo de Atividade
                                </h4>
                                <div className="space-y-2">
                                    <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Rocket size={14} className="text-indigo-500" />
                                            <span className="text-xs font-bold text-gray-600">Lançamentos Ativos</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">{launches.filter(l => l.status !== 'FINALIZADO').length}</span>
                                    </div>
                                    <div className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckSquare size={14} className="text-amber-500" />
                                            <span className="text-xs font-bold text-gray-600">Tarefas Pendentes</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">{tasks.filter(t => t.status === 'PENDING').length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Ação de Pipeline */}
                            {!producer.tracking_status && (
                                <div className="pt-4">
                                    <button 
                                        onClick={() => onUpdateStatus('PRECISA_CONTATO', 'Movido para o Radar de Acompanhamento')}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Target size={16} className="group-hover:scale-110 transition-transform" />
                                        Mover para Radar
                                    </button>
                                    <p className="text-[9px] text-gray-400 text-center mt-2 font-medium px-4">
                                        Inicia o monitoramento ativo deste cliente no pipeline de CS.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[#FAFAFA]">
                    
                    {/* 1. HEADER (Context & Status) */}
                    <div className="px-6 pt-6 pb-0 bg-white border-b border-gray-200 sticky top-0 z-30">
                        <div className="flex flex-col gap-6 mb-4">
                            {/* Top Row: Title & Actions */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md border transition-all ${theme.bg} ${theme.border} ${theme.text}`}>
                                        <theme.icon size={28} strokeWidth={2}/>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{theme.label}</h1>
                                        <div className="flex items-center gap-2.5 mt-2.5">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-md border border-gray-200 shadow-sm">
                                                <Timer size={13} className="text-gray-400"/>
                                                <span className="text-[11px] font-semibold text-gray-600 tracking-wide">
                                                    Desde {new Date(producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || producer.lastContactAt || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')} às {new Date(producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || producer.lastContactAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-md border border-amber-200/60 shadow-sm">
                                                <Clock size={13} className="text-amber-500"/>
                                                <span className="text-[11px] font-semibold text-amber-700 tracking-wide">
                                                    <TimeInStageBadge 
                                                        statusUpdatedAt={producer.statusUpdatedAt || producer.tracking_metadata?.entered_stage_at || producer.lastContactAt} 
                                                        stageType="NORMAL"
                                                        variant="text"
                                                    /> nesta etapa
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Tracking Status Dropdown */}
                                    <div className="relative" ref={trackingMenuRef}>
                                        <button 
                                            onClick={() => setIsTrackingOpen(!isTrackingOpen)}
                                            className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                                        >
                                            <Settings size={20}/>
                                        </button>
                                        {isTrackingOpen && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                                {(Object.keys(TRACKING_STATUS_CONFIG) as string[]).filter(s => s !== 'null').map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => handleTrackingChange(s as TrackingStatus)}
                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 hover:bg-gray-50 ${producer.tracking_status === s ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
                                                    >
                                                        {React.createElement(TRACKING_STATUS_CONFIG[s].icon, { size: 14 })}
                                                        {TRACKING_STATUS_CONFIG[s].label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {nextStep && (
                                        <button 
                                            onClick={handleMoveToNext}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200/50 transition-all hover:-translate-y-0.5 active:scale-95"
                                        >
                                            Mover <ArrowRight size={16} />
                                        </button>
                                    )}
                                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-6 mt-2">
                            {[
                                { id: 'PERFIL', label: 'Dados do Cliente', icon: User },
                                { id: 'ETAPA', label: 'Etapa Atual', icon: Target },
                                { id: 'TIMELINE', label: 'Linha do Tempo', icon: History },
                                { id: 'TAREFAS', label: 'Tarefas', icon: CheckSquare },
                                { id: 'ARQUIVOS', label: 'Arquivos', icon: FileText }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`relative flex items-center gap-2.5 pb-4 text-sm font-bold transition-all group ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} className="transition-transform group-hover:scale-110"/>
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black rounded-t-full animate-in fade-in zoom-in-50 duration-300"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. CONTENT BODY */}
                    <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                        {activeTab === 'PERFIL' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
                                {renderPerfilContent()}
                            </div>
                        )}

                        {activeTab === 'ETAPA' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
                                {renderEtapaContent()}
                            </div>
                        )}
                        
                        {activeTab === 'TIMELINE' && (
                            <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in zoom-in-[0.98] duration-300 ease-out pb-10">
                                {/* Filters & Input Area */}
                                <div className="sticky top-0 z-50 bg-[#FAFAFA] pt-2 pb-4 -mx-10 px-10 border-b border-gray-200/60 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] mb-6 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                            {['TUDO', 'NOTAS', 'TASKS', 'SISTEMA'].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setTimelineFilter(f as any)}
                                                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${timelineFilter === f ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                                >
                                                    {f === 'TASKS' ? 'Tarefas' : f === 'NOTAS' ? 'Notas' : f === 'SISTEMA' ? 'Logs' : 'Tudo'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <div className="relative group" ref={datePickerRef}>
                                                <button 
                                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 bg-white border ${timelineDateFilter ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-600'} rounded-xl text-xs font-bold shadow-sm group-hover:border-gray-300 transition-all`}
                                                >
                                                    <Calendar size={14} />
                                                    {timelineDateFilter ? new Date(timelineDateFilter).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'Data'}
                                                    {timelineDateFilter && (
                                                        <span 
                                                            onClick={(e) => { e.stopPropagation(); setTimelineDateFilter(''); }} 
                                                            className="ml-1 p-0.5 hover:bg-brand-200 rounded-full z-20 relative"
                                                        >
                                                            <X size={10}/>
                                                        </span>
                                                    )}
                                                </button>
                                                {isDatePickerOpen && (
                                                    <MiniCalendar 
                                                        selectedDate={timelineDateFilter}
                                                        onChange={setTimelineDateFilter}
                                                        onClose={() => setIsDatePickerOpen(false)}
                                                    />
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => setIsAddingNote(!isAddingNote)}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${isAddingNote ? 'bg-gray-200 text-gray-600' : 'bg-gray-900 text-white hover:bg-black hover:shadow-xl hover:-translate-y-0.5'}`}
                                            >
                                                {isAddingNote ? <X size={14}/> : <Plus size={14} />}
                                                {isAddingNote ? 'Cancelar' : 'Nova Nota'}
                                            </button>
                                        </div>
                                    </div>
                                    {isAddingNote && (
                                        <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                                            <div className="relative group">
                                                {teamMembers.length === 0 && (
                                                    <div className="absolute -top-5 left-2 text-[9px] text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse z-10">
                                                        Carregando membros...
                                                    </div>
                                                )}
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl opacity-50 blur"></div>
                                                <div className="relative bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                                                    <MentionsInput
                                                        value={note || ''}
                                                        onChange={e => setNote(e.target.value || '')}
                                                        className="mentions-input w-full bg-gray-50/50 rounded-xl outline-none text-sm text-gray-700 placeholder:text-gray-400 min-h-[100px] resize-none border border-transparent focus-within:bg-white focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all p-4"
                                                        placeholder="Escreva sua nota estratégica aqui... Use @ para mencionar"
                                                        suggestionsPortalHost={document.body}
                                                        allowSuggestionsAboveCursor={true}
                                                        autoFocus
                                                    >
                                                        <Mention
                                                            trigger="@"
                                                            data={searchMembers}
                                                            displayTransform={(id, display) => `@${display || id || 'Usuário'}`}
                                                            markup="@[__display__](__id__)"
                                                            className="bg-brand-50 text-brand-700 font-bold px-0.5 rounded"
                                                            appendSpaceOnAdd
                                                            renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
                                                                <div className={`flex items-center gap-3 px-4 py-2 ${focused ? 'bg-gray-50' : ''}`}>
                                                                    <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-[10px] font-black text-brand-600 uppercase">
                                                                        {suggestion.display ? String(suggestion.display).charAt(0) : '?'}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-900">{highlightedDisplay}</span>
                                                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Membro da Equipe</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        />
                                                    </MentionsInput>
                                                    <div className="flex justify-end items-center gap-2 mt-2 px-2 pb-1">
                                                        <button 
                                                            onClick={handleSaveNote}
                                                            disabled={!note.trim()}
                                                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95"
                                                        >
                                                            Salvar Nota <ArrowRight size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Timeline Feed */}
                                <div className="relative pl-4 space-y-8 mt-4">
                                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200/70"></div>
                                    {Object.entries(groupedTimeline).map(([dateLabel, events]) => (
                                        <div key={dateLabel} className="relative group/day">
                                            <div className="flex items-center gap-4 mb-6">
                                                <span className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest relative z-10">
                                                    <Calendar size={12} className="text-brand-500"/> {dateLabel}
                                                </span>
                                                <div className="flex-1 h-px bg-gray-100"></div>
                                            </div>
                                            <div className="space-y-6">
                                                {(events as TimelineEvent[]).map((item, idx) => (
                                                    <div key={idx} className="relative pl-12 group">
                                                        <div className={`absolute left-0 top-3 w-10 h-10 -ml-5 rounded-full border-4 border-[#FAFAFA] bg-white text-gray-400 flex items-center justify-center z-10 shadow-sm ring-1 ring-inset ring-black/5`}>
                                                            {item.type === 'NOTE' ? <StickyNote size={16}/> : <Activity size={16}/>}
                                                        </div>
                                                        <div className={`p-4 rounded-2xl border border-gray-200 bg-white shadow-sm relative hover:shadow-md transition-shadow`}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{item.type}</span>
                                                                <span className="text-[10px] font-medium text-gray-400">{formatDate(item.timestamp)}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 font-medium">
                                                                {item.content?.split(/(@\[[^\]]+\]\([^)]+\))/g).map((part: string, i: number) => {
                                                                    const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
                                                                    if (match) {
                                                                        return (
                                                                            <span key={i} className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold border border-emerald-200 mx-0.5">
                                                                                @{match[1]}
                                                                            </span>
                                                                        );
                                                                    }
                                                                    return part;
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'TAREFAS' && (
                            <div className="space-y-4 animate-in fade-in zoom-in-[0.98] duration-300 ease-out pb-20">
                                {/* Quick Add Bar */}
                                <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm mb-6 flex items-center gap-2 relative z-20 group focus-within:shadow-md focus-within:border-brand-200 transition-all">
                                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                                        <ListTodo size={20} />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Adicionar nova tarefa..." 
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 h-10 px-2"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(e)}
                                    />
                                    
                                    <div className="h-8 w-px bg-gray-100 mx-1"></div>
                                    
                                    {/* Date Picker Trigger */}
                                    <div className="relative" ref={datePickerRef}>
                                        <button 
                                            type="button"
                                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                                        >
                                            <Calendar size={14}/>
                                            {newTaskDate ? new Date(newTaskDate).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'}) : 'Hoje'}
                                        </button>
                                        {isDatePickerOpen && (
                                            <MiniCalendar 
                                                selectedDate={newTaskDate} 
                                                onChange={setNewTaskDate} 
                                                onClose={() => setIsDatePickerOpen(false)}
                                            />
                                        )}
                                    </div>

                                    <button 
                                        onClick={handleCreateTask}
                                        disabled={!newTaskTitle.trim()}
                                        className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                {tasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
                                            <div className="absolute inset-0 bg-brand-50 rounded-full animate-ping opacity-20"></div>
                                            <CheckSquare size={36} className="text-gray-300 relative z-10"/>
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 mb-2">Tudo em dia!</h3>
                                        <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                                            Não há tarefas pendentes para este cliente. Que tal agendar o próximo follow-up?
                                        </p>
                                        <button 
                                            onClick={(e) => {
                                                setNewTaskTitle('Follow-up');
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                setNewTaskDate(tomorrow.toISOString());
                                                setTimeout(() => {
                                                    const input = document.querySelector('input[placeholder="Adicionar nova tarefa..."]') as HTMLInputElement;
                                                    input?.focus();
                                                }, 50);
                                            }}
                                            className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                        >
                                            <Plus size={14}/> Agendar Follow-up
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {tasks.map(task => (
                                            <SmartTaskCard 
                                                key={task.id} 
                                                task={task} 
                                                onUpdateStatus={updateTaskStatus} 
                                                onUpdateTitle={handleUpdateTaskTitle}
                                                onUpdateDate={handleUpdateTaskDate}
                                                onDelete={handleDeleteTask}
                                                onUpdateAssignee={handleUpdateTaskAssignee}
                                                teamMembers={teamMembers}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ARQUIVOS' && (
                            <div className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-300 ease-out">
                                <div 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="border-2 border-dashed border-gray-200 rounded-[2rem] p-12 flex flex-col items-center justify-center hover:bg-white hover:border-brand-400 hover:shadow-md transition-all cursor-pointer bg-gray-50/30 group duration-300"
                                >
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm text-brand-500 group-hover:scale-110 transition-transform border border-gray-100 group-hover:border-brand-100 group-hover:text-brand-600">
                                        {isUploading ? <Loader2 size={32} className="animate-spin"/> : <DownloadCloud size={32}/>}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide group-hover:text-brand-700 transition-colors">Upload de Arquivo</h4>
                                    <p className="text-xs text-gray-400 mt-1">Arraste ou clique para selecionar</p>
                                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {files.map(file => (
                                        <a key={file.id} href={file.url} target="_blank" className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:shadow-lg hover:border-brand-200 transition-all group duration-300">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><FileText size={24}/></div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-700 transition-colors">{file.name}</h4>
                                                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{file.size} • {formatDate(file.createdAt)}</p>
                                            </div>
                                            <ExternalLink size={16} className="text-gray-300 group-hover:text-brand-500 transition-colors"/>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
