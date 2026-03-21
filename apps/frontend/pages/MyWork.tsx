import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, Search, X, LayoutGrid, ChevronDown, ChevronRight, ChevronLeft,
    Trash2, MessageCircle, Check, UserPlus, Briefcase, ExternalLink,
    MoreHorizontal, Calendar as CalendarIcon, Type, Hash, Activity,
    Settings, Clock, AlertCircle, Filter,
    Paperclip, ArrowRight as ArrowRightIcon,
    Share2, Users, Lock, Edit2, LogOut, AtSign, Send, ArrowUp, ArrowDown, User, CheckSquare,
    PanelLeftClose, PanelLeftOpen, GripVertical, ChevronUp, Star, Table, Kanban,
    BarChart2, ListFilter, SortAsc, Info, Link as LinkIcon, AlignLeft, AlertTriangle, ShieldCheck,
    Globe, Eye, Layout
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db, fieldValue } from '../firebase';
import { 
    Board, BoardGroup, BoardColumn, BoardItem, BoardStatusOption, 
    BoardColumnType, Usuario, Lead, BoardItemUpdate, BoardWorkspace
} from '../types';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import { NotificationService } from '../services/systemServices';

// --- CONSTANTS & DEFAULTS ---

const MONDAY_COLORS = [
    '#00C875', '#E2445C', '#FDAB3D', '#0086C0', '#579BFC', '#A25DDC', 
    '#FFCB00', '#BB3354', '#784BD1', '#808080', '#333333', '#FF642E'
];

const DEFAULT_STATUS_OPTIONS: BoardStatusOption[] = [
    { id: 'DONE', label: 'Feito', color: '#00C875' },
    { id: 'STUCK', label: 'Travado', color: '#E2445C' },
    { id: 'WORKING', label: 'Fazendo', color: '#FDAB3D' },
    { id: 'WAITING', label: 'Fila', color: '#579BFC' },
    { id: 'EMPTY', label: '-', color: '#C4C4C4' }
];

const MIN_COL_WIDTH = 140;

const INITIAL_BOARD_TEMPLATE: Partial<Board> = {
    name: 'Projetos da Semana',
    type: 'private',
    columns: [
        { id: 'col_person', title: 'Responsável', type: 'person', width: 150 },
        { id: 'col_status', title: 'Status', type: 'status', width: 160, settings: { options: DEFAULT_STATUS_OPTIONS } },
        { id: 'col_client', title: 'Cliente', type: 'client', width: 180 }, 
        { id: 'col_date', title: 'Prazo', type: 'date', width: 140 },
        { id: 'col_priority', title: 'Prioridade', type: 'priority', width: 140, settings: { options: [
            { id: 'HIGH', label: 'Alta', color: '#E2445C' },
            { id: 'MEDIUM', label: 'Média', color: '#FDAB3D' },
            { id: 'LOW', label: 'Baixa', color: '#579BFC' },
            { id: 'EMPTY', label: '-', color: '#C4C4C4' }
        ]}}
    ],
    groups: [
        { id: 'g1', title: 'Esta Semana', color: '#579BFC', items: [] },
        { id: 'g2', title: 'Backlog', color: '#A25DDC', items: [] }
    ]
};

// --- UTILS & COMPONENTS ---

const BoardSkeleton = () => (
    <div className="flex-1 p-8 space-y-8 animate-pulse bg-white rounded-xl h-full">
        <div className="h-10 w-1/3 bg-gray-200 rounded-lg"></div>
        <div className="space-y-4">
            <div className="h-8 w-1/4 bg-gray-200 rounded"></div>
            <div className="h-64 w-full bg-gray-50 rounded-xl border border-gray-100"></div>
        </div>
    </div>
);

const usePopoverPosition = (triggerEl: HTMLElement | null, isOpen: boolean, width = 220, height = 300) => {
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
    useEffect(() => {
        if (isOpen && triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            let top = rect.bottom + 8;
            let left = rect.left;
            let transformOrigin = 'top left';
            if (left + width > viewportWidth - 10) { left = Math.max(10, viewportWidth - width - 10); transformOrigin = transformOrigin.replace('left', 'right'); }
            const spaceBelow = viewportHeight - (rect.bottom + 8);
            const spaceAbove = rect.top - 8;
            let finalHeight = height;
            const fitsBelow = spaceBelow >= height;
            const fitsAbove = spaceAbove >= height;
            if (!fitsBelow && (fitsAbove || spaceAbove > spaceBelow)) { top = rect.top - height - 8; transformOrigin = 'bottom ' + transformOrigin.split(' ')[1]; if (top < 10) { top = 10; finalHeight = rect.top - 18; } } else { if (!fitsBelow) { finalHeight = Math.max(100, spaceBelow - 10); } }
            setStyle({ position: 'fixed', top, left, width, height: finalHeight < height ? finalHeight : undefined, maxHeight: finalHeight, zIndex: 10000, transformOrigin, opacity: 1, });
        }
    }, [isOpen, width, height, triggerEl]);
    return style;
};

const BoardActionMenu = ({ board, currentUserId, onRename, onDelete, onShare }: { board: Board, currentUserId: string, onRename: () => void, onDelete: () => void, onShare: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = board.ownerId === currentUserId;
    useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><MoreHorizontal size={16} /></button>
            {isOpen && (<div className="absolute left-full top-0 ml-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-left"><div className="py-1"><button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onRename(); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit2 size={14} className="text-gray-400"/> Renomear</button><button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onShare(); }} className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Share2 size={14} className="text-gray-400"/> {isOwner ? 'Gerenciar Acesso' : 'Ver Membros'}</button><div className="h-px bg-gray-100 my-1"></div>{isOwner ? (<button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onDelete(); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir Quadro</button>) : (<button disabled className="w-full text-left px-4 py-2.5 text-xs text-gray-400 cursor-not-allowed flex items-center gap-2"><LogOut size={14} /> Sair do Quadro</button>)}</div></div>)}
        </div>
    );
};

const EditableText = ({ value, onChange, className, autoFocus, ...props }: any) => {
    const [isEditing, setIsEditing] = useState(autoFocus || false);
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);
    const handleBlur = () => { setIsEditing(false); if (text !== value) onChange(text); };
    if (isEditing) { return (<input autoFocus value={text} onChange={e => setText(e.target.value)} onBlur={handleBlur} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} className={className} {...props} />); }
    return (<span onClick={() => setIsEditing(true)} className={`cursor-text ${className}`} {...props}>{value}</span>);
};

const ColorPicker = ({ triggerRef, onClose, selected, onSelect }: any) => {
    const style = usePopoverPosition(triggerRef.current, true, 200, 160);
    return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={onClose}></div><div className="fixed bg-white p-3 rounded-xl shadow-xl border border-gray-100 z-[9999] grid grid-cols-4 gap-2" style={style}>{MONDAY_COLORS.map(c => (<button key={c} onClick={() => onSelect(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${selected === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />))}</div></>, document.body);
};

const StatusCell = ({ selectedId, config, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const style = usePopoverPosition(ref.current, isOpen, 160, 200);
    const selectedOption = config?.find((o: any) => o.id === selectedId) || config?.find((o: any) => o.id === 'EMPTY');
    const bg = selectedOption?.color || '#C4C4C4';
    return (
        <div ref={ref} className="w-full h-full p-1 relative"><button onClick={() => setIsOpen(true)} className="w-full h-full text-white font-bold text-xs flex items-center justify-center transition-all hover:brightness-110 hover:shadow-sm" style={{ backgroundColor: bg }}>{selectedOption?.label}</button>{isOpen && createPortal(<><div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div><div className="fixed bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden z-[9999] flex flex-col" style={style}>{config?.map((opt: any) => (<button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className="px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity w-full text-center" style={{ backgroundColor: opt.color }}>{opt.label}</button>))}</div></>, document.body)}</div>
    );
};

const PeopleCell = ({ personIds, users, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const style = usePopoverPosition(ref.current, isOpen, 240, 300);
    const [search, setSearch] = useState('');
    const displayUsers = users.filter((u: any) => personIds.includes(u.id));
    const filteredUsers = users.filter((u: any) => u.nome.toLowerCase().includes(search.toLowerCase()));
    const toggleUser = (uid: string) => { const newIds = personIds.includes(uid) ? personIds.filter((id: string) => id !== uid) : [...personIds, uid]; onChange(newIds); };
    return (
        <div ref={ref} className="w-full h-full p-1 relative flex items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => setIsOpen(true)}>{displayUsers.length > 0 ? (<div className="flex -space-x-1 overflow-hidden max-w-full px-1">{displayUsers.slice(0, 3).map((u: any) => (<Avatar key={u.id} src={u.avatar} name={u.nome} alt="" className="w-6 h-6 rounded-full border border-white" />))}{displayUsers.length > 3 && (<div className="w-6 h-6 rounded-full bg-gray-200 text-[9px] flex items-center justify-center border border-white">+{displayUsers.length - 3}</div>)}</div>) : (<div className="w-6 h-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"><Plus size={12}/></div>)}{isOpen && createPortal(<><div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div><div className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden z-[9999]" style={style} onClick={e => e.stopPropagation()}><div className="p-2 border-b border-gray-100"><input autoFocus className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-1.5 outline-none" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="flex-1 overflow-y-auto p-1 custom-scrollbar">{filteredUsers.map((u: any) => (<button key={u.id} onClick={() => toggleUser(u.id)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"><Avatar src={u.avatar} name={u.nome} alt="" className="w-6 h-6 rounded-full"/><span className="text-xs font-medium text-gray-700 truncate flex-1 text-left">{u.nome}</span>{personIds.includes(u.id) && <Check size={12} className="text-brand-600"/>}</button>))}</div></div></>, document.body)}</div>
    );
};

