
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { 
  Send, Smile, Mic, Search, Check, CheckCheck, Clock, 
  ChevronLeft, Info, X, Trash2, Camera, User, Plus, Reply, 
  ArrowDown, Edit2, Copy, Image as ImageIcon, Ban, File as FileIcon, MapPin, Music, Paperclip, AlertCircle, RefreshCw, Loader2, ChevronDown, PlayCircle, StickyNote,
  Download, FileText, ExternalLink, AlertTriangle, Users, Bell, Calendar as CalendarIcon, Sun, Moon, Sunrise, CalendarDays, Timer, ChevronRight, Share2
} from 'lucide-react';
import { TimelineEvent, EvolutionChat, InstanceStatus } from '../../types';
import { Avatar } from '../Avatar';
import { useMedia } from '../../hooks/useMedia';
import { useToast } from '../../contexts/ToastContext';
import { db, auth, fieldValue } from '../../firebase';
import { MessageBubble } from './MessageBubble';

// --- Componentes Auxiliares ---

// Sub-componente: Lightbox de Imagem (Elite UI)
const ImageLightbox = ({ src, onClose }: { src: string, onClose: () => void }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50">
                <X size={24} />
            </button>
            <div className="relative flex flex-col items-center justify-center max-w-full max-h-full">
                <img 
                    src={src} 
                    alt="Full view" 
                    className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 select-none" 
                    onClick={(e) => e.stopPropagation()} 
                />
                <div className="mt-6 flex gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                    <a href={src} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all font-medium text-sm border border-white/10 hover:-translate-y-0.5">
                        <Download size={18} /> Baixar Original
                    </a>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Modal de Histórico de Edição
const EditHistoryModal = ({ message, onClose }: { message: TimelineEvent, onClose: () => void }) => {
    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Edit2 size={16} className="text-brand-500" />
                        Histórico de Edições
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {/* Versão Atual */}
                    <div className="relative">
                        <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-gray-200" />
                        <div className="flex gap-3 relative z-10">
                            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 border-2 border-white ring-1 ring-gray-100">
                                <span className="w-2.5 h-2.5 bg-brand-500 rounded-full" />
                            </div>
                            <div className="flex-1 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                                <span className="text-[10px] font-bold text-brand-600 uppercase mb-1 block">Versão Atual</span>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    </div>

                    {/* Versões Antigas */}
                    {message.oldMessages?.map((old, idx) => {
                        const isLast = idx === (message.oldMessages?.length || 0) - 1;
                        return (
                            <div key={idx} className="relative">
                                {!isLast && <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-gray-200" />}
                                <div className="flex gap-3 relative z-10">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white ring-1 ring-gray-100">
                                        <Clock size={12} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm opacity-80">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Versão Anterior</span>
                                            <span className="text-[10px] text-gray-400">
                                                {old.editedAt ? new Date(old.editedAt?.seconds ? old.editedAt.seconds * 1000 : old.editedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Data desconhecida'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-through whitespace-pre-wrap">{old.text}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    }).reverse() /* Mostra a mais recente edição primeiro */} 
                </div>
            </div>
        </div>,
        document.body
    );
};

// TimePicker estilo iOS (Wheel Scroll)
const IOSStyleTimePicker = ({ value, onChange }: { value: { h: string, m: string }, onChange: (field: 'h' | 'm', val: string) => void }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const hRef = useRef<HTMLDivElement>(null);
    const mRef = useRef<HTMLDivElement>(null);

    // Auto-scroll inicial para o valor selecionado
    useLayoutEffect(() => {
        if (hRef.current) {
            const el = hRef.current.querySelector(`[data-value="${value.h}"]`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
        if (mRef.current) {
            const el = mRef.current.querySelector(`[data-value="${value.m}"]`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
    }, []); // Run once on mount

    // Estilo para esconder scrollbar
    const scrollStyle = { 
        msOverflowStyle: 'none' as const, 
        scrollbarWidth: 'none' as const 
    };

    return (
        <div className="relative h-48 flex justify-center gap-4 select-none bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden shadow-inner">
            {/* Center Highlight Bar (Lens) */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-12 bg-white rounded-xl shadow-sm border border-brand-100 pointer-events-none z-0 opacity-80"></div>

            {/* Hours Column */}
            <div 
                ref={hRef} 
                className="w-20 h-full overflow-y-auto snap-y snap-mandatory py-[72px] text-center z-10 no-scrollbar"
                style={{ ...scrollStyle, scrollBehavior: 'smooth' }}
            >
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                {hours.map(h => (
                    <div 
                        key={h} 
                        data-value={h}
                        onClick={() => onChange('h', h)}
                        className={`h-12 flex items-center justify-center snap-center cursor-pointer transition-all duration-200 font-bold ${value.h === h ? 'text-3xl text-brand-600 scale-110' : 'text-lg text-gray-300 hover:text-gray-400 scale-90'}`}
                    >
                        {h}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-center pt-1 z-10 text-gray-300 font-black text-xl pb-1">:</div>

            {/* Minutes Column */}
            <div 
                ref={mRef} 
                className="w-20 h-full overflow-y-auto snap-y snap-mandatory py-[72px] text-center z-10 no-scrollbar"
                style={{ ...scrollStyle, scrollBehavior: 'smooth' }}
            >
                {minutes.map(m => (
                    <div 
                        key={m} 
                        data-value={m}
                        onClick={() => onChange('m', m)}
                        className={`h-12 flex items-center justify-center snap-center cursor-pointer transition-all duration-200 font-bold ${value.m === m ? 'text-3xl text-brand-600 scale-110' : 'text-lg text-gray-300 hover:text-gray-400 scale-90'}`}
                    >
                        {m}
                    </div>
                ))}
            </div>
            
            {/* Gradients Overlay for Depth */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/90 to-transparent pointer-events-none z-20"></div>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-20"></div>
        </div>
    );
};

// Sub-componente: Calendário Customizado (Elite UI)
const CustomCalendar = ({ selectedDate, onChange, onClose }: { selectedDate: string, onChange: (date: string) => void, onClose: () => void }) => {
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    const handleDateClick = (day: number) => {
        const m = month + 1;
        const d = day;
        const isoDate = `${year}-${m < 10 ? '0'+m : m}-${d < 10 ? '0'+d : d}`;
        onChange(isoDate);
        onClose();
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    return (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 z-50 w-[300px] animate-in fade-in zoom-in-95 origin-top ring-1 ring-black/5">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-100 transform rotate-45"></div>
            <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={18}/></button>
                <span className="text-sm font-black text-gray-800 capitalize tracking-wide">{monthNames[month]} <span className="text-gray-400 font-medium">{year}</span></span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={18}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((d, i) => <div key={i} className="text-[10px] font-bold text-gray-300 text-center uppercase py-1">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const currentIso = `${year}-${month + 1 < 10 ? '0'+(month+1) : month+1}-${day < 10 ? '0'+day : day}`;
                    const isSelected = selectedDate === currentIso;
                    const isToday = new Date().toISOString().split('T')[0] === currentIso;
                    return (
                        <button key={day} onClick={() => handleDateClick(day)} className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all relative ${isSelected ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-110 z-10' : isToday ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'text-gray-600 hover:bg-gray-100'}`}>{day}{isToday && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-brand-500 rounded-full"></div>}</button>
                    );
                })}
            </div>
        </div>
    );
};

// Modal Rápido de Lembrete
const QuickReminderModal = ({ message, chat, onClose, onSave }: { message: TimelineEvent, chat: EvolutionChat, onClose: () => void, onSave: () => void }) => {
    const getInitialTime = () => {
        const d = new Date(); d.setHours(d.getHours() + 1); d.setMinutes(0);
        return { h: d.getHours().toString().padStart(2, '0'), m: d.getMinutes().toString().padStart(2, '0') };
    };
    const getInitialDate = () => new Date().toISOString().split('T')[0];

    const [selectedDate, setSelectedDate] = useState(getInitialDate());
    const [time, setTime] = useState(getInitialTime());
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const { addToast } = useToast();

    const getFriendlyDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const userDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        if (userDate.toDateString() === today.toDateString()) return 'Hoje';
        if (userDate.toDateString() === tomorrow.toDateString()) return 'Amanhã';
        return userDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    };

    const handleTimeChange = (field: 'h' | 'm', val: string) => {
        setTime(prev => ({ ...prev, [field]: val }));
    };

    const applyPreset = (type: '1h' | '3h' | 'tomorrow_9' | 'monday_9') => {
        const now = new Date();
        let target = new Date();
        if (type === '1h') { target.setHours(now.getHours() + 1); target.setMinutes(0); }
        else if (type === '3h') { target.setHours(now.getHours() + 3); target.setMinutes(0); }
        else if (type === 'tomorrow_9') { target.setDate(target.getDate() + 1); target.setHours(9, 0, 0, 0); }
        else if (type === 'monday_9') { target.setDate(target.getDate() + (1 + 7 - target.getDay()) % 7); if (target <= now) target.setDate(target.getDate() + 7); target.setHours(9, 0, 0, 0); }
        setSelectedDate(target.toISOString().split('T')[0]);
        setTime({ h: target.getHours().toString().padStart(2, '0'), m: target.getMinutes().toString().padStart(2, '0') });
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            const dueDate = new Date(`${selectedDate}T${time.h}:${time.m}:00`);
            if (dueDate.getTime() <= Date.now()) { addToast({ type: 'error', message: 'Defina um horário no futuro.' }); setIsSaving(false); return; }
            const originalText = message.content ? (message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content) : `Mídia (${message.metadata?.mediaType || 'Arquivo'})`;
            await db.collection('tasks').add({
                title: `Lembrar: ${chat.pushName || 'Contato'}`,
                description: `Mensagem Original: "${originalText}"\nNota: ${note}`,
                dueDate: dueDate.toISOString(),
                priority: 'HIGH',
                status: 'PENDING',
                type: 'REMINDER',
                leadId: chat.leadId,
                userId: auth.currentUser?.uid,
                assignedTo: [auth.currentUser?.uid],
                creatorName: chat.leadName || chat.pushName,
                creatorAvatar: chat.profilePicUrl,
                createdAt: fieldValue.serverTimestamp(),
                updatedAt: fieldValue.serverTimestamp(),
                metadata: { source: 'CHAT', messageId: message.id, originalText: message.content }
            });
            addToast({ type: 'success', message: 'Lembrete definido com sucesso!' });
            onSave();
        } catch (error) { console.error(error); addToast({ type: 'error', message: 'Erro ao criar lembrete.' }); } finally { setIsSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#09090b]/60 backdrop-blur-md animate-in fade-in duration-300 font-sans">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-visible animate-in zoom-in-95 slide-in-from-bottom-8 border border-white/40 ring-1 ring-white/20 relative">
                <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors z-20"><X size={20} /></button>
                <div className="p-8 flex flex-col items-center">
                    <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(22,163,74,0.15)] ring-4 ring-brand-50/50"><Bell size={24} className="fill-brand-100" /></div>
                    <h2 className="text-xl font-black text-gray-900 mb-1">Novo Lembrete</h2>
                    <p className="text-xs font-medium text-gray-400 mb-6 text-center max-w-[200px]">Defina data e hora para ser notificado.</p>
                    
                    {/* --- THE CLOCK UI (Wheel) --- */}
                    <IOSStyleTimePicker value={time} onChange={handleTimeChange} />

                    <div className="flex justify-center mb-6 mt-6 relative w-full">
                        <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border shadow-sm text-sm font-bold transition-all ${isCalendarOpen ? 'bg-gray-900 text-white border-gray-900 ring-4 ring-gray-100' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-md'}`}>
                            <CalendarDays size={16} className={isCalendarOpen ? 'text-brand-400' : 'text-brand-500'} />
                            {getFriendlyDate(selectedDate)}
                        </button>
                        {isCalendarOpen && <CustomCalendar selectedDate={selectedDate} onChange={setSelectedDate} onClose={() => setIsCalendarOpen(false)} />}
                    </div>

                    <div className="flex justify-between gap-2 w-full mb-6">
                        <button onClick={() => applyPreset('1h')} className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-bold text-gray-500 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all shadow-sm active:scale-95">+1h</button>
                        <button onClick={() => applyPreset('3h')} className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-bold text-gray-500 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all shadow-sm active:scale-95">+3h</button>
                        <button onClick={() => applyPreset('tomorrow_9')} className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-bold text-gray-500 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all shadow-sm active:scale-95">Manhã</button>
                    </div>

                    <div className="w-full relative group mb-6">
                        <div className="absolute top-3 left-3 text-gray-400"><StickyNote size={16} /></div>
                        <textarea className="w-full bg-white border border-gray-200 rounded-2xl p-3 pl-10 text-sm font-medium text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none h-16 shadow-sm" placeholder="Nota rápida (opcional)..." value={note} onChange={e => setNote(e.target.value)} />
                    </div>

                    <button onClick={handleConfirm} disabled={isSaving} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group">
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} className="group-hover:scale-110 transition-transform" />}
                        {isSaving ? 'Agendando...' : 'Confirmar Agendamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttachmentOption = ({ icon: Icon, label, gradient, onClick, delay }: { icon: any, label: string, gradient: string, onClick: () => void, delay: string }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center gap-2 group animate-in zoom-in-50 slide-in-from-bottom-4 duration-500 fill-mode-backwards"
        style={{ animationDelay: delay }}
    >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gray-200/50 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-xl group-hover:-translate-y-1 bg-gradient-to-br ${gradient}`}>
            <Icon size={24} strokeWidth={2} className="drop-shadow-sm" />
        </div>
        <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors bg-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm border border-gray-100">
            {label}
        </span>
    </button>
);


const CuratedEmojiPicker = ({ onSelect }: { onSelect: (emoji: string) => void }) => {
    const emojis = [
        "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", 
        "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "🤓", 
        "😒", "😞", "😔", "ww", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", 
        "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "t", "😥", "sweat", "🤗", "🤔", "🤭", 
        "🤫", "🤥", "😶", "neutral_face", "expressionless", "grimacing", "rolling_eyes", "hushed", "frowning", "anguished", "open_mouth", "astonished", "yawning", "sleeping", "drooling_face", "sleepy", "dizzy_face", 
        "🤐", "🥴", "🤢", "🤮", "sneezing_face", "mask", "thermometer_face", "head_bandage", "money_mouth_face", "cowboy_hat_face", "smiling_imp", "imp", "japanese_ogre", "japanese_goblin", "clown_face", 
        "poop", "ghost", "skull", "skull_and_crossbones", "alien", "space_invader", "robot", "jack_o_lantern", "👍", "👎", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤏", "👈", "👉", "👇", "👇", "☝️", "✋", "🤚", "🖐", "🖖", "👋", "🤙", "💪", "🖕", "✍️", "🙏", "🦶", "🦵", "👂", "👃", "🧠", "🦷", "🦴", "👀", "👁", "👅", "👄", "💋"
    ];

    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-4 w-[340px] h-[320px] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-2 origin-bottom-left ring-1 ring-black/5">
            <div className="mb-3 px-1">
                <div className="flex items-center gap-2 bg-[#F0F2F5] p-2.5 rounded-xl border border-transparent focus-within:bg-white focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                    <Search size={16} className="text-gray-400"/>
                    <input type="text" placeholder="Buscar emoji..." className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400 font-medium"/>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                <div className="grid grid-cols-7 gap-1">
                    {emojis.map((emoji, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => onSelect(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 hover:scale-110 rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface ChatFeedProps {
  chat: EvolutionChat | null;
  messages: TimelineEvent[];
  instanceStatus?: InstanceStatus;
  initialText?: string;
  onSendMessage: (text: string, type?: 'text' | 'audio' | 'image' | 'video' | 'document', mediaUrl?: string, quotedMsg?: { id: string, author: string, content: string }, mediaOptions?: { fileName?: string, mimetype?: string }) => void;
  onEditMessage?: (msgId: string, newText: string) => void;
  onDeleteMessage?: (msgId: string, forEveryone: boolean) => void;
  onRetryMessage?: (msgId: string) => void;
  onReactMessage?: (msgId: string, emoji: string) => void;
  onForwardMessage?: (message: TimelineEvent) => void;
  isLoading: boolean;
  onBack?: () => void; 
  onToggleInfo?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ 
    chat, 
    messages,
    instanceStatus = 'open',
    initialText = '', 
    onSendMessage, 
    onEditMessage,
    onDeleteMessage,
    onRetryMessage,
    onReactMessage,
    onForwardMessage,
    onBack, 
    onToggleInfo,
    onLoadMore,
    hasMore = false,
    loadingMore = false
}) => {
  const { addToast } = useToast();
  const { uploadFile, isUploading } = useMedia();
  const [inputValue, setInputValue] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File, url: string, type: 'image' | 'video' | 'document' | 'audio' } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string, isMe: boolean, text: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<TimelineEvent | null>(null);
  const [replyingTo, setReplyingTo] = useState<TimelineEvent | null>(null); // State para Reply
  const [reminderModalMsg, setReminderModalMsg] = useState<TimelineEvent | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [historyModalMsg, setHistoryModalMsg] = useState<TimelineEvent | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  const previousScrollHeightRef = useRef<number>(0);
  const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: 300 }); // Setup auto-animate

  useEffect(() => {
      if (initialText) {
          setInputValue(initialText);
          setTimeout(() => inputRef.current?.focus(), 100);
      }
  }, [initialText]);

  // Função para Scrollar até a mensagem respondida com highlight
  const scrollToMessage = (msgId: string) => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Efeito visual de flash para destacar a mensagem
          const originalTransition = el.style.transition;
          el.style.transition = 'background-color 0.5s ease';
          el.style.backgroundColor = '#dbeafe'; // bg-blue-100
          setTimeout(() => {
              el.style.backgroundColor = '';
              setTimeout(() => {
                  el.style.transition = originalTransition;
              }, 500);
          }, 1000);
      } else {
          // Se a mensagem não estiver carregada (ex: paginação), avisa
          addToast({ type: 'info', message: 'Mensagem original não carregada.' });
      }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (!editingMessage && !loadingMore && messages.length > 0) {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 500;
        
        const lastMsg = messages[messages.length - 1];
        const isLastMsgMine = lastMsg ? (lastMsg.authorId === 'ME' || lastMsg.authorId === auth.currentUser?.uid) : false;

        if (previousScrollHeightRef.current === 0 && (isNearBottom || isLastMsgMine)) {
             scrollToBottom();
        }
    }
  }, [messages, chat, previewFile, loadingMore]); 

  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore) {
                if (scrollContainerRef.current) {
                    previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
                }
                if (onLoadMore) onLoadMore();
            }
        },
        { threshold: 0.5 }
    );
    
    if (topSentinelRef.current) {
        observer.observe(topSentinelRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  useLayoutEffect(() => {
    if (!loadingMore && previousScrollHeightRef.current > 0 && scrollContainerRef.current) {
        const newScrollHeight = scrollContainerRef.current.scrollHeight;
        const diff = newScrollHeight - previousScrollHeightRef.current;
        
        if (diff > 0) {
            scrollContainerRef.current.scrollTop = diff;
        }
        previousScrollHeightRef.current = 0;
    }
  }, [messages, loadingMore]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
              setShowAttachments(false);
          }
          if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
              setShowEmojiPicker(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cancelPreview = () => {
      setPreviewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
      try {
          if (!window.isSecureContext && window.location.hostname !== 'localhost') {
             throw new Error("Gravação de áudio requer contexto seguro (HTTPS).");
          }

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingTime(0);
      } catch (error: any) {
          console.error("Error starting recording:", error);
          let msg = 'Não foi possível acessar o microfone.';
          if (error.name === 'NotAllowedError') msg = 'Permissão do microfone negada. Verifique as configurações do navegador.';
          if (error.name === 'NotFoundError') msg = 'Nenhum dispositivo de microfone encontrado.';
          if (error.message.includes('HTTPS')) msg = error.message;
          addToast({ type: 'error', message: msg });
      }
  };

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isRecording) {
          interval = setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isRecording]);

  const cancelRecording = () => {
      if (!mediaRecorderRef.current) return;
      mediaRecorderRef.current.onstop = null; // Remove o listener original
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
  };

  const finishRecording = () => {
      if (!mediaRecorderRef.current) return;

      mediaRecorderRef.current.onstop = async () => {
          // [FIX] Manter o MIME type real do navegador (webm/opus)
          // A Evolution API V2 + ffmpeg converte automaticamente quando PTT flag está ativa
          const realMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm;codecs=opus';
          const audioBlob = new Blob(audioChunksRef.current, { type: realMimeType });
          // Usar extensão .webm honesta em vez de spoofar .ogg
          const extension = realMimeType.includes('mp4') ? 'mp4' : 'webm';
          const audioFile = new File([audioBlob], `voice_message.${extension}`, { type: realMimeType });
          
          try {
              // [FIX] Upload no path organizado por instância
              const instanceName = chat?.instanceId || chat?.instanceName || (chat as any)?.instance || 'unknown';
              const filename = `instances/${instanceName}/outbox-media/audio/${Date.now()}_voice.${extension}`;
              const downloadUrl = await uploadFile(audioFile, filename);
              
              let quotedMsg = undefined;
              if (replyingTo) {
                  quotedMsg = {
                      id: replyingTo.id,
                      author: replyingTo.authorName || (replyingTo.authorId === 'ME' ? 'Você' : 'Cliente'),
                      content: replyingTo.content || (replyingTo.metadata?.mediaType ? `[${replyingTo.metadata.mediaType}]` : 'Mídia')
                  };
              }

              // Envia com mimetype real — o Worker/Evolution converte automaticamente com PTT flag
              onSendMessage('', 'audio', downloadUrl, quotedMsg, {
                  fileName: `voice_message.${extension}`, 
                  mimetype: realMimeType 
              });
              setReplyingTo(null);
          } catch (error: any) {
              console.error("Erro ao enviar áudio:", error);
              addToast({ type: 'error', message: `Erro ao enviar áudio: ${error.message || 'Verifique Storage Rules'}` });
          }
          
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          setRecordingTime(0);
      };

      mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAttachmentClick = (type: 'image' | 'video' | 'doc') => {
      if (!fileInputRef.current) return;
      let accept = '*/*';
      if (type === 'image') accept = 'image/*';
      if (type === 'video') accept = 'video/*';
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
      setShowAttachments(false); 
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          
          let type: 'image' | 'video' | 'document' | 'audio' = 'document';
          if (file.type.startsWith('image/')) type = 'image';
          else if (file.type.startsWith('video/')) type = 'video';
          else if (file.type.startsWith('audio/')) type = 'audio';
          
          setPreviewFile({ file, url, type });
      }
  };

  const addEmoji = (emoji: string) => {
      setInputValue(prev => prev + emoji);
      inputRef.current?.focus();
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputValue.trim();

    // Constrói objeto de citação completo se houver resposta ativa
    let quotedMsg = undefined;
    if (replyingTo) {
        // [FIX] Determina o JID correto do remetente da mensagem original para que o WhatsApp reconheça o reply
        // Prioriza participant (grupos), depois remoteJid (privado)
        const senderJid = replyingTo.key?.participant || replyingTo.key?.remoteJid;
        
        quotedMsg = {
            id: replyingTo.id,
            author: replyingTo.authorName || (replyingTo.authorId === 'ME' ? 'Você' : 'Cliente'),
            content: replyingTo.content || (replyingTo.metadata?.caption) || (replyingTo.metadata?.mediaType ? `[${replyingTo.metadata.mediaType}]` : 'Mensagem'),
            senderJid: senderJid
        };
    }

    if (previewFile) {
        try {
            const filename = `media/${Date.now()}_${previewFile.file.name}`;
            // [FIX] Upload no path organizado por instância
            const instanceName = chat?.instanceId || chat?.instanceName || (chat as any)?.instance || 'unknown';
            const organizedFilename = `instances/${instanceName}/outbox-media/${filename}`;
            const downloadUrl = await uploadFile(previewFile.file, organizedFilename);
            
            onSendMessage(text, previewFile.type as any, downloadUrl, quotedMsg, {
                fileName: previewFile.file.name,
                mimetype: previewFile.file.type
            }); 
            
            setPreviewFile(null);
            setInputValue('');
            setReplyingTo(null);
        } catch (error: any) { 
            console.error("Erro upload:", error);
            addToast({ 
                type: 'error', 
                message: `Erro ao enviar arquivo: ${error.message || 'Verifique Storage Rules'}` 
            });
        }
        return;
    }

    if (!text) return;

    if (editingMessage) {
        if (onEditMessage) onEditMessage(editingMessage.id, text);
        setEditingMessage(null);
        setInputValue('');
    } else {
        onSendMessage(text, 'text', undefined, quotedMsg);
        setInputValue('');
        setReplyingTo(null);
    }
    inputRef.current?.focus();
  };

  const groupedMessages = useMemo(() => {
      return messages.reduce((acc, message) => {
          const ts = typeof message.timestamp === 'number' ? new Date(message.timestamp) : new Date(message.timestamp);
          if (isNaN(ts.getTime())) return acc; 
          const date = ts.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
          if (!acc[date]) acc[date] = [];
          acc[date].push(message);
          return acc;
      }, {} as Record<string, TimelineEvent[]>);
  }, [messages]);

  const handleRightClick = (e: React.MouseEvent, msg: TimelineEvent) => {
      e.preventDefault(); e.stopPropagation(); 
      setContextMenu({ 
          x: e.clientX, 
          y: e.clientY, 
          msgId: msg.id, 
          isMe: msg.authorId === 'ME' || msg.authorId === auth.currentUser?.uid,
          text: msg.content || ''
      });
  };

  const handleReplyClick = () => {
      if (!contextMenu) return;
      const msg = messages.find(m => m.id === contextMenu.msgId);
      if (msg) {
          setReplyingTo(msg);
          inputRef.current?.focus();
      }
      setContextMenu(null);
  };

  const handleEditClick = () => {
      if (!contextMenu) return;
      const msg = messages.find(m => m.id === contextMenu.msgId);
      if (msg) {
          setEditingMessage(msg);
          setInputValue(msg.content || '');
      }
      setContextMenu(null);
      inputRef.current?.focus();
  };

  const handleDeleteClick = () => {
      if (!contextMenu || !onDeleteMessage) return;
      if (confirm('Apagar esta mensagem para todos?')) {
          onDeleteMessage(contextMenu.msgId, true);
      }
      setContextMenu(null);
  };

    const handleReminderClick = () => {
        if (!contextMenu) return;
        const msg = messages.find(m => m.id === contextMenu.msgId);
        if (msg) {
            setReminderModalMsg(msg);
        }
        setContextMenu(null);
    };

    const handleReloadMedia = async (msgId: string) => {
        if (!chat || !msgId) return;
        
        const msg = messages.find(m => m.id === msgId);
        if (!msg || !msg.media) return;

        addToast({ type: 'info', message: 'Solicitando novo download da mídia...' });

        try {
            // [FIX] Correção do endpoint e extração de instanceId
            // Prioriza campos diretos e fallback para metadata se disponível
            const instanceId = chat.instanceId || chat.instanceName || (chat as any).instance;
            const remoteJid = chat.remoteJid || chat.id;

            if (!instanceId) {
                console.warn("InstanceId não disponível para reload de mídia.");
                return;
            }

            // A URL do worker deve ser absoluta conforme definido no ambiente de build do Vite
            const workerUrl = (import.meta as any).env.VITE_WORKER_URL || '';

            await fetch(`${workerUrl}/jobs/reprocess-media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceName: instanceId,
                    remoteJid,
                    messageId: msgId
                })
            });

            console.log(`Solicitando reload de mídia para ${msgId} na instância ${instanceId}`);
        } catch (e) {
            console.error("Erro ao solicitar reload de mídia:", e);
            addToast({ type: 'error', message: 'Erro ao solicitar download da mídia.' });
        }
    };

    const handleMediaTimeout = async (msgId: string) => {
        if (!chat || !msgId) return;
        try {
            const instanceId = chat.instanceId || chat.instanceName || (chat as any).instance;
            const remoteJid = chat.remoteJid || chat.id;
            
            if (!instanceId || !remoteJid) return;
            
            console.warn(`[TIMEOUT GLOBAL] Marcando mídia ${msgId} como EXPIRED no Firestore`);
            const msgRef = db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${msgId}`);
            
            await msgRef.set({
                mediaStatus: 'EXPIRED',
                "media.mediaStatus": 'EXPIRED',
                updatedAt: fieldValue.serverTimestamp()
            }, { merge: true });
            
        } catch (e) {
            console.error("Erro ao salvar timeout de mídia no Firebase:", e);
        }
    };

    const isDisconnected = instanceStatus !== 'open' && instanceStatus !== 'ONLINE';
  const isGroup = chat?.type === 'group' || chat?.id.includes('@g.us');

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F2F5F8] text-gray-400 h-full relative overflow-hidden">
        {/* Empty State */}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#EFEAE2] relative overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
      {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.06] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] pointer-events-none mix-blend-multiply"></div>

      {/* Header Glassmorphism */}
      <div className="h-[64px] px-4 bg-white/90 border-b border-gray-100 flex items-center justify-between z-20 sticky top-0 shadow-sm backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[#54656F] hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center lg:hidden">
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative cursor-pointer group" onClick={onToggleInfo}>
             {isGroup && !chat.profilePicUrl ? (
                 <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 ring-1 ring-gray-100">
                     <Users size={20} />
                 </div>
             ) : (
                 <Avatar src={chat.profilePicUrl || ''} name={chat.leadName || chat.pushName} alt="" className="w-10 h-10 rounded-full transition-transform group-hover:scale-105 border border-white shadow-sm ring-1 ring-gray-100" />
             )}
             
             {!isGroup && (
                 <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${isDisconnected ? 'bg-red-500' : 'bg-green-500'} shadow-sm border border-white`}></div>
             )}
          </div>
          
          <div className="cursor-pointer" onClick={onToggleInfo}>
            <h3 className="font-semibold text-[#111b21] text-[16px] line-clamp-1 leading-tight">{chat.leadName || chat.pushName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-[#667781] mt-0.5">
                {isGroup ? (
                    <span className="font-medium text-[#667781] flex items-center gap-1">Grupo • {chat.id.replace('@g.us', '').slice(0,6)}...</span>
                ) : (
                    <>
                        <span className={`font-medium ${isDisconnected ? 'text-red-500' : 'text-[#667781]'}`}>{isDisconnected ? 'Offline' : 'Online'}</span>
                        {!isDisconnected && <span className="w-1 h-1 bg-[#667781] rounded-full"></span>}
                        {!isDisconnected && <span className="opacity-80">clique para dados</span>}
                    </>
                )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-[#54656F]">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={20} strokeWidth={2} /></button>
          <button onClick={onToggleInfo} className={`p-2 rounded-full transition-colors hover:bg-gray-100`}>
              <Info size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto z-10 custom-scrollbar scroll-smooth">
        <div 
            ref={scrollContainerRef}
            onScroll={() => {
                if (!scrollContainerRef.current) return;
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
            }}
            className="min-h-full p-4 pb-6 w-full mx-auto space-y-4 md:px-8 lg:px-12"
        >
            {hasMore && (
                <div ref={topSentinelRef} className="py-4 text-center">
                    {loadingMore ? <Loader2 className="animate-spin w-6 h-6 mx-auto text-brand-500 opacity-60" /> : <div className="h-1" />}
                </div>
            )}

            {(Object.entries(groupedMessages) as [string, TimelineEvent[]][]).map(([date, msgs]) => (
                <div key={date}>
                    <div className="flex justify-center mb-6 sticky top-2 z-20 pointer-events-none">
                        <span className="bg-white/90 text-[#54656F] shadow-sm px-3 py-1.5 rounded-lg text-[12px] font-medium uppercase tracking-wide backdrop-blur-md border border-white/50">
                            {date}
                        </span>
                    </div>
                    <div className="flex flex-col gap-1" ref={listRef}>
                        {msgs.map((event, index) => {
                            if (event.type !== 'WHATSAPP_MSG' && !event.isInternal) return null;

                            const isMe = event.authorId === 'ME' || event.authorId === auth.currentUser?.uid;
                            const prevMsg = msgs[index - 1];
                            const isInternal = event.isInternal || event.type === 'NOTE';
                            
                            const isFirstInGroup = !prevMsg || prevMsg.authorId !== event.authorId || (prevMsg.type !== event.type);
                            const repliedMsg = event.replyTo;

                            return (
                                <MessageBubble
                                    key={event.id}
                                    event={event}
                                    isMe={isMe}
                                    isInternal={isInternal}
                                    isFirstInGroup={isFirstInGroup}
                                    repliedMsg={repliedMsg}
                                    isGroupChat={isGroup}
                                    onRightClick={handleRightClick}
                                    onRetryMessage={onRetryMessage}
                                    onReactMessage={onReactMessage}
                                    onReloadMedia={handleReloadMedia}
                                    onMediaTimeout={handleMediaTimeout}
                                    scrollToMessage={scrollToMessage}
                                    setLightboxImage={setLightboxImage}
                                    setHistoryModalMsg={setHistoryModalMsg}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {showScrollButton && (
          <button onClick={() => scrollToBottom()} className="absolute bottom-28 right-6 bg-white text-[#54656F] p-2 rounded-full shadow-lg border border-gray-100 z-30 transition-all hover:bg-[#F0F2F5] active:scale-95"><ArrowDown size={20} /></button>
      )}

      {/* Modais Flutuantes */}
      {historyModalMsg && (
          <EditHistoryModal message={historyModalMsg} onClose={() => setHistoryModalMsg(null)} />
      )}

      {/* Reminder Modal */}
      {reminderModalMsg && chat && (
          <QuickReminderModal 
              message={reminderModalMsg} 
              chat={chat} 
              onClose={() => setReminderModalMsg(null)} 
              onSave={() => setReminderModalMsg(null)} 
          />
      )}

      {/* Context Menu Portal */}
      {contextMenu && createPortal(
          <div 
            className="fixed z-[100] bg-white rounded-lg shadow-[0_2px_5px_0_rgba(11,20,26,0.26),0_2px_10px_0_rgba(11,20,26,0.16)] py-1 min-w-[200px] animate-in fade-in zoom-in-95 origin-top-left"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseLeave={() => setContextMenu(null)}
          >
              {/* Quick Reactions */}
              <div className="flex justify-between px-3 py-2 border-b border-gray-100 mb-1">
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => { onReactMessage && onReactMessage(contextMenu.msgId, emoji); setContextMenu(null); }} 
                        className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                          {emoji}
                      </button>
                  ))}
              </div>

              <button onClick={() => { navigator.clipboard.writeText(contextMenu.text); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-sm flex items-center gap-3 font-normal text-[#111b21] transition-colors"><Copy size={16}/> Copiar</button>
              
              <button onClick={handleReminderClick} className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-sm flex items-center gap-3 font-normal text-[#111b21] transition-colors">
                  <Bell size={16}/> Lembrar depois
              </button>

              <button onClick={handleReplyClick} className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-sm flex items-center gap-3 font-normal text-[#111b21] transition-colors">
                  <Reply size={16}/> Responder
              </button>

              <button onClick={() => { 
                  const msg = messages.find(m => m.id === contextMenu.msgId);
                  if (msg && onForwardMessage) onForwardMessage(msg);
                  setContextMenu(null); 
              }} className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-sm flex items-center gap-3 font-normal text-[#111b21] transition-colors">
                  <Share2 size={16}/> Encaminhar
              </button>
              
              {contextMenu.isMe && (
                  <>
                    <button onClick={handleEditClick} className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-sm flex items-center gap-3 font-normal text-[#111b21] transition-colors"><Edit2 size={16}/> Editar</button>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    {(() => {
                        const msg = messages.find(m => m.id === contextMenu.msgId);
                        // Limite de 15 minutos (15 * 60 * 1000 ms)
                        const msgTime = typeof msg?.timestamp === 'number' ? msg.timestamp : new Date(msg?.timestamp || 0).getTime();
                        const isRecent = (Date.now() - msgTime) < (15 * 60 * 1000);
                        
                        return (
                            <>
                                {isRecent && (
                                    <button 
                                        onClick={() => { onDeleteMessage && onDeleteMessage(contextMenu.msgId, true); setContextMenu(null); }} 
                                        className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-red-500 text-sm flex items-center gap-3 font-normal transition-colors"
                                    >
                                        <Trash2 size={16}/> Apagar para todos
                                    </button>
                                )}
                                <button 
                                    onClick={() => { onDeleteMessage && onDeleteMessage(contextMenu.msgId, false); setContextMenu(null); }} 
                                    className="w-full text-left px-4 py-2.5 hover:bg-[#F0F2F5] text-red-500 text-sm flex items-center gap-3 font-normal transition-colors rounded-b-lg"
                                >
                                    <Trash2 size={16}/> Apagar para mim
                                </button>
                            </>
                        );
                    })()}
                  </>
              )}
          </div>,
          document.body
      )}

      {/* Input Area Flutuante (Capsule Design) */}
      <div className="px-4 pb-4 pt-2 z-20 relative bg-transparent flex flex-col justify-end pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto relative">
            
            {/* Mensagem de Edição */}
            {editingMessage && (
                <div className="flex items-center justify-between bg-white p-3 rounded-t-xl border-b border-gray-100 text-xs text-brand-700 shadow-sm mx-2 animate-in slide-in-from-bottom-2">
                    <span className="font-bold flex items-center gap-2"><Edit2 size={14}/> Editando mensagem</span>
                    <button onClick={() => { setEditingMessage(null); setInputValue(''); }} className="p-1 hover:bg-gray-100 rounded-full"><X size={16}/></button>
                </div>
            )}

            {/* Preview de Resposta (Reply) */}
            {replyingTo && (
                <div className="flex items-center justify-between bg-white p-3 rounded-t-xl border-b border-gray-100 text-xs shadow-sm mx-2 animate-in slide-in-from-bottom-2 border-l-4 border-l-[#06cf9c]">
                    <div className="flex flex-col">
                        <span className="font-bold text-[#06cf9c] mb-0.5">{replyingTo.authorName || (replyingTo.authorId === 'ME' ? 'Você' : 'Cliente')}</span>
                        <span className="text-gray-500 line-clamp-1">{replyingTo.content || 'Mídia'}</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={16}/></button>
                </div>
            )}
            
            {/* Preview de Arquivo */}
            {previewFile && (
                <div className="p-4 bg-[#E9EDEF] border-t border-gray-200 shadow-lg rounded-t-2xl mb-0 animate-in slide-in-from-bottom-10 mx-0">
                    <div className="flex gap-4 items-start">
                        <div className="relative group shrink-0">
                            {previewFile.type === 'video' ? (
                                <div className="relative">
                                    <video src={previewFile.url} className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow-sm" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                                        <PlayCircle size={24} className="text-white opacity-80" />
                                    </div>
                                </div>
                            ) : (
                                <img src={previewFile.url} className="w-24 h-24 object-cover rounded-lg border border-gray-300 shadow-sm" alt="Preview"/>
                            )}
                            <button onClick={cancelPreview} className="absolute -top-2 -right-2 bg-white text-gray-500 rounded-full p-1 shadow-md hover:scale-110 transition-transform border border-gray-200"><X size={14}/></button>
                        </div>
                        <div className="flex-1 pt-1">
                            <h4 className="text-sm font-bold text-[#111b21] mb-1">Enviar {previewFile.type === 'video' ? 'Vídeo' : previewFile.type === 'image' ? 'Imagem' : 'Documento'}</h4>
                            <input 
                                type="text" 
                                placeholder="Adicione uma legenda..." 
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00a884] transition-all mt-2"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                                autoFocus
                            />
                        </div>
                        {isUploading ? (
                            <div className="p-3 bg-gray-100 rounded-full flex items-center justify-center self-end">
                                <Loader2 size={20} className="animate-spin text-gray-500" />
                            </div>
                        ) : (
                            <button onClick={handleSend} className="p-3 bg-[#00a884] text-white rounded-full shadow-lg hover:bg-[#008f6f] transition-all self-end"><Send size={20} className="ml-0.5" /></button>
                        )}
                    </div>
                </div>
            )}

            {/* Menu de Anexos */}
            {showAttachments && (
                <div ref={attachMenuRef} className="absolute bottom-[calc(100%+16px)] left-0 p-4 bg-white border border-gray-100 shadow-[0_2px_5px_0_rgba(11,20,26,0.26),0_2px_10px_0_rgba(11,20,26,0.16)] rounded-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 z-50 origin-bottom-left w-[280px]">
                    <div className="grid grid-cols-3 gap-y-4 gap-x-2">
                        <AttachmentOption icon={ImageIcon} label="Fotos" gradient="from-purple-500 to-indigo-600" onClick={() => handleAttachmentClick('image')} delay="0ms" />
                        <AttachmentOption icon={Camera} label="Câmera" gradient="from-rose-400 to-red-500" onClick={() => {}} delay="50ms" />
                        <AttachmentOption icon={FileIcon} label="Documento" gradient="from-blue-400 to-cyan-500" onClick={() => handleAttachmentClick('doc')} delay="100ms" />
                        <AttachmentOption icon={User} label="Contato" gradient="from-blue-500 to-indigo-600" onClick={() => {}} delay="150ms" />
                        <AttachmentOption icon={MapPin} label="Local" gradient="from-green-400 to-emerald-600" onClick={() => {}} delay="200ms" />
                        <AttachmentOption icon={Music} label="Áudio" gradient="from-orange-400 to-amber-500" onClick={() => {}} delay="250ms" />
                    </div>
                </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+16px)] left-0 z-50">
                    <CuratedEmojiPicker onSelect={addEmoji} />
                </div>
            )}

            {/* Barra de Input Flutuante */}
            {!previewFile && (
                <div className="flex items-end gap-2 bg-white p-2 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#E9EDEF] transition-all duration-300 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.12)] focus-within:border-gray-300 relative overflow-hidden">
                    
                    {/* UI de Gravação Sobreposta */}
                    <div className={`absolute inset-0 bg-white z-[50] flex items-center justify-between px-4 transition-all duration-300 ${isRecording ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}`}>
                        <div className="flex items-center gap-3 text-red-500 animate-pulse">
                            <Mic size={20} className="fill-current" />
                            <span className="font-mono text-lg font-medium">{formatRecordingTime(recordingTime)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                            <button onClick={cancelRecording} className="flex items-center gap-1.5 text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors font-bold shadow-sm active:scale-95" title="Cancelar Gravação">
                                <Trash2 size={16} /> <span className="hidden sm:inline">Cancelar</span>
                            </button>
                            <button onClick={finishRecording} className="flex items-center gap-1.5 text-white bg-brand-500 hover:bg-brand-600 px-4 py-1.5 rounded-full transition-colors font-bold shadow-md active:scale-95" title="Enviar Gravação">
                                <Send size={16} /> <span className="hidden sm:inline">Enviar</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowAttachments(!showAttachments)} 
                        className={`p-3 rounded-full transition-all duration-300 transform ${showAttachments ? 'bg-gray-100 rotate-45 text-gray-900' : 'text-[#54656F] hover:bg-gray-100'}`}
                    >
                        <Plus size={24} strokeWidth={2.5} />
                    </button>
                    
                    <div className="flex-1 flex items-center relative min-h-[48px]">
                        <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`absolute left-0 p-2 text-[#54656F] hover:text-[#111b21] transition-colors transform hover:scale-110 active:scale-95 z-20 ${showEmojiPicker ? 'text-[#00a884]' : ''}`}
                        >
                            <Smile size={24}/>
                        </button>
                        <input 
                            ref={inputRef} 
                            className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-[15px] text-[#111b21] placeholder:text-[#54656F] font-normal leading-relaxed relative z-10" 
                            placeholder="Mensagem" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                        />
                    </div>

                    {(inputValue.trim()) ? (
                        <button 
                            onClick={handleSend} 
                            className="p-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-md transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center w-12 h-12 relative z-20"
                        >
                            {editingMessage ? <Check size={24} /> : <Send size={22} className="ml-0.5"/>}
                        </button>
                    ) : (
                        <button 
                            onClick={isRecording ? finishRecording : startRecording} 
                            className={`p-3 rounded-full shadow-sm transition-all duration-200 w-12 h-12 flex items-center justify-center relative z-20 ${isRecording ? 'bg-brand-500 text-white scale-110 shadow-brand-200/50' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
                        >
                            {isRecording ? <Send size={20} className="ml-0.5" /> : <Mic size={24}/>}
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
