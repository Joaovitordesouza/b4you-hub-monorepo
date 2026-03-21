
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Save, Clock, CheckCircle2, 
    AlertCircle, PauseCircle, Loader2, Link2, 
    StickyNote, Activity, History, DownloadCloud, 
    FileText, ArrowUpRight, DollarSign, Send, 
    MessageSquare, Briefcase, Calendar, Shield, MoreHorizontal,
    ArrowRight, CheckSquare, Plus, Paperclip, ChevronRight, Check
} from 'lucide-react';
import { db, auth, fieldValue } from '../firebase';
import { Producer, Usuario, WorkTask, TimelineEvent } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useMedia } from '../hooks/useMedia';
import { Avatar } from './Avatar';

// --- CONFIGURAÇÕES VISUAIS ---

const TASK_STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string, icon: any }> = {
    'PENDING': { label: 'Pendente', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: Clock },
    'IN_PROGRESS': { label: 'Em Andamento', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Loader2 },
    'COMPLETED': { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
    'WAITING': { label: 'Aguardando', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: PauseCircle },
    'STUCK': { label: 'Travado', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle }
};

interface Client360ModalProps {
    producer: Producer;
    teamMembers: Usuario[];
    onClose: () => void;
}

export const Client360Modal: React.FC<Client360ModalProps> = ({ producer, teamMembers, onClose }) => {
    const { addToast } = useToast();
    const { uploadFile, isUploading } = useMedia();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const noteInputRef = useRef<HTMLTextAreaElement>(null);

    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'TASKS' | 'FILES'>('TIMELINE');
    const [noteInput, setNoteInput] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    
    // Dados
    const [tasks, setTasks] = useState<WorkTask[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [files, setFiles] = useState<any[]>([]);

    useEffect(() => {
        if (!producer.id) return;
        const ids = [producer.id, producer.leadId].filter(Boolean);

        // Tarefas
        const unsubTasks = db.collection('tasks')
            .where('leadId', 'in', ids)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setTasks(snap.docs.map(d => ({id: d.id, ...d.data()} as WorkTask)));
            });

        // Timeline
        const unsubTimeline = db.collection('producers').doc(producer.id).collection('timeline')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => setTimeline(snap.docs.map(d => ({id: d.id, ...d.data()} as TimelineEvent))));

        // Arquivos
        const unsubFiles = db.collection('producers').doc(producer.id).collection('files')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setFiles(snap.docs.map(d => ({id: d.id, ...d.data()} as any))));

        return () => { unsubTasks(); unsubTimeline(); unsubFiles(); };
    }, [producer.id]);

    const handleAddNote = async () => {
        if (!noteInput.trim()) return;
        setIsSavingNote(true);
        try {
            await db.collection('producers').doc(producer.id).collection('timeline').add({
                type: 'NOTE',
                content: noteInput,
                authorName: auth.currentUser?.displayName || 'Admin',
                authorId: auth.currentUser?.uid,
                timestamp: Date.now(),
                isInternal: true,
                category: 'NOTE'
            });
            setNoteInput('');
            addToast({ type: 'success', message: 'Nota interna salva.' });
        } catch (e) { 
            console.error(e);
            addToast({ type: 'error', message: 'Erro ao salvar nota.' });
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        try {
            const url = await uploadFile(file, `producers/${producer.id}/${Date.now()}_${file.name}`);
            await db.collection('producers').doc(producer.id).collection('files').add({
                name: file.name, url, type: file.type, size: (file.size/1024/1024).toFixed(2)+'MB',
                createdAt: new Date().toISOString(), authorName: auth.currentUser?.displayName
            });
            addToast({ type: 'success', message: 'Arquivo enviado.' });
        } catch (error) { addToast({ type: 'error', message: 'Erro no upload.' }); }
    };

    const formatDate = (date: string | number) => {
        if(!date) return '-';
        const d = new Date(date);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', {day:'2-digit', month:'short', hour: '2-digit', minute: '2-digit'});
    };

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
        if (score >= 50) return 'text-amber-500 bg-amber-50 border-amber-200';
        return 'text-rose-500 bg-rose-50 border-rose-200';
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#09090b]/40 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
            <div className="bg-[#FFFFFF] rounded-[24px] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-white/40 relative animate-in zoom-in-95 duration-300 ring-1 ring-black/5">
                
                {/* --- HEADER CLEAN --- */}
                <div className="flex-shrink-0 bg-white border-b border-gray-100 relative z-20">
                    <div className="absolute top-4 right-4">
                        <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200">
                            <X size={18}/>
                        </button>
                    </div>

                    <div className="px-8 pt-8 pb-0">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                            <div className="flex items-center gap-6">
                                <Avatar src={producer.foto_url} name={producer.nome_display} alt="" className="w-20 h-20 rounded-[1.25rem] border border-gray-100 shadow-sm object-cover" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                                            {producer.stage}
                                        </span>
                                        {producer.plataforma_origem && (
                                            <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-gray-200">
                                                {producer.plataforma_origem}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1">{producer.nome_display}</h2>
                                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                                        <Briefcase size={14} className="text-gray-400"/> {producer.produto_principal}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col min-w-[120px]">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">MRR Atual</span>
                                    <span className="text-lg font-bold text-gray-900">R$ {(producer.stats_financeiros?.faturamento_mes || 0).toLocaleString('pt-BR', { notation: 'compact' })}</span>
                                </div>
                                <div className={`px-5 py-3 rounded-2xl border flex flex-col min-w-[120px] ${getHealthColor(producer.stats_financeiros?.health_score || 0)}`}>
                                    <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-0.5">Saúde</span>
                                    <span className="text-lg font-bold">{producer.stats_financeiros?.health_score || 0}/100</span>
                                </div>
                                <button 
                                    onClick={() => window.location.hash = `#/inbox?chatId=${producer.whatsapp_contato?.replace(/\D/g,'')}@s.whatsapp.net`}
                                    className="px-5 py-3 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition-all flex flex-col items-center justify-center min-w-[80px] shadow-lg shadow-gray-200"
                                >
                                    <MessageSquare size={18} className="mb-1"/>
                                    Chat
                                </button>
                            </div>
                        </div>

                        {/* TABS - Apple Style */}
                        <div className="flex gap-8">
                            {[
                                {id:'TIMELINE', label:'Timeline', icon:History}, 
                                {id:'TASKS', label:'Tarefas', icon:CheckCircle2}, 
                                {id:'FILES', label:'Arquivos', icon:FileText}
                            ].map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => setActiveTab(t.id as any)} 
                                    className={`pb-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${activeTab === t.id ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {t.label}
                                    {activeTab === t.id && <div className="w-1.5 h-1.5 rounded-full bg-black ml-1"></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8 custom-scrollbar">
                    
                    {/* TIMELINE TAB */}
                    {activeTab === 'TIMELINE' && (
                        <div className="max-w-3xl mx-auto pb-10">
                            {/* Input Note - Card Flutuante */}
                            <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] mb-10 transition-all focus-within:shadow-md focus-within:border-gray-300">
                                <div className="relative">
                                    <textarea 
                                        ref={noteInputRef} 
                                        value={noteInput} 
                                        onChange={e => setNoteInput(e.target.value)} 
                                        className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none resize-none min-h-[60px] p-4 pr-12" 
                                        placeholder="Adicionar nota interna..." 
                                    />
                                    <div className="absolute bottom-2 right-2">
                                        <button 
                                            onClick={handleAddNote} 
                                            disabled={!noteInput.trim() || isSavingNote}
                                            className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                        >
                                            {isSavingNote ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16}/>}
                                        </button>
                                    </div>
                                </div>
                                <div className="px-4 pb-2 flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Shield size={10} className="text-amber-500"/> Visível apenas para equipe</span>
                                </div>
                            </div>

                            {/* Feed Timeline - Linha Contínua */}
                            <div className="relative space-y-8 pl-4">
                                {/* Linha Vertical */}
                                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-200"></div>
                                
                                {timeline.map((event, idx) => {
                                    const isNote = event.type === 'NOTE';
                                    const isSystem = event.category === 'SYSTEM';
                                    
                                    return (
                                        <div key={idx} className="relative pl-10 group animate-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 30}ms` }}>
                                            {/* Nó da Timeline */}
                                            <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border-4 border-[#F9FAFB] flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm
                                                ${isNote ? 'bg-amber-100 text-amber-600' : 'bg-white text-gray-400 border-gray-200'}
                                            `}>
                                                {isNote ? <StickyNote size={12} fill="currentColor"/> : <div className="w-2 h-2 rounded-full bg-gray-300"></div>}
                                            </div>
                                            
                                            {/* Conteúdo */}
                                            {isNote ? (
                                                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar name={event.authorName || 'User'} src="" alt="" className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-[8px]"/>
                                                            <span className="text-xs font-bold text-gray-900">{event.authorName}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(event.timestamp)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">{event.content}</p>
                                                </div>
                                            ) : (
                                                <div className="pt-1.5 pb-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-gray-900">Sistema</span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                        <span className="text-[10px] text-gray-400">{formatDate(event.timestamp)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium">{event.content}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                
                                {timeline.length === 0 && (
                                    <div className="text-center py-10 opacity-40">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <History size={20} className="text-gray-400"/>
                                        </div>
                                        <p className="text-xs font-medium text-gray-500">Histórico vazio.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TASKS TAB */}
                    {activeTab === 'TASKS' && (
                        <div className="max-w-4xl mx-auto space-y-4">
                            {tasks.length > 0 ? (
                                tasks.map(task => {
                                    const status = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG['PENDING'];
                                    return (
                                        <div key={task.id} className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] transition-all cursor-default">
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <div>
                                                    <h4 className={`text-sm font-bold text-gray-900 ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                                                        {task.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-100`}>
                                                            {status.label}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                            <Clock size={10}/> {formatDate(task.dueDate)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => window.location.hash = `#/my-work`} className="p-2 text-gray-300 hover:text-black hover:bg-gray-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <ArrowRight size={16}/>
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-3xl">
                                    <CheckSquare size={32} className="mb-3 opacity-30"/>
                                    <p className="text-sm font-medium">Nenhuma tarefa pendente.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'FILES' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className="group border border-dashed border-gray-300 rounded-3xl p-10 flex flex-col items-center justify-center hover:bg-gray-50 transition-all cursor-pointer bg-white"
                            >
                                <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm group-hover:bg-white group-hover:shadow-md">
                                    {isUploading ? <Loader2 size={24} className="animate-spin"/> : <Plus size={24}/>}
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Adicionar Arquivo</h4>
                                <p className="text-xs text-gray-500">Arraste ou clique para upload</p>
                                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {files.map(file => (
                                    <a key={file.id} href={file.url} target="_blank" className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-sm transition-all group">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <FileText size={20} strokeWidth={1.5}/>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 truncate mb-0.5">{file.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-medium">
                                                {file.size} • {new Date(file.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="p-2 text-gray-300 group-hover:text-gray-600">
                                            <ArrowUpRight size={16}/>
                                        </div>
                                    </a>
                                ))}
                            </div>
                            
                            {files.length === 0 && (
                                <p className="text-center text-xs text-gray-400 italic">Nenhum arquivo.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
