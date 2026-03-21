
import React, { useState, useRef, useEffect } from 'react';
import { WorkTask, TaskStatus, Usuario } from '../../types';
import { STATUS_COLORS } from '../../constants';
import { 
    Clock, CheckCircle2, AlertCircle, Calendar, 
    MoreHorizontal, ArrowRight, User, Trash2, 
    MessageSquare, AlertTriangle, Loader2, ChevronDown, Check, X,
    Bell, Search, Ban
} from 'lucide-react';
import { Avatar } from '../Avatar';
import { DateTimePicker } from '../DateTimePicker';

// --- CONFIGURAÇÃO DE VISUAL ---
const STATUS_CONFIG: Record<TaskStatus, { label: string, bg: string, text: string, icon: any, colorHex: string }> = {
    'PENDING': { label: 'A Fazer', bg: 'bg-gray-200', text: 'text-gray-700', icon: CircleIcon, colorHex: '#E5E7EB' },
    'IN_PROGRESS': { label: 'Fazendo', bg: 'bg-blue-500', text: 'text-white', icon: Loader2, colorHex: '#3B82F6' },
    'COMPLETED': { label: 'Feito', bg: 'bg-emerald-500', text: 'text-white', icon: CheckCircle2, colorHex: '#10B981' },
    'WAITING': { label: 'Espera', bg: 'bg-amber-400', text: 'text-white', icon: Clock, colorHex: '#FBBF24' },
    'STUCK': { label: 'Travado', bg: 'bg-rose-500', text: 'text-white', icon: AlertCircle, colorHex: '#F43F5E' },
    'ARCHIVED': { label: 'Arquivado', bg: 'bg-gray-100', text: 'text-gray-400', icon: CheckCircle2, colorHex: '#F3F4F6' },
    'CANCELLED': { label: 'Cancelado', bg: 'bg-gray-300', text: 'text-gray-600', icon: Ban, colorHex: '#D1D5DB' }
};

function CircleIcon({ className }: { className?: string }) {
    return <div className={`w-3.5 h-3.5 rounded-full border-2 border-current ${className}`} />;
}



