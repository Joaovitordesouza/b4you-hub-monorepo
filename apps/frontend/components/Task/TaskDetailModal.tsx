
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Send, MessageSquare, Info, History, 
    Smile, Paperclip, MoreVertical, Trash2, 
    User, Calendar, Flag, Tag, CheckCircle2,
    Loader2, AtSign, Clock, AlertCircle, Ban, Edit2
} from 'lucide-react';

import { WorkTask, TaskUpdate, Usuario, TaskStatus, TaskPriority, TaskType, TaskUpdateReply } from '../../types';
import { db, fieldValue } from '../../firebase';
import { Avatar } from '../Avatar';
import { useAuth } from '../../AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';

import { MentionsInput, Mention } from 'react-mentions';
import { DateTimePicker } from '../DateTimePicker';

const STATUS_CONFIG: Record<TaskStatus, { label: string, bg: string, text: string, icon: any }> = {
    'PENDING': { label: 'A Fazer', bg: 'bg-gray-200', text: 'text-gray-700', icon: () => <div className="w-2 h-2 rounded-full border-2 border-current" /> },
    'IN_PROGRESS': { label: 'Fazendo', bg: 'bg-blue-500', text: 'text-white', icon: Loader2 },
    'COMPLETED': { label: 'Feito', bg: 'bg-emerald-500', text: 'text-white', icon: CheckCircle2 },
    'WAITING': { label: 'Espera', bg: 'bg-amber-400', text: 'text-white', icon: Clock },
    'STUCK': { label: 'Travado', bg: 'bg-rose-500', text: 'text-white', icon: AlertCircle },
    'ARCHIVED': { label: 'Arquivado', bg: 'bg-gray-100', text: 'text-gray-400', icon: CheckCircle2 },
    'CANCELLED': { label: 'Cancelado', bg: 'bg-gray-300', text: 'text-gray-600', icon: Ban }
};

interface Props {
    task: WorkTask;
    isOpen: boolean;
    onClose: () => void;
    teamMembers: Usuario[];
    onUpdateTask: (taskId: string, data: Partial<WorkTask>) => Promise<void>;
}

