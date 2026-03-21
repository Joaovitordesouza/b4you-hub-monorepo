
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth, fieldValue } from '../firebase';
import { WorkTask, TaskStatus, Usuario } from '../types';
import { 
    Calendar, CheckCircle2, AlertTriangle, Filter, Plus, 
    ListTodo, Search, ArrowRight, LayoutList, CalendarDays,
    CheckSquare, Clock, ChevronLeft, ChevronRight, Trash2, User, X,
    ChevronDown, Check, Briefcase
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../AuthContext';
import { SmartTaskCard } from '../components/Task/SmartTaskCard';
import { Avatar } from '../components/Avatar';
import { TaskDetailModal } from '../components/Task/TaskDetailModal';

// --- MINI CALENDAR FOR CREATION ---
const CreationDatePopover = ({ selectedDate, onChange, onClose }: { selectedDate: string, onChange: (date: string) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    return (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-50 w-64 animate-in fade-in zoom-in-95" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()-1); setViewDate(d); }} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={16}/></button>
                <span className="text-xs font-bold text-gray-800">{monthNames[month]} {year}</span>
                <button type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth()+1); setViewDate(d); }} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {['D','S','T','Q','Q','S','S'].map(d => <div key={d} className="text-[9px] font-bold text-gray-400 text-center">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = new Date(year, month, day).toLocaleDateString('en-CA');
                    const isSelected = selectedDate === dateStr;
                    return (
                        <button 
                            key={day} 
                            type="button"
                            onClick={() => { onChange(dateStr); onClose(); }}
                            className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${isSelected ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { onChange(new Date().toLocaleDateString('en-CA')); onClose(); }} className="flex-1 py-1 text-[10px] font-bold bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Hoje</button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); onChange(d.toLocaleDateString('en-CA')); onClose(); }} className="flex-1 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Amanhã</button>
            </div>
        </div>
    );
};

// --- CLIENT FILTER DROPDOWN ---
interface ClientOption { id: string; name: string; avatar?: string; }

const ClientFilterDropdown = ({ 
    clients, 
    selectedId, 
    onChange 
}: { 
    clients: ClientOption[], 
    selectedId: string | null, 
    onChange: (id: string | null) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedClient = clients.find(c => c.id === selectedId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm min-w-[180px] justify-between
                    ${selectedId 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedId && selectedClient ? (
                        <Avatar src={selectedClient.avatar || ''} name={selectedClient.name} alt="" className="w-5 h-5 rounded-full border border-blue-100" />
                    ) : (
                        <div className="p-1 bg-gray-100 rounded-md"><Briefcase size={12} className="text-gray-500"/></div>
                    )}
                    <span className="truncate max-w-[120px]">{selectedClient ? selectedClient.name : 'Todos os Clientes'}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 origin-top-left ring-1 ring-black/5">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 sticky top-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Filtrar por nome..." 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                        <button 
                            onClick={() => { onChange(null); setIsOpen(false); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${!selectedId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border border-white shadow-sm">
                                <ListTodo size={14} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Todos os Clientes</span>
                            {!selectedId && <Check size={14} className="ml-auto text-brand-600"/>}
                        </button>

                        {filteredClients.map(client => (
                            <button 
                                key={client.id}
                                onClick={() => { onChange(client.id); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${selectedId === client.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <Avatar src={client.avatar || ''} name={client.name} alt="" className="w-8 h-8 rounded-full border border-gray-100 shadow-sm" />
                                <div className="text-left flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${selectedId === client.id ? 'text-blue-700' : 'text-gray-900'}`}>{client.name}</p>
                                </div>
                                {selectedId === client.id && <Check size={14} className="ml-auto text-blue-600"/>}
                            </button>
                        ))}

                        {filteredClients.length === 0 && (
                            <div className="py-8 text-center text-gray-400">
                                <p className="text-xs">Nenhum cliente encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

type FilterType = 'ALL' | 'TODAY' | 'OVERDUE' | 'COMPLETED';

export const SimpleTaskManager: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    // Data States
    const [tasks, setTasks] = useState<WorkTask[]>([]);
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickDate, setQuickDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
    
    // New State for Collapsed Groups
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Click outside listener for date picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Tasks & Users
    useEffect(() => {
        if (!currentUser) return;
        
        // Fetch Tasks (Updated Query to allow team viewing in future, restricted to user involved for now)
        const unsubTasks = db.collection('tasks')
            .where('assignedTo', 'array-contains', currentUser.id)
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkTask));
                
                data.sort((a, b) => {
                    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
                    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 9999999999999;
                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 9999999999999;
                    return dateA - dateB;
                });
                
                setTasks(data);
                setLoading(false);
            }, err => {
                console.error("Erro ao carregar tarefas:", err);
                setLoading(false);
            });

        // Fetch Team Members
        const unsubUsers = db.collection('users').onSnapshot(snap => {
            setTeamMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario)));
        });
            
        return () => { unsubTasks(); unsubUsers(); };
    }, [currentUser]);

    // Actions
    const handleQuickAdd = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!quickTitle.trim() || !currentUser) return;

        try {
            const newTask: Partial<WorkTask> = {
                title: quickTitle,
                status: 'PENDING',
                priority: 'MEDIUM',
                type: 'MANUAL',
                responsibility: 'B4YOU',
                userId: currentUser.id,
                assignedTo: [currentUser.id],
                dueDate: quickDate,
                createdAt: new Date().toISOString(),
                // Se tiver filtro de cliente ativo, vincula automaticamente
                leadId: selectedClientId || null,
                creatorName: selectedClientId ? uniqueClients.find(c => c.id === selectedClientId)?.name : currentUser.nome,
                creatorAvatar: currentUser.avatar
            };

            await db.collection('tasks').add(newTask);
            setQuickTitle('');
            addToast({ type: 'success', message: 'Tarefa adicionada!' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao criar tarefa.' });
        }
    };

    const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                status,
                updatedAt: fieldValue.serverTimestamp()
            });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar.' });
        }
    };

    const handleUpdateTitle = async (taskId: string, title: string) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                title,
                updatedAt: fieldValue.serverTimestamp()
            });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar título.' });
        }
    };

    const handleUpdateDate = async (taskId: string, date: string) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                dueDate: date,
                updatedAt: fieldValue.serverTimestamp()
            });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar data.' });
        }
    };

    const handleUpdateAssignee = async (taskId: string, userIds: string[]) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                assignedTo: userIds,
                updatedAt: fieldValue.serverTimestamp()
            });
            addToast({ type: 'success', message: 'Responsável atualizado.' });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar responsável.' });
        }
    };

    const handleUpdateTask = async (taskId: string, data: Partial<WorkTask>) => {
        try {
            await db.collection('tasks').doc(taskId).update({
                ...data,
                updatedAt: fieldValue.serverTimestamp()
            });
            if (selectedTask?.id === taskId) {
                setSelectedTask(prev => prev ? { ...prev, ...data } : null);
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao atualizar tarefa.' });
        }
    };

    const handleDelete = async (taskId: string) => {
        try {
            await db.collection('tasks').doc(taskId).delete();
            addToast({ type: 'success', message: 'Tarefa removida.' });
        } catch (error) {
            console.error("Erro delete:", error);
            addToast({ type: 'error', message: 'Erro ao remover.' });
        }
    };

    const handleOpenLead = (leadId: string) => {
        window.location.hash = `#/inbox?chatId=${leadId}`; 
    };

    const toggleGroup = (groupName: string) => {
        const newSet = new Set(collapsedGroups);
        if (newSet.has(groupName)) newSet.delete(groupName);
        else newSet.add(groupName);
        setCollapsedGroups(newSet);
    };

    // Extrair clientes únicos das tarefas existentes
    const uniqueClients = useMemo(() => {
        const clientsMap = new Map<string, ClientOption>();
        tasks.forEach(task => {
            if (task.leadId && task.creatorName) {
                // Filtra apenas se não for o próprio usuário (tarefas pessoais)
                // ou ajusta conforme a regra de negócio desejada
                clientsMap.set(task.leadId, { 
                    id: task.leadId, 
                    name: task.creatorName,
                    avatar: task.creatorAvatar 
                });
            }
        });
        return Array.from(clientsMap.values());
    }, [tasks]);

    // Filtering Logic
    const filteredTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        return tasks.filter(t => {
            // Filtro por Cliente
            if (selectedClientId && t.leadId !== selectedClientId) return false;

            const taskDate = t.dueDate ? new Date(t.dueDate) : null;
            if (taskDate) {
                const d = new Date(t.dueDate);
                taskDate.setTime(d.getTime() + d.getTimezoneOffset() * 60000);
                taskDate.setHours(0,0,0,0);
            }

            if (filter === 'COMPLETED') return t.status === 'COMPLETED';
            if (t.status === 'COMPLETED') return false; 

            if (filter === 'OVERDUE') {
                return taskDate && taskDate < today;
            }
            if (filter === 'TODAY') {
                return taskDate && taskDate.getTime() === today.getTime();
            }
            return true; // ALL
        });
    }, [tasks, filter, selectedClientId]);

    // Grouping Logic
    const groupedTasks = useMemo(() => {
        if (filter !== 'ALL') return { 'Lista': filteredTasks };

        const groups: Record<string, WorkTask[]> = {
            'Atrasadas': [],
            'Hoje': [],
            'Amanhã': [],
            'Em Breve': [],
            'Sem Data': []
        };

        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        filteredTasks.forEach(t => {
            if (!t.dueDate) {
                groups['Sem Data'].push(t);
                return;
            }
            // Parse manual para garantir consistência YYYY-MM-DD
            const [y, m, d] = t.dueDate.split('-').map(Number);
            const date = new Date(y, m-1, d);
            date.setHours(0,0,0,0);
            
            if (date < today) groups['Atrasadas'].push(t);
            else if (date.getTime() === today.getTime()) groups['Hoje'].push(t);
            else if (date.getTime() === tomorrow.getTime()) groups['Amanhã'].push(t);
            else groups['Em Breve'].push(t);
        });

        return groups;
    }, [filteredTasks, filter]);

    const counts = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        // Calcula contagens baseadas na seleção de cliente atual (se houver)
        const baseTasks = selectedClientId ? tasks.filter(t => t.leadId === selectedClientId || t.clientId === selectedClientId) : tasks;

        return {
            all: baseTasks.filter(t => t.status !== 'COMPLETED').length,
            today: baseTasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] === today.toISOString().split('T')[0]).length,
            overdue: baseTasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < today).length,
            completed: baseTasks.filter(t => t.status === 'COMPLETED').length
        };
    }, [tasks, selectedClientId]);

    const formatDateDisplay = (isoDate: string) => {
        if (!isoDate) return 'Sem Data';
        const [y, m, d] = isoDate.split('-').map(Number);
        const date = new Date(y, m-1, d);
        const today = new Date();
        
        if (date.toDateString() === today.toDateString()) return 'Hoje';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-in fade-in">
                <ListTodo size={48} className="mb-4 opacity-20" />
                <p>Organizando suas tarefas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 pb-24 font-sans h-full flex flex-col">
            
            {/* Header Area */}
            <div className="mb-8 space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Minhas Tarefas</h1>
                    <p className="text-gray-500 font-medium">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                
                {/* Control Bar (Moved Down & Integrated) */}
                <div className="flex flex-col-reverse md:flex-row gap-4 items-start md:items-center justify-between">
                    
                    {/* Primary Filter Group (Client + Status) */}
                    <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                        <ClientFilterDropdown 
                            clients={uniqueClients} 
                            selectedId={selectedClientId} 
                            onChange={setSelectedClientId} 
                        />
                        
                        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                        {/* Status Tabs (Pills) */}
                        <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide flex-1 md:flex-none">
                            {[
                                { id: 'ALL', label: 'Tudo', count: counts.all, icon: LayoutList },
                                { id: 'TODAY', label: 'Hoje', count: counts.today, icon: CalendarDays },
                                { id: 'OVERDUE', label: 'Atraso', count: counts.overdue, icon: AlertTriangle, alert: counts.overdue > 0 },
                                { id: 'COMPLETED', label: 'Feito', count: counts.completed, icon: CheckCircle2 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id as FilterType)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                                        ${filter === tab.id 
                                            ? 'bg-white text-gray-900 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                                        ${tab.alert ? 'text-red-600' : ''}
                                    `}
                                >
                                    <tab.icon size={14} strokeWidth={2.5} />
                                    {tab.label}
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${filter === tab.id ? 'bg-gray-100' : 'bg-white'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Add Bar */}
                <form onSubmit={handleQuickAdd} className="relative group z-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 focus-within:border-brand-300 focus-within:shadow-md transition-all">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                            <Plus size={20} />
                        </div>
                        <input 
                            type="text" 
                            placeholder={selectedClientId ? `Nova tarefa para ${uniqueClients.find(c => c.id === selectedClientId)?.name}...` : "Adicionar nova tarefa..."} 
                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 h-10"
                            value={quickTitle}
                            onChange={e => setQuickTitle(e.target.value)}
                        />
                        <div className="h-8 w-px bg-gray-100 mx-1"></div>
                        
                        {/* Custom Date Picker Trigger */}
                        <div className="relative" ref={datePickerRef}>
                            <button 
                                type="button"
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                            >
                                <Calendar size={14}/>
                                {formatDateDisplay(quickDate)}
                            </button>
                            {isDatePickerOpen && (
                                <CreationDatePopover 
                                    selectedDate={quickDate} 
                                    onChange={setQuickDate} 
                                    onClose={() => setIsDatePickerOpen(false)}
                                />
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={!quickTitle.trim()}
                            className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                        >
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </form>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
                {filter === 'ALL' ? (
                    Object.entries(groupedTasks).map(([groupName, groupItems]) => {
                        const tasks = groupItems as WorkTask[];
                        if (tasks.length === 0) return null;
                        
                        let groupColor = 'text-gray-500';
                        if (groupName === 'Atrasadas') groupColor = 'text-red-500';
                        if (groupName === 'Hoje') groupColor = 'text-emerald-600';
                        
                        const isCollapsed = collapsedGroups.has(groupName);

                        return (
                            <div key={groupName} className="animate-in slide-in-from-bottom-2 duration-500">
                                <div 
                                    onClick={() => toggleGroup(groupName)}
                                    className="flex items-center gap-2 mb-3 cursor-pointer group select-none hover:bg-gray-50 p-1.5 -ml-1.5 rounded-lg transition-colors"
                                >
                                    <div className={`p-1 rounded-md transition-colors ${(groupColor || '').replace('text-', 'bg-').replace('500', '100').replace('600', '100')}`}>
                                        {isCollapsed ? <ChevronRight size={14} className={groupColor}/> : <ChevronDown size={14} className={groupColor}/>}
                                    </div>
                                    <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${groupColor}`}>
                                        {groupName === 'Atrasadas' && <AlertTriangle size={12}/>}
                                        {groupName === 'Hoje' && <Calendar size={12}/>}
                                        {groupName}
                                    </h3>
                                    <span className="text-gray-400 text-[10px] font-medium bg-gray-100 px-1.5 py-0.5 rounded-md">
                                        {tasks.length}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-100 group-hover:bg-gray-200 transition-colors ml-2"></div>
                                </div>
                                
                                {!isCollapsed && (
                                    <div className="space-y-3 pl-2 border-l-2 border-gray-50 ml-2.5">
                                        {tasks.map(task => (
                                            <SmartTaskCard 
                                                key={task.id} 
                                                task={task} 
                                                onUpdateStatus={handleUpdateStatus} 
                                                onUpdateTitle={handleUpdateTitle}
                                                onUpdateDate={handleUpdateDate}
                                                onDelete={handleDelete}
                                                onOpenLead={handleOpenLead}
                                                onUpdateAssignee={handleUpdateAssignee}
                                                onOpenDetail={setSelectedTask}
                                                teamMembers={teamMembers}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        {filteredTasks.length > 0 ? filteredTasks.map(task => (
                            <SmartTaskCard 
                                key={task.id} 
                                task={task} 
                                onUpdateStatus={handleUpdateStatus} 
                                // @ts-ignore
                                onUpdateTitle={handleUpdateTitle}
                                onUpdateDate={handleUpdateDate}
                                onDelete={handleDelete}
                                onOpenLead={handleOpenLead}
                                onUpdateAssignee={handleUpdateAssignee}
                                onOpenDetail={setSelectedTask}
                                teamMembers={teamMembers}
                            />
                        )) : (
                            <div className="text-center py-20 opacity-50 flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    {filter === 'COMPLETED' ? <CheckSquare size={32}/> : <ListTodo size={32}/>}
                                </div>
                                <p className="text-sm font-bold text-gray-400">Nenhuma tarefa encontrada.</p>
                                {selectedClientId && <button onClick={() => setSelectedClientId(null)} className="mt-2 text-xs text-brand-600 font-bold hover:underline">Limpar Filtro de Cliente</button>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask}
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    teamMembers={teamMembers}
                    onUpdateTask={handleUpdateTask}
                />
            )}
        </div>
    );
};