// --- USER SELECT POPOVER ---
const UserSelectPopover = ({ users, selectedId, onChange, onClose }: { users: Usuario[], selectedId: string, onChange: (id: string) => void, onClose: () => void }) => {
    const [search, setSearch] = useState('');
    const filteredUsers = users.filter(u => u.nome.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 w-64 animate-in fade-in zoom-in-95 origin-top-left flex flex-col overflow-hidden" onMouseDown={e => e.stopPropagation()}>
            <div className="p-2 border-b border-gray-100">
                <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        autoFocus
                        className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-500 transition-all"
                        placeholder="Buscar responsável..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {filteredUsers.map(u => (
                    <button 
                        key={u.id}
                        onClick={(e) => { e.stopPropagation(); onChange(u.id); onClose(); }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${selectedId === u.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                        <Avatar src={u.avatar} name={u.nome} alt="" className="w-6 h-6 rounded-full border border-gray-100"/>
                        <span className="text-xs font-bold truncate">{u.nome}</span>
                        {selectedId === u.id && <Check size={12} className="ml-auto"/>}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface Props {
    task: WorkTask;
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onUpdateTitle: (taskId: string, title: string) => void;
    onUpdateDate: (taskId: string, date: string) => void;
    onDelete: (taskId: string) => void;
    onOpenLead?: (leadId: string) => void;
    onUpdateAssignee?: (taskId: string, userIds: string[]) => void;
    onOpenDetail?: (task: WorkTask) => void;
    teamMembers?: Usuario[];
}

export const SmartTaskCard: React.FC<Props> = ({ task, onUpdateStatus, onUpdateTitle, onUpdateDate, onDelete, onOpenLead, onUpdateAssignee, onOpenDetail, teamMembers = [] }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(task.title);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
    
    const config = STATUS_CONFIG[task.status] || STATUS_CONFIG['PENDING'];
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
    const isReminder = task.type === 'REMINDER';
    
    const statusMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);
    const assigneeMenuRef = useRef<HTMLDivElement>(null);

    // Current Assignee Display
    const currentAssigneeId = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo[0] : null;
    const assignee = teamMembers.find(u => u.id === currentAssigneeId);

    // Click Outside Handling
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) setIsStatusOpen(false);
            if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) setIsDateOpen(false);
            if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) setIsAssigneeOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTitleSubmit = () => {
        setIsEditingTitle(false);
        if (titleInput.trim() !== task.title) {
            onUpdateTitle(task.id, titleInput.trim());
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Sem Prazo';
        const date = new Date(dateString);
        
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        const dateOnly = dateString.split('T')[0];
        const todayStr = today.toLocaleDateString('en-CA');
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

        let prefix = '';
        if (dateOnly === todayStr) prefix = 'Hoje';
        else if (dateOnly === tomorrowStr) prefix = 'Amanhã';
        else prefix = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        if (dateString.includes('T')) {
            const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return (
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-900">{prefix}</span>
                    <span className="text-[14px] font-black text-brand-600 -mt-0.5">{time}</span>
                </div>
            );
        }
        
        return <span className="text-[10px] font-black uppercase tracking-wider text-gray-900">{prefix}</span>;
    };

    const ResponsibilityBadge = ({ type }: { type?: 'B4YOU' | 'CLIENT' }) => {
        if (!type) return null;
        const colorClass = type === 'B4YOU' ? STATUS_COLORS.B4YOU : STATUS_COLORS.CLIENT;
        return (
            <div className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest ${colorClass} shadow-sm`}>
                {type === 'B4YOU' ? 'B4YOU' : 'CLIENTE'}
            </div>
        );
    };

    return (
        <div 
            onClick={() => onOpenDetail && onOpenDetail(task)}
            className={`group relative bg-white p-4 rounded-2xl border transition-all duration-300 cursor-pointer
            ${isReminder ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-transparent'}
            ${task.status === 'COMPLETED' ? 'opacity-60 grayscale-[0.5]' : 'shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'}
            ${isOverdue ? 'border-red-100 bg-red-50/5' : 'border-gray-100'}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-start gap-3">
                
                {/* STATUS DROPDOWN (MONDAY STYLE) */}
                <div className="relative mt-0.5" ref={statusMenuRef}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsStatusOpen(!isStatusOpen); }}
                        className={`flex-shrink-0 w-28 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-sm
                        ${config.bg} ${config.text} hover:brightness-105 active:scale-95`}
                    >
                        {isReminder ? (
                            <Bell size={12} className={task.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}/> 
                        ) : (
                            <config.icon size={12} className={task.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                        )}
                        <span className="truncate max-w-[80px]">{isReminder && task.status === 'PENDING' ? 'Lembrete' : config.label}</span>
                    </button>
                    
                    {/* Responsibility Badge Overlay */}
                    <div className="absolute -top-2 -left-1 z-10">
                        <ResponsibilityBadge type={task.responsibility} />
                    </div>

                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in-95">
                            {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                                <button
                                    key={key}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateStatus(task.id, key as TaskStatus);
                                        setIsStatusOpen(false);
                                    }}
                                    className={`w-full py-2 px-3 text-[10px] font-bold uppercase text-center transition-colors flex items-center justify-center gap-2 hover:opacity-90 ${conf.bg} ${conf.text} mb-[1px] last:mb-0`}
                                >
                                    {key === task.status && <Check size={10} />}
                                    {conf.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        {isEditingTitle ? (
                            <input 
                                autoFocus
                                className="w-full bg-gray-50 border border-brand-300 rounded px-2 py-0.5 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-brand-100"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                onBlur={handleTitleSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="flex items-center gap-2 pr-8">
                                <h4 
                                    onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                    className={`text-sm font-bold truncate transition-colors cursor-text hover:text-brand-600 hover:underline decoration-dashed underline-offset-4 ${task.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                                    title="Clique para editar"
                                >
                                    {task.title}
                                </h4>
                                {task.updatesCount && task.updatesCount > 0 && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                                        <MessageSquare size={10} />
                                        {task.updatesCount}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Delete Action (Always visible & High Z-Index) */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
                            title="Excluir tarefa"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    {task.description && (
                        <p className={`text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed ${isReminder ? 'italic text-amber-700/70' : ''}`}>
                            {task.description}
                        </p>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                        {/* ASSIGNEE PICKER */}
                        <div className="relative" ref={assigneeMenuRef}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsAssigneeOpen(!isAssigneeOpen); }}
                                className="flex items-center gap-1.5 p-0.5 pr-2 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                                title={assignee ? assignee.nome : 'Sem responsável'}
                            >
                                {assignee ? (
                                    <Avatar src={assignee.avatar} name={assignee.nome} alt="" className="w-5 h-5 rounded-full" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                        <User size={12}/>
                                    </div>
                                )}
                                <span className="text-[10px] font-bold text-gray-500 max-w-[60px] truncate">{assignee ? assignee.nome.split(' ')[0] : 'Atribuir'}</span>
                            </button>

                            {isAssigneeOpen && onUpdateAssignee && (
                                <UserSelectPopover 
                                    users={teamMembers} 
                                    selectedId={currentAssigneeId || ''} 
                                    onChange={(id) => onUpdateAssignee(task.id, [id])} 
                                    onClose={() => setIsAssigneeOpen(false)}
                                />
                            )}
                        </div>

                        {/* DATE PICKER BADGE */}
                        <div className="relative" ref={dateMenuRef}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsDateOpen(!isDateOpen); }}
                                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all hover:bg-opacity-80 active:scale-95 ${
                                    !task.dueDate 
                                    ? 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300' 
                                    : isOverdue 
                                        ? 'bg-red-50 text-red-600 border-red-100' 
                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                            >
                                <Calendar size={10} />
                                {formatDate(task.dueDate)}
                            </button>
                            
                            {isDateOpen && (
                                <DateTimePicker 
                                    selectedDateTime={task.dueDate} 
                                    onChange={(date) => onUpdateDate(task.id, date)} 
                                    onClose={() => setIsDateOpen(false)}
                                />
                            )}
                        </div>

                        {/* Context / Lead Badge */}
                        {(task.creatorName || task.leadId) && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); task.leadId && onOpenLead && onOpenLead(task.leadId); }}
                                className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md border border-transparent transition-colors ${task.leadId ? 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 cursor-pointer' : 'text-gray-400'}`}
                            >
                                {task.creatorAvatar && !task.creatorName?.includes(task.title) ? (
                                    <Avatar src={task.creatorAvatar} name={task.creatorName || '?'} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                    <User size={10} />
                                )}
                                <span className="truncate max-w-[100px]">{task.creatorName || 'Cliente'}</span>
                                {task.leadId && <ArrowRight size={8} className="opacity-50" />}
                            </div>
                        )}

                        {/* Priority Flag */}
                        {task.priority === 'HIGH' && task.status !== 'COMPLETED' && (
                            <div className="ml-auto flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={8} strokeWidth={3} /> ALTA
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};