export const TaskDetailModal: React.FC<Props> = ({ task, isOpen, onClose, teamMembers, onUpdateTask }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'updates' | 'info' | 'history'>('updates');
    const [updates, setUpdates] = useState<TaskUpdate[]>([]);
    const [newUpdate, setNewUpdate] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [loadingUpdates, setLoadingUpdates] = useState(true);
    const [showReactions, setShowReactions] = useState<Record<string, boolean>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const updatesEndRef = useRef<HTMLDivElement>(null);

    // Editing states
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [descInput, setDescInput] = useState(task.description || '');

    const statusOptions = [
        { value: 'PENDING', label: 'Pendente' },
        { value: 'IN_PROGRESS', label: 'Em Progresso' },
        { value: 'COMPLETED', label: 'Concluído' },
        { value: 'WAITING', label: 'Aguardando' },
        { value: 'STUCK', label: 'Travado' }
    ];

    useEffect(() => {
        if (!isOpen || !task.id) return;

        setLoadingUpdates(true);
        let hasError = false;
        const unsub = db.collection('tasks').doc(task.id).collection('updates')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskUpdate));
                setUpdates(data);
                setLoadingUpdates(false);
            }, err => {
                console.error("Erro ao carregar updates:", err);
                hasError = true;
                setLoadingUpdates(false);
            });

        return () => {
            if (!hasError) {
                try {
                    unsub();
                } catch (e) {
                    console.error("Erro ao desinscrever updates:", e);
                }
            }
        };
    }, [isOpen, task.id]);

    useEffect(() => {
        if (activeTab === 'updates') {
            updatesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [updates, activeTab]);

    const handleSendUpdate = async () => {
        if (!newUpdate.trim() || !currentUser || isSending) return;

        setIsSending(true);
        try {
            const updateData: Omit<TaskUpdate, 'id'> = {
                authorId: currentUser.id,
                authorName: currentUser.nome,
                authorAvatar: currentUser.avatar,
                content: newUpdate,
                createdAt: new Date().toISOString(),
                reactions: {}
            };

            await db.collection('tasks').doc(task.id).collection('updates').add(updateData);
            
            // Increment updates count on task
            await db.collection('tasks').doc(task.id).update({
                updatesCount: (task.updatesCount || 0) + 1,
                updatedAt: fieldValue.serverTimestamp()
            });

            setNewUpdate('');
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao enviar update.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteUpdate = async (updateId: string) => {
        if (!confirm('Excluir este update?')) return;
        try {
            await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).delete();
            await db.collection('tasks').doc(task.id).update({
                updatesCount: Math.max(0, (task.updatesCount || 1) - 1)
            });
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao excluir.' });
        }
    };

    const handleToggleReaction = async (updateId: string, emoji: string, replyId?: string) => {
        if (!currentUser) return;
        const update = updates.find(u => u.id === updateId);
        if (!update) return;

        let newReactions: Record<string, string[]>;
        
        if (replyId) {
            const reply = update.replies?.find(r => r.id === replyId);
            if (!reply) return;
            const reactions = reply.reactions || {};
            const userIds = reactions[emoji] || [];
            newReactions = { ...reactions };
            if (userIds.includes(currentUser.id)) {
                newReactions[emoji] = userIds.filter(id => id !== currentUser.id);
                if (newReactions[emoji].length === 0) delete newReactions[emoji];
            } else {
                newReactions[emoji] = [...userIds, currentUser.id];
            }
            
            const newReplies = update.replies?.map(r => r.id === replyId ? { ...r, reactions: newReactions } : r);
            try {
                await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).update({
                    replies: newReplies
                });
            } catch (error) {
                addToast({ type: 'error', message: 'Erro ao reagir.' });
            }
        } else {
            const reactions = update.reactions || {};
            const userIds = reactions[emoji] || [];
            newReactions = { ...reactions };
            if (userIds.includes(currentUser.id)) {
                newReactions[emoji] = userIds.filter(id => id !== currentUser.id);
                if (newReactions[emoji].length === 0) delete newReactions[emoji];
            } else {
                newReactions[emoji] = [...userIds, currentUser.id];
            }
            try {
                await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).update({
                    reactions: newReactions
                });
            } catch (error) {
                addToast({ type: 'error', message: 'Erro ao reagir.' });
            }
        }
    };

    const handleEditUpdate = async (updateId: string, newContent: string) => {
        if (!currentUser || !newContent.trim()) return;
        try {
            await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).update({
                content: newContent,
                isEdited: true,
                editedAt: new Date().toISOString()
            });
            setEditingId(null);
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao editar.' });
        }
    };

    const handleEditReply = async (updateId: string, replyId: string, newContent: string) => {
        if (!currentUser || !newContent.trim()) return;
        const update = updates.find(u => u.id === updateId);
        if (!update) return;
        
        const newReplies = update.replies?.map(r => r.id === replyId ? { ...r, content: newContent, isEdited: true, editedAt: new Date().toISOString() } : r);
        try {
            await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).update({
                replies: newReplies
            });
            setEditingReplyId(null);
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao editar.' });
        }
    };

    const handleSendReply = async (updateId: string) => {
        const content = replyText[updateId];
        if (!currentUser || !content || !content.trim()) return;
        
        const update = updates.find(u => u.id === updateId);
        if (!update) return;

        const newReply: TaskUpdateReply = {
            id: Math.random().toString(36).substr(2, 9),
            authorId: currentUser.id,
            authorName: currentUser.nome,
            authorAvatar: currentUser.avatar,
            content: content,
            createdAt: new Date().toISOString()
        };

        const replies = update.replies || [];
        
        try {
            await db.collection('tasks').doc(task.id).collection('updates').doc(updateId).update({
                replies: [...replies, newReply]
            });
            setReplyText(prev => ({ ...prev, [updateId]: '' }));
            setReplyingTo(null);
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao enviar resposta.' });
        }
    };

    const mentionData = teamMembers && teamMembers.length > 0 
        ? teamMembers.filter(u => u).map(u => ({
            id: String(u.id || 'unknown'),
            display: String(u.nome || 'Usuário sem nome')
        }))
        : [{ id: 'empty', display: 'Nenhum membro encontrado' }];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-[80vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white sticky top-0 z-10">
                        <div className="flex-1 min-w-0 pr-8">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    {task.type}
                                </div>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-slate-400">Criado em {task.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : 'Data desconhecida'}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight truncate">{task.title}</h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex px-6 border-b border-slate-100 gap-8">
                        {[
                            { id: 'updates', label: 'Updates', icon: MessageSquare, count: task.updatesCount },
                            { id: 'info', label: 'Detalhes', icon: Info },
                            { id: 'history', label: 'Histórico', icon: History }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 text-sm font-bold transition-all relative ${activeTab === tab.id ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                                )}
                                {activeTab === tab.id && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        
                        {/* Main Content (Left/Center) */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
                            {activeTab === 'updates' && (
                                <div className="space-y-6">
                                    {/* Update Input */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 focus-within:ring-2 focus-within:ring-brand-500/10 focus-within:border-brand-500 transition-all">
                                        <div className="mentions-wrapper">
                                            <MentionsInput
                                                value={newUpdate || ''}
                                                onChange={(e) => setNewUpdate(e.target.value || '')}
                                                placeholder="Escreva um update... Use @ para mencionar alguém"
                                                className="mentions-input w-full min-h-[100px] text-sm font-medium text-slate-700 outline-none resize-none bg-transparent"
                                                suggestionsPortalHost={document.body}
                                                allowSuggestionsAboveCursor={true}
                                            >
                                                <Mention
                                                    trigger="@"
                                                    data={mentionData}
                                                    displayTransform={(id, display) => `@${display}`}
                                                    markup="@__display__"
                                                    className="bg-brand-50 text-brand-700 font-bold px-1 rounded-md"
                                                    appendSpaceOnAdd
                                                    renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => (
                                                        <div className={`flex items-center gap-3 px-4 py-2 ${focused ? 'bg-slate-50' : ''}`}>
                                                            <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center text-[10px] font-black text-brand-600 uppercase">
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
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><Smile size={20}/></button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><Paperclip size={20}/></button>
                                            </div>
                                            <button 
                                                onClick={handleSendUpdate}
                                                disabled={!newUpdate.trim() || isSending}
                                                className="bg-brand-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-95"
                                            >
                                                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                Publicar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Updates Feed */}
                                    <div className="space-y-4">
                                        {loadingUpdates ? (
                                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                                        ) : updates.length === 0 ? (
                                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                                                <MessageSquare className="mx-auto text-slate-200 mb-3" size={40} />
                                                <p className="text-slate-400 text-sm font-medium">Nenhum update ainda. Comece a conversa!</p>
                                            </div>
                                        ) : (
                                            updates.map((update) => (
                                                <motion.div 
                                                    key={update.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar src={update.authorAvatar} name={update.authorName} alt="" className="w-10 h-10 rounded-xl" />
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900">{update.authorName}</h4>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                                    {update.createdAt ? new Date(update.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Data desconhecida'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {update.authorId === currentUser?.id && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button 
                                                                    onClick={() => { setEditingId(update.id); setEditContent(update.content); }}
                                                                    className="p-2 text-slate-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteUpdate(update.id)}
                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {editingId === update.id ? (
                                                        <div className="space-y-2 mb-3">
                                                            <textarea 
                                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setEditingId(null)} className="text-xs font-bold text-slate-500 px-3 py-1">Cancelar</button>
                                                                <button onClick={() => handleEditUpdate(update.id, editContent)} className="text-xs font-bold bg-brand-600 text-white px-3 py-1 rounded-lg">Salvar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap mb-3">
                                                            {update.content}
                                                            {update.isEdited && <span className="text-[10px] text-slate-400 ml-2">(editado)</span>}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-2 relative">
                                                            {Object.entries(update.reactions || {}).filter(([_, userIds]) => userIds.length > 0).map(([emoji, userIds]) => (
                                                                <button key={emoji} onClick={() => handleToggleReaction(update.id, emoji)} className="text-xs hover:scale-110 transition-transform bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                    {emoji} {userIds.length}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => setShowReactions(prev => ({ ...prev, [update.id]: !prev[update.id] }))} className="text-slate-400 hover:text-brand-500 p-1">
                                                                <Smile size={14} />
                                                            </button>
                                                            {showReactions[update.id] && (
                                                                <div className="absolute left-0 bottom-full mb-2 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-1 flex gap-1">
                                                                    {['👍', '❤️', '😂', '🔥'].map(emoji => (
                                                                        <button key={emoji} onClick={() => { handleToggleReaction(update.id, emoji); setShowReactions(prev => ({ ...prev, [update.id]: false })); }} className="text-sm hover:scale-110 transition-transform p-1 hover:bg-slate-50 rounded">
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setReplyingTo(update.id)} className="text-xs text-slate-400 hover:text-brand-500 font-bold">Responder</button>
                                                    </div>

                                                    {replyingTo === update.id && (
                                                        <div className="mt-3 bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                                                            <div className="mentions-wrapper">
                                                                <MentionsInput
                                                                    value={replyText[update.id] || ''}
                                                                    onChange={(e) => setReplyText(prev => ({ ...prev, [update.id]: e.target.value }))}
                                                                    placeholder="Escreva uma resposta..."
                                                                    className="mentions-input w-full text-sm font-medium text-slate-700 outline-none resize-none bg-transparent"
                                                                    suggestionsPortalHost={document.body}
                                                                    allowSuggestionsAboveCursor={true}
                                                                >
                                                                    <Mention
                                                                        trigger="@"
                                                                        data={mentionData}
                                                                        displayTransform={(id, display) => `@${display}`}
                                                                        markup="@__display__"
                                                                        className="bg-brand-50 text-brand-700 font-bold px-1 rounded-md"
                                                                        appendSpaceOnAdd
                                                                    />
                                                                </MentionsInput>
                                                            </div>
                                                            <div className="flex justify-end mt-2">
                                                                <button 
                                                                    onClick={() => handleSendReply(update.id)} 
                                                                    className="text-xs bg-brand-600 text-white px-4 py-1 rounded-lg font-bold hover:bg-brand-700"
                                                                >
                                                                    Enviar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {update.replies && update.replies.length > 0 && (
                                                        <div className="mt-3 space-y-2">
                                                            {update.replies.map(reply => (
                                                                <div key={reply.id} className="ml-8 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 group/reply">
                                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-slate-900">{reply.authorName}</span>
                                                                            <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </div>
                                                                        {reply.authorId === currentUser?.id && (
                                                                            <button 
                                                                                onClick={() => { setEditingReplyId(reply.id); setEditContent(reply.content); }}
                                                                                className="opacity-0 group-hover/reply:opacity-100 p-1 text-slate-300 hover:text-brand-500 transition-all"
                                                                            >
                                                                                <Edit2 size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {editingReplyId === reply.id ? (
                                                                        <div className="space-y-2 mt-1">
                                                                            <textarea 
                                                                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                                                                                value={editContent}
                                                                                onChange={e => setEditContent(e.target.value)}
                                                                            />
                                                                            <div className="flex justify-end gap-2">
                                                                                <button onClick={() => setEditingReplyId(null)} className="text-[10px] font-bold text-slate-500">Cancelar</button>
                                                                                <button onClick={() => handleEditReply(update.id, reply.id, editContent)} className="text-[10px] font-bold bg-brand-600 text-white px-2 py-1 rounded-lg">Salvar</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="whitespace-pre-wrap">
                                                                            {reply.content}
                                                                            {reply.isEdited && <span className="text-[10px] text-slate-400 ml-2">(editado)</span>}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-2 relative">
                                                                        {Object.entries(reply.reactions || {}).filter(([_, userIds]) => userIds.length > 0).map(([emoji, userIds]) => (
                                                                            <button key={emoji} onClick={() => handleToggleReaction(update.id, emoji, reply.id)} className="text-[10px] hover:scale-110 transition-transform bg-slate-100 px-1 py-0.5 rounded-md">
                                                                                {emoji} {userIds.length}
                                                                            </button>
                                                                        ))}
                                                                        <button onClick={() => setShowReactions(prev => ({ ...prev, [reply.id]: !prev[reply.id] }))} className="text-slate-400 hover:text-brand-500 p-0.5">
                                                                            <Smile size={12} />
                                                                        </button>
                                                                        {showReactions[reply.id] && (
                                                                            <div className="absolute left-0 bottom-full mb-2 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-1 flex gap-1">
                                                                                {['👍', '❤️', '😂', '🔥'].map(emoji => (
                                                                                    <button key={emoji} onClick={() => { handleToggleReaction(update.id, emoji, reply.id); setShowReactions(prev => ({ ...prev, [reply.id]: false })); }} className="text-sm hover:scale-110 transition-transform p-1 hover:bg-slate-50 rounded">
                                                                                        {emoji}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))
                                        )}
                                        <div ref={updatesEndRef} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Info size={14} /> Descrição da Tarefa
                                        </h3>
                                        {isEditingDesc ? (
                                            <div className="space-y-2">
                                                <textarea 
                                                    autoFocus
                                                    className="w-full p-4 bg-white border border-brand-300 rounded-2xl text-sm font-medium outline-none min-h-[150px]"
                                                    value={descInput}
                                                    onChange={e => setDescInput(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                                                    <button 
                                                        onClick={() => { onUpdateTask(task.id, { description: descInput }); setIsEditingDesc(false); }}
                                                        className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div 
                                                onClick={() => setIsEditingDesc(true)}
                                                className="p-4 bg-white border border-slate-100 rounded-2xl text-sm text-slate-600 font-medium cursor-pointer hover:border-brand-200 transition-all min-h-[100px]"
                                            >
                                                {task.description || "Nenhuma descrição adicionada. Clique para editar."}
                                            </div>
                                        )}
                                    </section>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Responsável</span>
                                            <div className="flex items-center gap-3">
                                                <Avatar src={task.creatorAvatar || ''} name={task.creatorName || ''} alt="" className="w-8 h-8 rounded-lg" />
                                                <span className="text-sm font-bold text-slate-700">{task.creatorName || 'Não atribuído'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Prioridade</span>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                task.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                                                task.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                <Flag size={12} /> {task.priority}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="text-center py-20">
                                    <History className="mx-auto text-slate-200 mb-3" size={48} />
                                    <p className="text-slate-400 text-sm font-medium">O histórico de auditoria será exibido aqui.</p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar (Right) */}
                        <div className="w-full md:w-72 border-l border-slate-100 p-6 space-y-8 bg-white">
                            <div>
                                <Select
                                    label="Status"
                                    options={statusOptions}
                                    value={task.status}
                                    onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                                    renderOption={(option) => {
                                        const config = STATUS_CONFIG[option.value as TaskStatus];
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${config.bg}`} />
                                                {option.label}
                                            </div>
                                        );
                                    }}
                                />
                            </div>

                            <div>
                                <DatePicker
                                    label="Prazo"
                                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                                />
                            </div>

                            {task.leadId && (
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cliente Vinculado</h3>
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                                        <Avatar src={task.creatorAvatar || ''} name={task.creatorName || ''} alt="" className="w-10 h-10 rounded-xl" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-900 truncate">{task.creatorName}</p>
                                            <p className="text-[10px] font-bold text-blue-600">Ver Perfil</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