const DateCell = ({ dateStr, statusId, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    // Mais espaço para o calendário customizado
    const style = usePopoverPosition(ref.current, isOpen, 280, 340);
    // Force higher z-index
    const calendarStyle = { ...style, zIndex: 20000 };

    // Estados locais para o calendário
    const [viewDate, setViewDate] = useState(dateStr ? new Date(dateStr) : new Date());
    
    // Efeito para resetar a viewDate quando abre
    useEffect(() => {
        if (isOpen) {
            setViewDate(dateStr ? new Date(dateStr) : new Date());
        }
    }, [isOpen, dateStr]);

    // Helpers de Calendário
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Domingo
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    const handleDateSelect = (day: number) => {
        // Correção de fuso horário simples: criar data como string YYYY-MM-DD
        const m = month + 1;
        const d = day;
        const isoDate = `${year}-${m < 10 ? '0'+m : m}-${d < 10 ? '0'+d : d}`;
        onChange(isoDate);
        setIsOpen(false);
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const setQuickDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const isoDate = `${d.getFullYear()}-${m < 10 ? '0'+m : m}-${day < 10 ? '0'+day : day}`;
        onChange(isoDate);
        setIsOpen(false);
    };

    // Estilo da Célula (Display)
    const getStatusColor = () => {
        if (!dateStr || statusId === 'DONE') return 'bg-gray-100 text-gray-700 border-transparent';
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(dateStr); target.setHours(0,0,0,0);
        
        // Passado
        if (target.getTime() < today.getTime()) return 'bg-red-50 text-red-600 font-bold border-red-200 ring-1 ring-red-100'; 
        // Hoje
        if (target.getTime() === today.getTime()) return 'bg-blue-50 text-blue-700 font-bold border-blue-200 ring-1 ring-blue-100'; 
        // Futuro próximo (até 2 dias)
        if ((target.getTime() - today.getTime()) / (1000 * 3600 * 24) <= 2) return 'bg-orange-50 text-orange-700 font-bold border-orange-200';

        return 'bg-gray-50 text-gray-700 group-hover:bg-gray-100 border-transparent'; 
    };

    return (
        <div ref={ref} className="w-full h-full p-1 relative">
            <button 
                onClick={() => setIsOpen(true)}
                className={`w-full h-full flex items-center justify-center transition-all rounded hover:bg-gray-50 group border border-transparent hover:border-gray-200`}
            >
                {dateStr ? (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors border ${getStatusColor()}`}>
                        {new Date(dateStr) < new Date() && statusId !== 'DONE' && <AlertTriangle size={10} />}
                        {new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                ) : (
                    <CalendarIcon size={14} className="text-gray-300 group-hover:text-gray-500" />
                )}
            </button>
            
            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
                    <div className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] p-4 flex flex-col animate-in fade-in zoom-in-95 origin-top-left ring-1 ring-black/5" style={calendarStyle} onClick={e => e.stopPropagation()}>
                        
                        {/* Header do Calendário */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={16}/></button>
                            <span className="text-sm font-bold text-gray-800 capitalize">{monthNames[month]} {year}</span>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={16}/></button>
                        </div>

                        {/* Grid de Dias */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map((d, i) => (
                                <div key={i} className="text-[10px] font-bold text-gray-400 text-center uppercase">{d}</div>
                            ))}
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: days }).map((_, i) => {
                                const day = i + 1;
                                const currentIso = `${year}-${month + 1 < 10 ? '0'+(month+1) : month+1}-${day < 10 ? '0'+day : day}`;
                                const isSelected = dateStr === currentIso;
                                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                                return (
                                    <button 
                                        key={day} 
                                        onClick={() => handleDateSelect(day)}
                                        className={`
                                            h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                                            ${isSelected 
                                                ? 'bg-brand-600 text-white shadow-md' 
                                                : isToday 
                                                    ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100' 
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Atalhos Rápidos */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-100">
                            <button onClick={() => setQuickDate(0)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 transition-colors">Hoje</button>
                            <button onClick={() => setQuickDate(1)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 transition-colors">Amanhã</button>
                            <button onClick={() => setQuickDate(7)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 transition-colors">Próx. Semana</button>
                            {dateStr && (
                                <button 
                                    onClick={() => { onChange(''); setIsOpen(false); }}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={10} /> Limpar
                                </button>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

const NumberCell = ({ value, onChange }: any) => (<input type="number" className="w-full h-full bg-transparent text-center text-xs text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all" placeholder="-" value={value || ''} onChange={e => onChange(e.target.value)}/>);
const TextCell = ({ value, onChange }: any) => (<input type="text" className="w-full h-full bg-transparent px-2 text-xs text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand-100 transition-all truncate" placeholder="-" value={value || ''} onChange={e => onChange(e.target.value)}/>);
const CheckboxCell = ({ value, onChange }: any) => (<div className="w-full h-full flex items-center justify-center"><button onClick={() => onChange(!value)} className={`w-5 h-5 rounded flex items-center justify-center transition-all ${value ? 'bg-brand-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-transparent'}`}><Check size={14} strokeWidth={3} /></button></div>);

const ColumnHeaderMenu = ({ onDelete }: { onDelete: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (<div className="relative"><button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-300 hover:text-gray-600 rounded transition-colors"><MoreHorizontal size={12} /></button>{isOpen && (<><div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div><div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-50 w-32 py-1 overflow-hidden"><button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12}/> Excluir</button></div></>)}</div>);
};

const ColumnMenu = ({ triggerEl, onAddColumn, onClose }: any) => {
    const style = usePopoverPosition(triggerEl, true, 180, 240);
    const options: {type: BoardColumnType, label: string, icon: any}[] = [{ type: 'status', label: 'Status', icon: Activity }, { type: 'text', label: 'Texto', icon: Type }, { type: 'person', label: 'Pessoas', icon: Users }, { type: 'date', label: 'Data', icon: CalendarIcon }, { type: 'numbers', label: 'Números', icon: Hash }, { type: 'checkbox', label: 'Checkbox', icon: CheckSquare }, { type: 'client', label: 'Cliente', icon: User }];
    return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={onClose}></div><div className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] flex flex-col py-1" style={style}>{options.map(opt => (<button key={opt.type} onClick={() => onAddColumn(opt.type, opt.label)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors text-left"><opt.icon size={14} className="text-gray-400"/> {opt.label}</button>))}</div></>, document.body);
};

const RowActionMenu = ({ onMoveUp, onMoveDown, onDelete }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (<div className="relative w-full h-full flex items-center justify-center group-hover/menu:visible" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}><MoreHorizontal size={14} className="text-gray-300 group-hover/menu:text-gray-500" />{isOpen && (<><div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div><div className="absolute left-full top-0 ml-2 w-32 bg-white border border-gray-200 shadow-xl rounded-lg z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}><button onClick={() => { onMoveUp(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"><ArrowUp size={12}/> Mover Cima</button><button onClick={() => { onMoveDown(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2"><ArrowDown size={12}/> Mover Baixo</button><div className="h-px bg-gray-100 my-1"></div><button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12}/> Excluir</button></div></>)}</div>);
};

// --- ELITE MODALS (NEW) ---

const WorkspaceModal = ({ workspace, users, onClose, onSave, currentUserId }: any) => {
    const [name, setName] = useState(workspace?.name || '');
    const [members, setMembers] = useState<string[]>(workspace?.members || [currentUserId]);
    const [isPublic, setIsPublic] = useState(workspace?.isPublic || false);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 border border-blue-200 shadow-inner">
                        <Briefcase size={24} className="text-blue-600"/>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">{workspace ? 'Configurar Workspace' : 'Novo Workspace'}</h2>
                    <p className="text-gray-500 text-sm mt-1">Organize seus quadros e equipes em um espaço dedicado.</p>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Nome do Espaço</label>
                        <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Marketing & Vendas"/>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Quem tem acesso?</label>
                        <div className="grid grid-cols-1 gap-3">
                            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isPublic ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="hidden" />
                                <div className={`p-2 rounded-lg ${isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Globe size={20}/></div>
                                <div>
                                    <span className={`block font-bold text-sm ${isPublic ? 'text-blue-900' : 'text-gray-700'}`}>Público na Organização</span>
                                    <span className="text-xs text-gray-500">Qualquer membro do time pode ver e entrar.</span>
                                </div>
                                {isPublic && <Check size={18} className="ml-auto text-blue-600"/>}
                            </label>

                            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${!isPublic ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="hidden" />
                                <div className={`p-2 rounded-lg ${!isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Lock size={20}/></div>
                                <div>
                                    <span className={`block font-bold text-sm ${!isPublic ? 'text-blue-900' : 'text-gray-700'}`}>Privado</span>
                                    <span className="text-xs text-gray-500">Somente membros convidados podem acessar.</span>
                                </div>
                                {!isPublic && <Check size={18} className="ml-auto text-blue-600"/>}
                            </label>
                        </div>
                    </div>

                    {!isPublic && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Membros Convidados</label>
                            <div className="flex flex-wrap gap-2 p-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {users.map((u: any) => (
                                    <button 
                                        key={u.id} 
                                        onClick={() => setMembers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${members.includes(u.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Avatar src={u.avatar} name={u.nome} alt="" className="w-4 h-4 rounded-full"/>
                                        {u.nome.split(' ')[0]}
                                        {members.includes(u.id) && <Check size={10}/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors text-xs uppercase tracking-wide">Cancelar</button>
                    <button onClick={() => onSave({ name, members, isPublic })} disabled={!name} className="px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-xs uppercase tracking-wide flex items-center gap-2 disabled:opacity-50 disabled:shadow-none">
                        <Check size={14}/> Salvar Workspace
                    </button>
                </div>
            </div>
        </div>
    );
};

const CreateBoardModal = ({ onClose, onSave, workspaceName }: any) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'main' | 'private'>('main');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                    <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-4 border border-brand-200 shadow-inner">
                        <LayoutGrid size={24} className="text-brand-600"/>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">Novo Quadro</h2>
                    <p className="text-gray-500 text-sm mt-1">Adicione um quadro ao workspace <strong>{workspaceName}</strong>.</p>
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Nome do Quadro</label>
                        <input autoFocus className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Roadmap Q3"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setType('main')} className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${type === 'main' ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${type === 'main' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Layout size={16}/></div>
                            <span className={`block font-bold text-sm mb-1 ${type === 'main' ? 'text-brand-900' : 'text-gray-700'}`}>Principal</span>
                            <span className="text-[10px] text-gray-500 leading-tight block">Visível para todos do workspace.</span>
                            {type === 'main' && <Check size={16} className="absolute top-4 right-4 text-brand-600"/>}
                        </button>

                        <button onClick={() => setType('private')} className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${type === 'private' ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${type === 'private' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Lock size={16}/></div>
                            <span className={`block font-bold text-sm mb-1 ${type === 'private' ? 'text-brand-900' : 'text-gray-700'}`}>Privado</span>
                            <span className="text-[10px] text-gray-500 leading-tight block">Apenas convidados podem ver.</span>
                            {type === 'private' && <Check size={16} className="absolute top-4 right-4 text-brand-600"/>}
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors text-xs uppercase tracking-wide">Cancelar</button>
                    <button onClick={() => onSave(name, type)} disabled={!name} className="px-8 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-xs uppercase tracking-wide flex items-center gap-2 disabled:opacity-50 disabled:shadow-none">
                        <Plus size={16}/> Criar Quadro
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShareBoardModal = ({ board, users, onClose, onSave }: any) => {
    const [members, setMembers] = useState<string[]>(board.members || []);
    const [search, setSearch] = useState('');

    const filteredUsers = users.filter((u: any) => u.nome.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Compartilhar Quadro</h2>
                            <p className="text-gray-500 text-xs mt-0.5">Gerencie quem tem acesso a este quadro.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20}/></button>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all" placeholder="Buscar pessoas..." value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    <div className="space-y-1">
                        {filteredUsers.map((u: any) => {
                            const isMember = members.includes(u.id);
                            return (
                                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={u.avatar} name={u.nome} alt="" className="w-10 h-10 rounded-full border border-gray-200"/>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{u.nome}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setMembers(prev => isMember ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isMember ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' : 'bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-100'}`}
                                    >
                                        {isMember ? 'Remover' : 'Convidar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <p className="text-xs text-gray-500 font-medium">{members.length} membros selecionados</p>
                    <button onClick={() => onSave(members)} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-md text-xs uppercase tracking-wide">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

const MentionPicker = ({ users, filter, onSelect, onClose }: any) => {
    const filtered = users.filter((u: any) => u.nome.toLowerCase().includes(filter.toLowerCase()));
    useEffect(() => { if (filtered.length === 0 && filter.length > 0) onClose(); }, [filtered, filter, onClose]);
    return (<div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2"><div className="max-h-40 overflow-y-auto custom-scrollbar p-1">{filtered.map((u: any) => (<button key={u.id} onClick={() => onSelect(u)} className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-left transition-colors"><Avatar src={u.avatar} name={u.nome} alt="" className="w-6 h-6 rounded-full"/><span className="text-xs font-bold text-gray-700 truncate">{u.nome}</span></button>))}{filtered.length === 0 && <div className="p-2 text-xs text-gray-400 text-center">Ninguém encontrado</div>}</div></div>);
};

// --- MODIFIED COMPONENT: ClientCell ---
// Agora busca em Leads e Producers (Unified)
const ClientCell = ({ clientId, onChange }: { clientId: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false); 
    const [search, setSearch] = useState(''); 
    const containerRef = useRef<HTMLDivElement>(null); 
    const style = usePopoverPosition(containerRef.current, isOpen, 280, 300);
    const [clients, setClients] = useState<any[]>([]);
    
    // Fetch clients on open
    useEffect(() => {
        if (isOpen && clients.length === 0) {
            const fetchClients = async () => {
                const [leadsSnap, producersSnap] = await Promise.all([
                    db.collection('leads').limit(100).get(),
                    db.collection('producers').limit(100).get()
                ]);
                
                const leads = leadsSnap.docs.map(d => ({id: d.id, ...d.data(), type: 'LEAD'}));
                const producers = producersSnap.docs.map(d => ({id: d.id, ...d.data(), type: 'CLIENT'}));
                
                // Merge strategies (deduplicate by id if needed, though collections differ)
                setClients([...producers, ...leads]);
            };
            fetchClients();
        }
    }, [isOpen]);

    const selectedClient = clients.find(c => c.id === clientId);
    // Fallback display if not loaded yet but ID exists
    const displayName = selectedClient ? selectedClient.nome_display : (clientId ? 'Carregando...' : 'Link');

    const filtered = clients.filter(c => c.nome_display?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="w-full h-full relative p-2" ref={containerRef}>
            <div className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors rounded-lg border border-transparent hover:border-gray-200" onClick={() => setIsOpen(true)}>
                {clientId ? (
                    <div className="flex items-center gap-2 max-w-full bg-blue-50/50 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
                        <Avatar src={selectedClient?.foto_url || ''} name={displayName} alt="" className="w-4 h-4 rounded-full"/>
                        <span className="text-[10px] font-bold text-blue-700 truncate max-w-[100px]">{displayName.split(' ')[0]}</span>
                    </div>
                ) : (
                    <span className="text-gray-300 text-xs font-bold group-hover:text-brand-500 flex items-center gap-1 transition-all"><Plus size={12}/> Link</span>
                )}
            </div>
            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col" style={style}>
                        <div className="p-3 border-b border-gray-100 bg-gray-50">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input autoFocus className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}/>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filtered.map(c => (
                                <div key={c.id} onClick={() => { onChange(c.id); setIsOpen(false); }} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                                    <Avatar src={c.foto_url} name={c.nome_display} alt="" className="w-8 h-8 rounded-full border border-gray-100"/>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-gray-700 truncate">{c.nome_display}</p>
                                            {c.type === 'CLIENT' && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded border border-green-200">CLIENTE</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-400">{c.email_contato || c.dados_contato?.email || 'Sem email'}</p>
                                    </div>
                                    {clientId === c.id && <Check size={14} className="text-brand-600"/>}
                                </div>
                            ))}
                            {filtered.length === 0 && <div className="p-4 text-center text-xs text-gray-400 italic">Nenhum cliente encontrado.</div>}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

interface Props {
  leads: Lead[];
}

export const MyWork: React.FC<Props> = ({ leads }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    // Estados principais
    const [workspaces, setWorkspaces] = useState<BoardWorkspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [boards, setBoards] = useState<Board[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [permissionError, setPermissionError] = useState(false);
    
    // Filtering from URL (Integration with CRMPanel)
    const [urlClientFilter, setUrlClientFilter] = useState<{id: string, name: string} | null>(null);

    // Initial Load & URL Params Parsing
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const clientId = params.get('clientFilter');
            const clientName = params.get('clientName');
            if (clientId) {
                setUrlClientFilter({ id: clientId, name: clientName || 'Cliente' });
                // Limpa o filtro de pessoa se estiver vendo cliente
                setFilterPersonId(null);
            }
        }
    }, []);

    // UI States
    const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
    const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<BoardWorkspace | undefined>(undefined);
    const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
    const [colMenuAnchor, setColMenuAnchor] = useState<{ el: HTMLElement, groupId: string } | null>(null);
    const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
    const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
    const activeColorPickerRef = useRef<HTMLButtonElement>(null);
    const [boardSearchTerm, setBoardSearchTerm] = useState(''); 
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set()); 
    const [editingBoardTitle, setEditingBoardTitle] = useState(false);
    const [filterMyTasks, setFilterMyTasks] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [modalBoard, setModalBoard] = useState<Board | null>(null);
    const isInitializedRef = useRef(false);
    const [openUpdatesItem, setOpenUpdatesItem] = useState<{ item: BoardItem, groupId: string } | null>(null);
    const [updateText, setUpdateText] = useState('');
    const [showMentionPicker, setShowMentionPicker] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const updateInputRef = useRef<HTMLTextAreaElement>(null);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [activeView, setActiveView] = useState<'TABLE' | 'KANBAN' | 'DASHBOARD'>('TABLE');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [filterPersonId, setFilterPersonId] = useState<string | null>(null);
    const [localColumns, setLocalColumns] = useState<BoardColumn[]>([]);
    const [isResizing, setIsResizing] = useState(false);
    const resizeState = useRef<{ colId: string, startX: number, startWidth: number } | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Data Listeners
    useEffect(() => {
        const unsub = db.collection('users').onSnapshot(snap => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario));
            setUsers(users);
        });
        return () => unsub();
    }, []);
    
    useEffect(() => {
        if (!currentUser) return;
        setLoadingData(true);
        setPermissionError(false);

        const unsubPublicWs = db.collection('workspaces_boards').where('isPublic', '==', true).onSnapshot(snap => { updateWorkspaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardWorkspace)), 'public'); }, handlePermissionError);
        const unsubMemberWs = db.collection('workspaces_boards').where('members', 'array-contains', currentUser.id).onSnapshot(snap => { updateWorkspaces(snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardWorkspace)), 'member'); }, handlePermissionError);
        const unsubMainBoards = db.collection('boards').where('type', '==', 'main').onSnapshot(snap => { updateBoards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Board)), 'main'); }, handlePermissionError);
        const unsubMemberBoards = db.collection('boards').where('members', 'array-contains', currentUser.id).onSnapshot(snap => { updateBoards(snap.docs.map(d => ({ id: d.id, ...d.data() } as Board)), 'member'); }, handlePermissionError);

        return () => { unsubPublicWs(); unsubMemberWs(); unsubMainBoards(); unsubMemberBoards(); };
    }, [currentUser]);

    const [rawWorkspaces, setRawWorkspaces] = useState<{public: BoardWorkspace[], member: BoardWorkspace[]}>({public: [], member: []});
    const [rawBoards, setRawBoards] = useState<{main: Board[], member: Board[]}>({main: [], member: []});

    const updateWorkspaces = (data: BoardWorkspace[], type: 'public' | 'member') => {
        setRawWorkspaces(prev => {
            const newState = { ...prev, [type]: data };
            const allMap = new Map<string, BoardWorkspace>();
            newState.public.forEach(w => allMap.set(w.id, w));
            newState.member.forEach(w => allMap.set(w.id, w));
            const merged = Array.from(allMap.values());
            merged.sort((a,b) => { if(a.ownerId === currentUser?.id && b.ownerId !== currentUser?.id) return -1; return 0; });
            setWorkspaces(merged);
            if (!activeWorkspaceId && merged.length > 0) setActiveWorkspaceId(merged[0].id);
            return newState;
        });
    };

    const updateBoards = (data: Board[], type: 'main' | 'member') => {
        setRawBoards(prev => {
            const newState = { ...prev, [type]: data };
            const allMap = new Map<string, Board>();
            newState.main.forEach(b => allMap.set(b.id, b));
            newState.member.forEach(b => allMap.set(b.id, b));
            setBoards(Array.from(allMap.values()));
            setLoadingData(false);
            return newState;
        });
    };

    const handlePermissionError = (error: any) => { if (error.code === 'permission-denied') { /* Handle error */ } };

    const activeWorkspace = useMemo(() => workspaces.find(w => w.id === activeWorkspaceId), [workspaces, activeWorkspaceId]);
    const currentWorkspaceBoards = useMemo(() => { if (!activeWorkspaceId) return []; return boards.filter(b => b.workspaceId === activeWorkspaceId); }, [boards, activeWorkspaceId]);

    useEffect(() => {
        if (currentWorkspaceBoards.length > 0 && !activeBoardId && !isInitializedRef.current) {
            setActiveBoardId(currentWorkspaceBoards[0].id);
            isInitializedRef.current = true;
        } else if (currentWorkspaceBoards.length === 0 && activeBoardId) {
            const boardStillExists = currentWorkspaceBoards.find(b => b.id === activeBoardId);
            if (!boardStillExists) setActiveBoardId(null);
        }
    }, [currentWorkspaceBoards, activeBoardId]);
    
    const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
    const liveUpdateItem = useMemo(() => { if (!activeBoard || !openUpdatesItem) return null; const group = activeBoard.groups.find(g => g.id === openUpdatesItem.groupId); const item = group?.items.find(i => i.id === openUpdatesItem.item.id); return item || null; }, [activeBoard, openUpdatesItem]);

    useEffect(() => {
        if (activeBoard && !isResizing && dragItem.current === null) {
            setLocalColumns(activeBoard.columns || []);
        }
    }, [activeBoard, isResizing]);

    // Actions
    const safeUpdateBoard = async (boardId: string, newBoardState: Partial<Board>, successMsg?: string) => { try { await db.collection('boards').doc(boardId).update({ ...newBoardState, updatedAt: fieldValue.serverTimestamp() }); if (successMsg) addToast({ type: 'success', message: successMsg }); } catch (e) { console.error(e); addToast({ type: 'error', message: 'Falha ao salvar alterações.' }); } };
    
    const handleCreateBoard = async (name: string, type: 'main' | 'private') => { 
        if (!name.trim() || !currentUser || !activeWorkspaceId) return; 
        try { 
            const newBoard = { ...INITIAL_BOARD_TEMPLATE, id: `b_${Date.now()}`, name: name, type: type, workspaceId: activeWorkspaceId, ownerId: currentUser.id, members: [currentUser.id], updatedAt: fieldValue.serverTimestamp() }; 
            await db.collection('boards').doc(newBoard.id).set(newBoard); 
            setShowCreateBoardModal(false); 
            setActiveBoardId(newBoard.id); 
            addToast({ type: 'success', message: 'Quadro criado com sucesso!' }); 
        } catch (e) { console.error(e); addToast({ type: 'error', message: 'Erro ao criar quadro.' }); } 
    };

    const handleCreateWorkspace = async (data: Partial<BoardWorkspace>) => {
        if (!currentUser || !data.name) return;
        try {
            const id = editingWorkspace?.id || `ws_${Date.now()}`;
            const payload = { ...data, id, ownerId: editingWorkspace?.ownerId || currentUser.id, updatedAt: fieldValue.serverTimestamp() };
            if (!editingWorkspace) { // @ts-ignore
                payload.createdAt = fieldValue.serverTimestamp();
            }
            await db.collection('workspaces_boards').doc(id).set(payload, { merge: true });
            setActiveWorkspaceId(id); setShowWorkspaceModal(false); setEditingWorkspace(undefined); addToast({ type: 'success', message: editingWorkspace ? 'Workspace atualizado' : 'Workspace criado' });
        } catch (e: any) { console.error(e); if (e.code === 'permission-denied') { addToast({ type: 'error', message: 'Permissão negada. Atualize as regras do Firestore.' }); } else { addToast({ type: 'error', message: 'Erro ao salvar workspace' }); } }
    };

    const handleDeleteBoard = async (boardId: string) => { const board = boards.find(b => b.id === boardId); if (!board) return; if (board.ownerId !== currentUser?.id && currentUser?.role !== 'admin') { addToast({ type: 'error', message: 'Apenas o dono pode excluir o quadro.' }); return; } if (!confirm(`Tem certeza que deseja excluir o quadro "${board.name}"?`)) return; try { await db.collection('boards').doc(boardId).delete(); if (activeBoardId === boardId) { setActiveBoardId(null); isInitializedRef.current = false; } addToast({ type: 'info', message: 'Quadro excluído.' }); } catch (e) { console.error(e); } };
    const handleUpdateMembers = (members: string[]) => { if (modalBoard && currentUser) { const safeMembers = Array.from(new Set([...members, modalBoard.ownerId])); safeUpdateBoard(modalBoard.id, { members: safeMembers }, 'Acessos atualizados'); setModalBoard(null); } };
    const handleRenameBoardActive = (newName: string) => { if (activeBoard) safeUpdateBoard(activeBoard.id, { name: newName }); setEditingBoardTitle(false); };
    const toggleGroupCollapse = (groupId: string) => { const newSet = new Set(collapsedGroups); if (newSet.has(groupId)) newSet.delete(groupId); else newSet.add(groupId); setCollapsedGroups(newSet); };
    const handleAddGroup = async () => { if (activeBoard) safeUpdateBoard(activeBoard.id, { groups: [{ id: `g_${Date.now()}`, title: 'Novo Grupo', color: MONDAY_COLORS[Math.floor(Math.random() * MONDAY_COLORS.length)], items: [] }, ...activeBoard.groups] }); };
    
    const handleGroupUpdate = (groupId: string, data: Partial<BoardGroup>) => { if (activeBoard) safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.map(g => g.id === groupId ? { ...g, ...data } : g) }); };
    const handleDeleteGroup = (groupId: string) => { if (activeBoard && confirm('Excluir grupo?')) safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.filter(g => g.id !== groupId) }); };
    
    const handleAddColumn = (type: BoardColumnType, title: string) => { if (!activeBoard) return; const newCol: BoardColumn = { id: `col_${Date.now()}`, title, type, width: 140, ...(type === 'status' && { settings: { options: DEFAULT_STATUS_OPTIONS } }) }; safeUpdateBoard(activeBoard.id, { columns: [...activeBoard.columns, newCol] }); setColMenuAnchor(null); };
    const handleDeleteColumn = (colId: string) => { if (!activeBoard) return; if (confirm('Tem certeza que deseja excluir esta coluna?')) { const sourceColumns = localColumns.length > 0 ? localColumns : activeBoard.columns; const newCols = sourceColumns.filter(c => c.id !== colId); setLocalColumns(newCols); safeUpdateBoard(activeBoard.id, { columns: newCols }, 'Coluna excluída'); } };
    const handleColumnTitleChange = (colId: string, newTitle: string) => { if (!activeBoard || !newTitle.trim()) return; const newCols = localColumns.map(c => c.id === colId ? { ...c, title: newTitle } : c); setLocalColumns(newCols); safeUpdateBoard(activeBoard.id, { columns: newCols }); };

    // --- SYNC ENGINE (REINFORCED) ---
    const syncItemToGlobalTasks = async (item: BoardItem, columns: BoardColumn[]) => {
        // Find client column robustly
        const clientCol = columns.find(c => c.type === 'client');
        const clientId = clientCol ? item.column_values[clientCol.id] : null;

        // If no client linked, remove from global tasks to avoid orphans
        if (!clientId) {
            try {
               await db.collection('tasks').doc(item.id).delete();
            } catch (e) {
                // Ignore delete errors if doc doesn't exist
            }
            return; 
        }

        const statusCol = columns.find(c => c.type === 'status');
        const dateCol = columns.find(c => c.type === 'date');
        const personCol = columns.find(c => c.type === 'person');

        const boardStatus = statusCol ? item.column_values[statusCol.id] : 'EMPTY';
        
        // Mapeamento de Status do Board para Status Global
        let globalStatus = 'PENDING';
        if (boardStatus === 'DONE') globalStatus = 'COMPLETED';
        else if (boardStatus === 'WORKING') globalStatus = 'IN_PROGRESS';
        else if (boardStatus === 'STUCK') globalStatus = 'STUCK';
        else if (boardStatus === 'WAITING') globalStatus = 'WAITING';

        const taskData = {
            id: item.id,
            title: item.name,
            leadId: clientId, // Link crucial para o CRMPanel
            status: globalStatus,
            dueDate: dateCol ? (item.column_values[dateCol.id] || '') : '',
            assignedTo: personCol ? (item.column_values[personCol.id] || []) : [],
            type: 'MANUAL',
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await db.collection('tasks').doc(item.id).set(taskData, { merge: true });
        } catch (error) {
            console.error("Erro ao sincronizar tarefa global:", error);
        }
    };

    // Item Management with Client Auto-Link
    const handleAddItem = async (groupId: string) => { 
        if (!activeBoard || !newItemTitles[groupId]?.trim()) return; 
        
        // Auto-fill client if filtered
        const initialColumnValues: Record<string, any> = {};
        if (urlClientFilter) {
            const clientCol = activeBoard.columns.find(c => c.type === 'client');
            if (clientCol) {
                initialColumnValues[clientCol.id] = urlClientFilter.id;
            }
        }

        const newItem: BoardItem = { 
            id: `item_${Date.now()}`, 
            name: newItemTitles[groupId], 
            column_values: initialColumnValues, 
            updates: [], 
            createdAt: new Date().toISOString() 
        }; 
        
        // Salva no Board
        await safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.map(g => g.id === groupId ? { ...g, items: [...g.items, newItem] } : g) }); 
        
        // Sync Global se tiver cliente
        if (urlClientFilter) {
            syncItemToGlobalTasks(newItem, activeBoard.columns);
        }

        setNewItemTitles(prev => ({ ...prev, [groupId]: '' })); 
    };

    const handleItemNameChange = (itemId: string, groupId: string, newName: string) => { 
        if (!activeBoard) return; 
        
        const group = activeBoard.groups.find(g => g.id === groupId);
        const item = group?.items.find(i => i.id === itemId);
        
        if (item) {
            const updatedItem = { ...item, name: newName };
            safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.map(g => g.id === groupId ? { ...g, items: g.items.map(i => i.id === itemId ? updatedItem : i) } : g) }); 
            
            // Sync Global
            syncItemToGlobalTasks(updatedItem, activeBoard.columns);
        }
    };

    const handleCellChange = (itemId: string, groupId: string, colId: string, val: any) => { 
        if (!activeBoard) return; 
        
        const colType = activeBoard.columns.find(c => c.id === colId)?.type; 
        if (colType === 'person' && currentUser) { 
            const oldIds: string[] = activeBoard.groups.find(g=>g.id===groupId)?.items.find(i=>i.id===itemId)?.column_values[colId] || []; 
            const added = (val as string[]).filter(id => !oldIds.includes(id)); 
            added.forEach(uid => { 
                if(uid!==currentUser.id) NotificationService.notifyUser(uid, { title: 'Nova Tarefa', body: `Você foi atribuído a uma tarefa em ${activeBoard.name}`, type: 'TASK_ASSIGNED', link: '#/my-work' }); 
            }); 
        } 
        
        const group = activeBoard.groups.find(g => g.id === groupId);
        const item = group?.items.find(i => i.id === itemId);

        if (item) {
            const updatedItem = { ...item, column_values: { ...item.column_values, [colId]: val } };
            safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.map(g => g.id === groupId ? { ...g, items: g.items.map(i => i.id === itemId ? updatedItem : i) } : g) }); 
            
            // Sync Global Trigger
            syncItemToGlobalTasks(updatedItem, activeBoard.columns);
        }
    };

    const handleDeleteItem = async (groupId: string, itemId: string) => { 
        if (activeBoard) {
            safeUpdateBoard(activeBoard.id, { groups: activeBoard.groups.map(g => g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g) }); 
            // Delete Global Task
            try {
                await db.collection('tasks').doc(itemId).delete();
            } catch (e) {
                console.error("Erro ao deletar tarefa global:", e);
            }
        }
    };

    const handleMoveItem = (groupId: string, itemId: string, direction: 'up' | 'down') => { if (!activeBoard) return; const group = activeBoard.groups.find(g => g.id === groupId); if (!group) return; const items = [...group.items]; const index = items.findIndex(i => i.id === itemId); if (index === -1) return; if (direction === 'up' && index > 0) { [items[index], items[index - 1]] = [items[index - 1], items[index]]; } else if (direction === 'down' && index < items.length - 1) { [items[index], items[index + 1]] = [items[index + 1], items[index]]; } const newGroups = activeBoard.groups.map(g => g.id === groupId ? { ...g, items } : g); safeUpdateBoard(activeBoard.id, { groups: newGroups }); };
    const handleInputCheck = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const val = e.target.value; setUpdateText(val); if (val.endsWith('@')) { setShowMentionPicker(true); setMentionQuery(''); } else if (showMentionPicker) { const lastAt = val.lastIndexOf('@'); if (lastAt !== -1) setMentionQuery(val.substring(lastAt + 1)); else setShowMentionPicker(false); } };
    const handleMentionSelect = (user: Usuario) => { const lastAt = updateText.lastIndexOf('@'); const newText = updateText.substring(0, lastAt) + `@${user.nome} ` + updateText.substring(updateInputRef.current?.selectionStart || updateText.length); setUpdateText(newText); setShowMentionPicker(false); updateInputRef.current?.focus(); };
    const handleSendUpdate = async () => { if (!activeBoard || !openUpdatesItem || !updateText.trim() || !currentUser) return; const newUpdate: BoardItemUpdate = { id: `u_${Date.now()}`, authorId: currentUser.id, text: updateText, createdAt: new Date().toISOString(), likes: 0 }; const updatedGroups = activeBoard.groups.map(g => g.id === openUpdatesItem.groupId ? { ...g, items: g.items.map(i => i.id === openUpdatesItem.item.id ? { ...i, updates: [...i.updates, newUpdate] } : i) } : g); await safeUpdateBoard(activeBoard.id, { groups: updatedGroups }); setUpdateText(''); };

    // -- RESIZE & DRAG LOGIC --
    const handleResizeStart = (e: React.MouseEvent, colId: string, width: number) => { e.preventDefault(); e.stopPropagation(); setIsResizing(true); resizeState.current = { colId, startX: e.clientX, startWidth: width }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; };
    useEffect(() => { const handleMouseMove = (e: MouseEvent) => { if (!isResizing || !resizeState.current) return; const { colId, startX, startWidth } = resizeState.current; const diff = e.clientX - startX; const newWidth = Math.max(MIN_COL_WIDTH, startWidth + diff); setLocalColumns(prev => prev.map(c => c.id === colId ? { ...c, width: newWidth } : c)); }; const handleMouseUp = () => { if (!isResizing) return; setIsResizing(false); document.body.style.cursor = ''; document.body.style.userSelect = ''; resizeState.current = null; if (activeBoard && localColumns.length > 0) { safeUpdateBoard(activeBoard.id, { columns: localColumns }); } }; if (isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); } return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [isResizing, localColumns, activeBoard]);
    const handleDragStart = (e: React.DragEvent, index: number) => { dragItem.current = index; };
    const handleDragEnter = (e: React.DragEvent, index: number) => { e.preventDefault(); dragOverItem.current = index; if (dragItem.current !== null && dragItem.current !== index) { const newCols = [...localColumns]; const draggedContent = newCols[dragItem.current]; newCols.splice(dragItem.current, 1); newCols.splice(index, 0, draggedContent); setLocalColumns(newCols); dragItem.current = index; } };
    const handleDragEnd = () => { dragItem.current = null; dragOverItem.current = null; if (activeBoard) { safeUpdateBoard(activeBoard.id, { columns: localColumns }); } };

    const filteredGroups = useMemo(() => {
        if (!activeBoard) return [];
        let groups = activeBoard.groups;
        
        if (boardSearchTerm) { 
            groups = groups.map(group => ({ ...group, items: group.items.filter(item => item.name.toLowerCase().includes(boardSearchTerm.toLowerCase())) })); 
        }
        
        if (filterMyTasks && currentUser) { 
            const personCol = activeBoard.columns.find(c => c.type === 'person'); 
            if (personCol) { 
                groups = groups.map(group => ({ 
                    ...group, 
                    items: group.items.filter(item => { 
                        const assigned = item.column_values[personCol.id] as string[]; 
                        return assigned && assigned.includes(currentUser.id); 
                    }) 
                })); 
            } 
        }

        if (filterPersonId) {
            const personCol = activeBoard.columns.find(c => c.type === 'person');
            if (personCol) {
                groups = groups.map(group => ({
                    ...group,
                    items: group.items.filter(item => {
                        const assigned = item.column_values[personCol.id] as string[];
                        return assigned && assigned.includes(filterPersonId);
                    })
                }));
            }
        }

        if (urlClientFilter) {
            const clientCol = activeBoard.columns.find(c => c.type === 'client');
            if (clientCol) {
                groups = groups.map(group => ({
                    ...group,
                    items: group.items.filter(item => {
                        const clientId = item.column_values[clientCol.id];
                        return clientId === urlClientFilter.id;
                    })
                }));
            }
        }

        return groups.filter(group => group.items.length > 0 || (!boardSearchTerm && !filterMyTasks && !filterPersonId && !urlClientFilter)); 
    }, [activeBoard, boardSearchTerm, filterMyTasks, currentUser, filterPersonId, urlClientFilter]);

    const { favoriteBoards, mainBoards, privateBoards } = useMemo(() => {
        const filtered = currentWorkspaceBoards.filter(b => b.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
        return {
            favoriteBoards: filtered.filter(b => favorites.has(b.id)),
            mainBoards: filtered.filter(b => !favorites.has(b.id) && b.type === 'main'),
            privateBoards: filtered.filter(b => !favorites.has(b.id) && b.type === 'private')
        };
    }, [currentWorkspaceBoards, sidebarSearch, favorites]);

    const toggleFavorite = (boardId: string, e: React.MouseEvent) => { e.stopPropagation(); const newFav = new Set(favorites); if (newFav.has(boardId)) newFav.delete(boardId); else newFav.add(boardId); setFavorites(newFav); };

    const renderCell = (item: BoardItem, col: BoardColumn, groupId: string, groupColor: string) => {
        const val = item.column_values[col.id];
        // Special logic for Date Cell to check overdue based on status column
        if (col.type === 'date') {
            const statusCol = activeBoard?.columns.find(c => c.type === 'status');
            const statusId = statusCol ? item.column_values[statusCol.id] : null;
            return <DateCell dateStr={val || ''} statusId={statusId} onChange={(v: string) => handleCellChange(item.id, groupId, col.id, v)} />;
        }

        switch (col.type) {
            case 'status': return <StatusCell selectedId={val} config={col.settings?.options} onChange={(v: string) => handleCellChange(item.id, groupId, col.id, v)} />;
            case 'person': return <PeopleCell personIds={val || []} users={users} onChange={(v: string[]) => handleCellChange(item.id, groupId, col.id, v)} />;
            case 'client': return <ClientCell clientId={val || ''} onChange={(v: string) => handleCellChange(item.id, groupId, col.id, v)} />;
            case 'numbers': return <NumberCell value={val} onChange={(v: string) => handleCellChange(item.id, groupId, col.id, v)} />;
            case 'text': return <TextCell value={val} onChange={(v: string) => handleCellChange(item.id, groupId, col.id, v)} />;
            case 'checkbox': return <CheckboxCell value={val} onChange={(v: boolean) => handleCellChange(item.id, groupId, col.id, v)} />;
            default: return null;
        }
    };

    const renderBoardListItem = (board: Board) => (
        <div key={board.id} onClick={() => setActiveBoardId(board.id)} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer relative ${activeBoardId === board.id ? 'bg-brand-50/80 text-brand-700' : 'text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
            {activeBoardId === board.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full"></div>}
            <div className="flex items-center gap-2.5 overflow-hidden">
                <div className={`p-1 rounded ${activeBoardId === board.id ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                    {board.type === 'private' ? <Lock size={12}/> : <LayoutGrid size={12}/>}
                </div>
                <span className="truncate">{board.name}</span>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => toggleFavorite(board.id, e)} className={`p-1 hover:bg-gray-100 rounded-full transition-all ${favorites.has(board.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'}`}><Star size={12} fill={favorites.has(board.id) ? "currentColor" : "none"}/></button>
                <BoardActionMenu board={board} currentUserId={currentUser?.id || ''} onRename={() => { setActiveBoardId(board.id); setEditingBoardTitle(true); }} onDelete={() => handleDeleteBoard(board.id)} onShare={() => setModalBoard(board)} />
            </div>
        </div>
    );

    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100 m-4">
                <div className="bg-red-50 p-4 rounded-full mb-4"><ShieldCheck size={48} className="text-red-500" /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
                <p className="text-gray-500 max-w-md text-sm leading-relaxed mb-4">Você não tem permissão para acessar os Workspaces. Solicite ao admin para atualizar as regras.</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all">Tentar Novamente</button>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#FAFAFA] rounded-none overflow-hidden relative animate-in fade-in duration-500 font-sans">
            {showWorkspaceModal && <WorkspaceModal workspace={editingWorkspace} users={users} onClose={() => { setShowWorkspaceModal(false); setEditingWorkspace(undefined); }} onSave={handleCreateWorkspace} currentUserId={currentUser?.id || ''}/>}
            {showCreateBoardModal && activeWorkspaceId && <CreateBoardModal onClose={() => setShowCreateBoardModal(false)} onSave={handleCreateBoard} workspaceName={activeWorkspace?.name || ''} />}

            {/* SIDEBAR */}
            <div className={`${isSidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0'} transition-all duration-300 ease-in-out bg-[#F7F9FA] border-r border-gray-200 flex flex-col shrink-0 overflow-hidden relative z-20`}>
                <div className="w-[280px] flex flex-col h-full"> 
                    <div className="p-4 border-b border-gray-100 bg-[#F7F9FA] sticky top-0 z-10">
                        <div className="relative">
                            <button onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all group">
                                <div className="flex items-center gap-2.5 overflow-hidden"><div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{activeWorkspace?.name.charAt(0) || 'B'}</div><div className="flex flex-col items-start min-w-0"><span className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{activeWorkspace?.name || 'Work OS'}</span><span className="text-[10px] text-gray-500 font-medium">Workspace</span></div></div><ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600"/>
                            </button>
                            {showWorkspaceSwitcher && (<><div className="fixed inset-0 z-20" onClick={() => setShowWorkspaceSwitcher(false)}></div><div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden animate-in fade-in zoom-in-95 origin-top"><div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar"><div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seus Workspaces</div>{workspaces.map(ws => (<button key={ws.id} onClick={() => { setActiveWorkspaceId(ws.id); setShowWorkspaceSwitcher(false); setActiveBoardId(null); }} className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${activeWorkspaceId === ws.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'}`}><span className="text-xs font-bold truncate">{ws.name}</span>{activeWorkspaceId === ws.id && <Check size={14}/>}</button>))}</div><div className="p-2 border-t border-gray-100 bg-gray-50"><button onClick={() => { setShowWorkspaceModal(true); setShowWorkspaceSwitcher(false); }} className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"><Plus size={14}/> Novo Workspace</button></div></div></>)}
                        </div>
                        <div className="flex items-center gap-1 mt-3 justify-end"><button onClick={() => setShowCreateBoardModal(true)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all border border-transparent hover:border-gray-200" title="Criar novo quadro"><Plus size={16}/></button><button onClick={() => { setEditingWorkspace(activeWorkspace); setShowWorkspaceModal(true); }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all border border-transparent hover:border-gray-200" title="Configurar Workspace"><Settings size={16}/></button><button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 transition-all border border-transparent hover:border-gray-200 block md:hidden" title="Recolher menu"><PanelLeftClose size={16}/></button></div>
                    </div>
                    <div className="px-3 py-3"><div className="relative group"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors"/><input type="text" placeholder="Filtrar quadros..." className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}/></div></div>
                    <div className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar pb-4">{loadingData ? ([1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse mb-1"></div>)) : (<>{favoriteBoards.length > 0 && (<div className="animate-in fade-in slide-in-from-left-2"><div className="flex items-center justify-between mb-1 px-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Star size={10} className="fill-gray-400"/> Favoritos</span></div><div className="space-y-0.5">{favoriteBoards.map(renderBoardListItem)}</div></div>)}<div className="animate-in fade-in slide-in-from-left-2 delay-75"><div className="flex items-center justify-between mb-1 px-2 mt-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Públicos</span></div>{mainBoards.length === 0 && <div className="text-xs text-gray-400 px-2 py-1 italic">Nenhum quadro público neste workspace.</div>}<div className="space-y-0.5">{mainBoards.map(renderBoardListItem)}</div></div><div className="animate-in fade-in slide-in-from-left-2 delay-100"><div className="flex items-center justify-between mb-1 px-2 mt-2"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Privados</span></div>{privateBoards.length === 0 && <div className="text-xs text-gray-400 px-2 py-1 italic">Nenhum quadro privado.</div>}<div className="space-y-0.5">{privateBoards.map(renderBoardListItem)}</div></div></>)}</div>
                    <div className="p-3 border-t border-gray-200 bg-white/50"><div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer"><Avatar src={currentUser?.avatar || ''} name={currentUser?.nome || '?'} alt="" className="w-8 h-8 rounded-lg border border-gray-200"/><div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900 truncate">{currentUser?.nome}</p><p className="text-[10px] text-gray-500 truncate">{currentUser?.email}</p></div></div></div>
                </div>
            </div>

            {!isSidebarOpen && (<div className="absolute left-4 top-4 z-20 animate-in fade-in zoom-in duration-300"><button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white border border-gray-200 shadow-md rounded-lg text-gray-500 hover:text-brand-600 hover:border-brand-300 transition-all" title="Expandir menu"><PanelLeftOpen size={20} /></button></div>)}

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative transition-all duration-300 h-full">
                {loadingData ? (<BoardSkeleton />) : activeBoard ? (
                    <>
                        <div className={`border-b border-gray-200 bg-white/90 backdrop-blur-md z-30 transition-all flex flex-col sticky top-0 ${!isSidebarOpen ? 'pl-16' : ''}`}>
                            <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                    <span className="hover:text-gray-900 cursor-pointer transition-colors">{activeWorkspace?.name || 'Workspace'}</span>
                                    <ChevronRight size={14} className="text-gray-300"/>
                                    <span className="hover:text-gray-900 cursor-pointer transition-colors">Quadros</span>
                                    <ChevronRight size={14} className="text-gray-300"/>
                                    <div className="flex items-center gap-2 group">
                                        {editingBoardTitle ? (<EditableText className="text-lg font-black text-gray-900 bg-transparent outline-none border-b-2 border-brand-500 min-w-[200px]" value={activeBoard.name} onChange={handleRenameBoardActive} autoFocus />) : (<h1 onClick={() => setEditingBoardTitle(true)} className="text-lg font-black text-gray-900 tracking-tight cursor-pointer hover:bg-gray-50 px-2 -ml-2 rounded-lg transition-colors flex items-center gap-2">{activeBoard.name}</h1>)}
                                        <button onClick={(e) => toggleFavorite(activeBoard.id, e)} className={`p-1 hover:bg-gray-100 rounded-full transition-all ${favorites.has(activeBoard.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'}`}><Star size={16} fill={favorites.has(activeBoard.id) ? "currentColor" : "none"}/></button>
                                        <button className="p-1 hover:bg-gray-100 rounded-full transition-all text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"><Info size={16} /></button>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">{activeBoard.members?.slice(0, 4).map(uid => { const user = users.find(u => u.id === uid); return <Avatar key={uid} src={user?.avatar || ''} name={user?.nome || '?'} alt="" className="w-7 h-7 rounded-full border-2 border-white bg-gray-100" />; })}<button onClick={() => setModalBoard(activeBoard)} className="w-7 h-7 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors z-10 text-[10px]"><Plus size={12}/></button></div>
                                    <div className="h-5 w-px bg-gray-200"></div>
                                    <button onClick={() => setModalBoard(activeBoard)} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"><UserPlus size={14}/> Convidar</button>
                                </div>
                            </div>

                            <div className="px-6 py-2 flex justify-between items-center gap-4 overflow-x-auto">
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setActiveView('TABLE')} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${activeView === 'TABLE' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><Table size={14} /> Tabela Principal</button>
                                    <button onClick={() => setActiveView('KANBAN')} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${activeView === 'KANBAN' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><Kanban size={14} /> Kanban</button>
                                    <button onClick={() => setActiveView('DASHBOARD')} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${activeView === 'DASHBOARD' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><BarChart2 size={14} /> Dashboard</button>
                                    <div className="h-5 w-px bg-gray-200 mx-2"></div>
                                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"><Plus size={16}/></button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* URL Filter Badge */}
                                    {urlClientFilter && (
                                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Filtrado: {urlClientFilter.name}</span>
                                            <button onClick={() => { setUrlClientFilter(null); window.location.hash = '#/my-work'; }} className="hover:bg-blue-100 rounded-full p-0.5"><X size={12}/></button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mr-2">
                                        <button onClick={() => setFilterMyTasks(!filterMyTasks)} className={`w-7 h-7 rounded-full border-2 transition-all overflow-hidden ${filterMyTasks ? 'border-brand-500 ring-2 ring-brand-100' : 'border-transparent hover:border-gray-200'}`} title="Filtrar minhas tarefas"><Avatar src={currentUser?.avatar || ''} name={currentUser?.nome || '?'} alt="" className="w-full h-full"/></button>
                                        {activeBoard.members?.slice(0, 3).map(uid => { if (uid === currentUser?.id) return null; const user = users.find(u => u.id === uid); if (!user) return null; const isSelected = filterPersonId === uid; return (<button key={uid} onClick={() => setFilterPersonId(isSelected ? null : uid)} className={`w-7 h-7 rounded-full border-2 transition-all overflow-hidden ${isSelected ? 'border-blue-500 ring-2 ring-blue-100 scale-110' : 'border-transparent hover:border-gray-200 opacity-60 hover:opacity-100'}`} title={`Filtrar por ${user.nome}`}><Avatar src={user.avatar} name={user.nome} alt="" className="w-full h-full"/></button>); })}
                                        <div className="h-5 w-px bg-gray-200"></div>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"><ListFilter size={14} /> Filtro</button>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all"><SortAsc size={14} /> Ordenar</button>
                                    <div className="relative group"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500"/><input type="text" placeholder="Buscar..." className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 w-32 transition-all focus:w-48" value={boardSearchTerm} onChange={e => setBoardSearchTerm(e.target.value)}/></div>
                                </div>
                            </div>
                        </div>

                        {activeView === 'TABLE' ? (
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar space-y-10 pb-32 bg-white">
                                {filteredGroups.map(group => {
                                    const isCollapsed = collapsedGroups.has(group.id);
                                    return (
                                        <div key={group.id} className="animate-in slide-in-from-bottom-4 duration-700 group/container">
                                            <div className="flex items-center gap-2 mb-4 group/header select-none sticky left-0">
                                                <button onClick={() => toggleGroupCollapse(group.id)} className="p-1 rounded hover:bg-gray-100 transition-colors">{isCollapsed ? <ChevronRight size={20} style={{ color: group.color }} /> : <ChevronDown size={20} style={{ color: group.color }} />}</button>
                                                <div className="relative"><button ref={activeColorPickerRef} onClick={() => setActiveColorPicker(activeColorPicker === group.id ? null : group.id)} className="w-4 h-4 rounded-full hover:scale-110 transition-transform" style={{ backgroundColor: group.color }}></button>{activeColorPicker === group.id && <ColorPicker triggerRef={activeColorPickerRef} onClose={() => setActiveColorPicker(null)} selected={group.color} onSelect={(c) => { handleGroupUpdate(group.id, { color: c }); setActiveColorPicker(null); }} />}</div>
                                                {editingGroupTitle === group.id ? (<EditableText className="text-lg font-bold text-gray-900 bg-white border border-brand-300 rounded px-2 py-0.5 outline-none shadow-sm" value={group.title} onChange={(val) => { handleGroupUpdate(group.id, { title: val }); setEditingGroupTitle(null); }} autoFocus />) : (<h3 onClick={() => setEditingGroupTitle(group.id)} className="text-lg font-bold cursor-text hover:bg-gray-50 px-2 rounded transition-colors" style={{ color: group.color }}>{group.title}</h3>)}
                                                <span className="text-gray-300 text-xs font-bold border border-gray-100 px-2 py-0.5 rounded-full bg-gray-50">{group.items.length} Tasks</span>
                                                <div className="ml-auto opacity-0 group-hover/container:opacity-100 transition-opacity flex gap-1"><button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button></div>
                                            </div>

                                            {!isCollapsed && (
                                                <div className="border border-gray-200 rounded-xl overflow-visible shadow-sm bg-white ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300 overflow-x-auto pb-2 relative">
                                                    <div className="flex h-10 items-center border-b border-gray-200 bg-gray-50/50 rounded-t-xl sticky top-0 z-20 min-w-full w-max">
                                                        <div className="w-1.5 h-full rounded-tl-xl sticky left-0 z-30" style={{ backgroundColor: group.color }}></div>
                                                        <div className="w-8 h-full border-r border-gray-100 bg-gray-50/50 sticky left-1.5 z-30"></div>
                                                        <div className="flex-1 px-4 border-r border-gray-100 min-w-[320px] flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky left-[38px] bg-[#F9FAFB]/95 backdrop-blur-md z-30 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] border-r-2 border-r-gray-100/50">Tarefa</div>
                                                        {localColumns.map((col, idx) => (
                                                            <div key={col.id} style={{ width: col.width, minWidth: MIN_COL_WIDTH, flexShrink: 0 }} className="h-full border-r border-gray-100 flex items-center justify-center relative group/col cursor-grab active:cursor-grabbing hover:bg-gray-100/50 transition-colors" draggable onDragStart={(e) => handleDragStart(e, idx)} onDragEnter={(e) => handleDragEnter(e, idx)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()}>
                                                                <div className="flex-1 min-w-0 flex items-center justify-center px-2"><EditableText value={col.title} onChange={(val) => handleColumnTitleChange(col.id, val)} className="bg-transparent text-center w-full outline-none text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-text hover:text-gray-600 transition-colors truncate"/></div>
                                                                <div className="absolute top-1/2 -translate-y-1/2 right-1 z-10" onMouseDown={e => e.stopPropagation()}><ColumnHeaderMenu onDelete={() => handleDeleteColumn(col.id)} /></div>
                                                                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-400 z-20 transition-colors opacity-0 group-hover/col:opacity-50" onMouseDown={(e) => handleResizeStart(e, col.id, col.width)}/>
                                                            </div>
                                                        ))}
                                                        <div className="w-12 h-full flex items-center justify-center relative"><button onClick={(e) => setColMenuAnchor({ el: e.currentTarget, groupId: group.id })} className="w-6 h-6 rounded hover:bg-gray-200 text-gray-400 flex items-center justify-center transition-colors"><Plus size={14}/></button>{colMenuAnchor?.groupId === group.id && (<ColumnMenu triggerEl={colMenuAnchor.el} onAddColumn={handleAddColumn} onClose={() => setColMenuAnchor(null)} />)}</div>
                                                    </div>

                                                    {group.items?.map(item => {
                                                        // Lógica para detectar coluna de cliente e botão de chat
                                                        const clientCol = activeBoard.columns.find(c => c.type === 'client');
                                                        const linkedClientId = clientCol ? item.column_values[clientCol.id] : null;

                                                        return (
                                                            <div key={item.id} className="flex h-12 items-center border-b border-gray-100 bg-white hover:bg-gray-50/50 transition-colors group/row relative min-w-full w-max">
                                                                <div className="w-1.5 h-full sticky left-0 z-20" style={{ backgroundColor: group.color }}></div>
                                                                <div className="w-8 h-full border-r border-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group/menu relative sticky left-1.5 z-20 bg-white"><RowActionMenu onMoveUp={() => handleMoveItem(group.id, item.id, 'up')} onMoveDown={() => handleMoveItem(group.id, item.id, 'down')} onDelete={() => handleDeleteItem(group.id, item.id)}/></div>
                                                                <div className="flex-1 px-4 border-r border-gray-100 min-w-[320px] h-full flex items-center relative sticky left-[38px] bg-white group-hover/row:bg-[#F9FAFB] z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] transition-colors border-r-2 border-r-gray-100/50">
                                                                    <EditableText value={item.name} onChange={(val) => handleItemNameChange(item.id, group.id, val)} className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none truncate pr-20" />
                                                                    <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all translate-x-2 group-hover/row:translate-x-0">
                                                                        <button onClick={() => setOpenUpdatesItem({ item, groupId: group.id })} className={`p-1.5 rounded-md transition-colors relative ${item.updates.length > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-300 hover:text-blue-500 hover:bg-blue-50'}`} title="Updates"><MessageCircle size={16} />{item.updates.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></span>}</button>
                                                                        {linkedClientId && (<button onClick={() => window.location.hash = `#/inbox?chatId=${linkedClientId}`} className="p-1.5 rounded-md text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Ir para Chat"><MessageCircle size={16} /></button>)}
                                                                    </div>
                                                                </div>
                                                                {localColumns.map(col => (<div key={col.id} style={{ width: col.width, minWidth: MIN_COL_WIDTH, flexShrink: 0 }} className="h-full border-r border-gray-100 relative">{renderCell(item, col, group.id, group.color)}</div>))}
                                                                <div className="w-12 bg-white group-hover/row:bg-[#F9FAFB]"></div>
                                                            </div>
                                                        );
                                                    })}

                                                    <div className="flex h-10 items-center rounded-b-xl overflow-hidden group/add min-w-full w-max">
                                                        <div className="w-1.5 h-full rounded-bl-xl sticky left-0 z-20" style={{ backgroundColor: group.color }}></div>
                                                        <div className="w-8 h-full border-r border-gray-100 sticky left-1.5 z-20 bg-white"></div>
                                                        <div className="flex-1 px-4 flex items-center sticky left-[38px] bg-white z-20 min-w-[320px]">
                                                            <input type="text" placeholder={urlClientFilter ? `+ Nova tarefa para ${urlClientFilter.name}` : "+ Adicionar Tarefa"} className="w-full bg-transparent text-sm text-gray-400 placeholder:text-gray-300 outline-none transition-colors group-focus-within/add:text-gray-700" value={newItemTitles[group.id] || ''} onChange={(e) => setNewItemTitles(prev => ({...prev, [group.id]: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && handleAddItem(group.id)} />
                                                            {newItemTitles[group.id] && <button onClick={() => handleAddItem(group.id)} className="px-3 py-0.5 bg-brand-600 text-white text-[10px] font-bold rounded shadow-md animate-in zoom-in">Add</button>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Progress Bar Footer */}
                                            <div className="flex mt-1 px-10 gap-1 overflow-hidden sticky left-0">
                                                {localColumns.map((col, idx) => (
                                                    <div key={col.id} style={{ width: col.width }} className={`h-1.5 rounded-full ${idx === 0 ? 'ml-[320px]' : ''} ${col.type === 'status' && !isCollapsed ? 'bg-gray-100 overflow-hidden flex' : 'bg-transparent'}`}>
                                                        {col.type === 'status' && !isCollapsed && group.items.length > 0 && (
                                                            <>
                                                                {/* Calculate distribution of statuses */}
                                                                {(col.settings?.options || []).map((opt: BoardStatusOption) => {
                                                                    const count = group.items.filter(i => i.column_values[col.id] === opt.id).length;
                                                                    if (count === 0) return null;
                                                                    const width = (count / group.items.length) * 100;
                                                                    return <div key={opt.id} className="h-full transition-all duration-500" style={{ width: `${width}%`, backgroundColor: opt.color }} title={`${opt.label}: ${count}`}></div>
                                                                })}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={handleAddGroup} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 group sticky left-0"><Plus size={18} className="group-hover:scale-110 transition-transform"/> Adicionar Novo Grupo</button>
                            </div>
                        ) : (<div className="flex flex-col items-center justify-center h-full text-gray-300 bg-white"><div className="p-6 rounded-full bg-gray-50 border border-gray-100 mb-4"><Kanban size={48} className="stroke-[1.5] text-gray-300"/></div><h3 className="text-lg font-bold text-gray-900 mb-1">Visualização Kanban</h3><p className="text-sm text-gray-500 mb-4">Esta funcionalidade está em desenvolvimento.</p><button onClick={() => setActiveView('TABLE')} className="text-xs font-bold text-brand-600 hover:underline">Voltar para Tabela</button></div>)}
                    </>
                ) : (<div className="flex flex-col items-center justify-center h-full text-gray-300 bg-white"><div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100 animate-in zoom-in duration-500"><LayoutGrid size={48} className="stroke-[1.5] text-gray-300"/></div><h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo ao Work OS</h2><p className="text-gray-500 text-sm mb-8">Selecione um quadro na barra lateral ou crie um novo para começar.</p>{workspaces.length === 0 ? (<button onClick={() => setShowWorkspaceModal(true)} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:-translate-y-0.5">Criar Primeiro Workspace</button>) : (<button onClick={() => setShowCreateBoardModal(true)} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition-all hover:-translate-y-0.5">Criar Novo Quadro</button>)}</div>)}
                {liveUpdateItem && openUpdatesItem && (<><div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[1px] z-30 transition-opacity" onClick={() => setOpenUpdatesItem(null)}></div><div className="absolute top-0 right-0 bottom-0 w-[450px] bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col animate-in slide-in-from-right duration-300"><div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50"><div><h2 className="text-lg font-black text-gray-900 leading-tight mb-1">{liveUpdateItem.name}</h2><div className="flex items-center gap-2"><span className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500 uppercase tracking-wide">{activeBoard?.groups.find(g => g.id === openUpdatesItem.groupId)?.title}</span><span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10}/> {new Date(liveUpdateItem.createdAt || '').toLocaleDateString()}</span></div></div><button onClick={() => setOpenUpdatesItem(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB] space-y-6 custom-scrollbar">
                    
                    {/* Descrição da Tarefa (Novo) */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><AlignLeft size={12}/> Descrição</label>
                        <textarea 
                            className="w-full text-sm text-gray-700 outline-none resize-none bg-transparent placeholder:text-gray-300 min-h-[80px]" 
                            placeholder="Adicione uma descrição detalhada..." 
                            defaultValue={liveUpdateItem.column_values['description'] || ''}
                            onBlur={(e) => handleCellChange(liveUpdateItem.id, openUpdatesItem.groupId, 'description', e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Atualizações</h4>
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{liveUpdateItem.updates?.length || 0}</span>
                    </div>

                    {liveUpdateItem.updates?.length === 0 ? (<div className="flex flex-col items-center justify-center h-32 text-gray-300 text-center border-2 border-dashed border-gray-100 rounded-xl"><div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2"><MessageCircle size={20} className="text-gray-300"/></div><p className="text-xs text-gray-400">Nenhuma atualização ainda.</p></div>) : (liveUpdateItem.updates?.map(update => { const author = users.find(u => u.id === update.authorId); return (<div key={update.id} className="flex gap-4 group animate-in slide-in-from-bottom-2"><Avatar src={author?.avatar || ''} name={author?.nome || '?'} alt="" className="w-8 h-8 rounded-full border-2 border-white shadow-sm mt-1" /><div className="flex-1"><div className="flex justify-between items-baseline mb-1"><span className="text-sm font-bold text-gray-900">{author?.nome}</span><span className="text-[10px] text-gray-400">{new Date(update.createdAt).toLocaleString()}</span></div><div className="bg-white p-3 rounded-xl rounded-tl-none border border-gray-200 text-sm text-gray-700 leading-relaxed shadow-sm">{update.text}</div></div></div>); }))}</div><div className="p-6 border-t border-gray-100 bg-white relative shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">{showMentionPicker && (<MentionPicker users={users} filter={mentionQuery} onSelect={handleMentionSelect} onClose={() => setShowMentionPicker(false)}/>)}<div className="bg-gray-50 border border-gray-200 rounded-xl shadow-inner overflow-hidden focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all"><textarea ref={updateInputRef} className="w-full p-4 text-sm outline-none resize-none h-24 placeholder:text-gray-400 bg-transparent" placeholder="Escreva uma atualização..." value={updateText} onChange={handleInputCheck} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendUpdate())}/><div className="p-2 flex justify-between items-center border-t border-gray-200/50 bg-white"><div className="flex gap-1"><button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"><Paperclip size={16}/></button><button onClick={() => { setShowMentionPicker(true); setMentionQuery(''); }} className={`p-1.5 rounded transition-colors ${showMentionPicker ? 'bg-brand-50 text-brand-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}><AtSign size={16}/></button></div><button onClick={handleSendUpdate} disabled={!updateText.trim()} className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-brand-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2"><Send size={14}/> Enviar</button></div></div></div></div></>)}
                {modalBoard && (<ShareBoardModal board={modalBoard} users={users} onClose={() => setModalBoard(null)} onSave={handleUpdateMembers}/>)}
            </div>
        </div>
    );
};