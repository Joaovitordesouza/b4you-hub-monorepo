import React, { useState } from 'react';
import { Producer, TrackingStatus } from '../types';
import { createPortal } from 'react-dom';
import { X, ArrowRight, MessageSquare, Shield, AlertTriangle, Calendar, Clock, ChevronDown, User } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';

interface Props {
    producer: Producer;
    targetStatus: TrackingStatus;
    onClose: () => void;
    onConfirm: (data: { note: string, scheduleAt?: string, responsibility?: 'B4YOU' | 'CLIENT' }) => void;
    config: { label: string, color: string };
}

const TAG_OPTIONS = [
    "Cliente respondeu",
    "Sem resposta",
    "Bug resolvido",
    "Agendamento confirmado",
    "Solicitação do cliente",
    "Mudança estratégica"
];

export const TransitionGuard: React.FC<Props> = ({ producer, targetStatus, onClose, onConfirm, config }) => {
    const [note, setNote] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [responsibility, setResponsibility] = useState<'B4YOU' | 'CLIENT'>('B4YOU');
    
    // Scheduling States
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleConfirm = () => {
        const finalNote = selectedTag ? `[${selectedTag}] ${note}` : note;
        
        let scheduleAt = undefined;
        if (targetStatus === 'AGUARDANDO_RETORNO' && scheduleDateTime) {
            scheduleAt = new Date(scheduleDateTime).toISOString();
        }

        onConfirm({ note: finalNote, scheduleAt, responsibility });
    };

    const setQuickSchedule = (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        // Pula fim de semana se cair no sábado (6) ou domingo (0)
        if (date.getDay() === 6) date.setDate(date.getDate() + 2);
        if (date.getDay() === 0) date.setDate(date.getDate() + 1);
        
        const dateStr = date.toISOString().split('T')[0];
        setScheduleDateTime(`${dateStr}T09:00:00`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 font-sans">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 border border-white/20 ring-1 ring-black/5">
                
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <Shield size={24} className="text-indigo-600"/> Registro de Transição
                        </h2>
                        <p className="text-sm text-slate-500 mt-1.5 font-medium">
                            Movendo <strong className="text-slate-900">{producer.nome_display}</strong> para <span className={`font-black px-3 py-1 rounded-xl border ${config.color.replace('text-', 'bg-').replace('700', '50')} ${config.color} ${config.color.replace('text-', 'border-').replace('700', '100')}`}>{config.label}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all hover:text-slate-600">
                        <X size={20}/>
                    </button>
                </div>

                <div className="px-10 py-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar pb-32">
                    
                    {/* Lógica Específica: AGUARDANDO RETORNO (Agendamento) */}
                    {targetStatus === 'AGUARDANDO_RETORNO' && (
                        <div className="space-y-5">
                            {/* Responsabilidade */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em]">Quem está pendente?</label>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setResponsibility('B4YOU')}
                                        className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${responsibility === 'B4YOU' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-600'}`}
                                    >
                                        <Shield size={14}/> B4You
                                    </button>
                                    <button 
                                        onClick={() => setResponsibility('CLIENT')}
                                        className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${responsibility === 'CLIENT' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-500'}`}
                                    >
                                        <User size={14}/> Cliente
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-200 space-y-4">
                                <div className="flex items-center gap-2 text-slate-500 font-mono font-bold text-[10px] uppercase tracking-[0.2em]">
                                    <Clock size={14}/> Definir Lembrete de Cobrança
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => setQuickSchedule(1)} className="py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95">
                                        Amanhã
                                    </button>
                                    <button onClick={() => setQuickSchedule(3)} className="py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95">
                                        3 Dias
                                    </button>
                                    <button onClick={() => setQuickSchedule(7)} className="py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95">
                                        1 Semana
                                    </button>
                                </div>

                            <div className="relative">
                                <button 
                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                    className={`w-full flex items-center justify-between p-4 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${scheduleDateTime ? 'border-indigo-500 bg-white text-indigo-950 shadow-md shadow-indigo-50' : 'bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${scheduleDateTime ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Calendar size={16} />
                                        </div>
                                        <span>
                                            {scheduleDateTime && !isNaN(new Date(scheduleDateTime).getTime()) 
                                                ? new Date(scheduleDateTime).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}).replace(',', ' às') 
                                                : 'Definir Data e Hora'}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className={`transition-transform ${isDatePickerOpen ? 'rotate-180' : ''} ${scheduleDateTime ? 'text-indigo-600' : 'text-slate-400'}`}/>
                                </button>
                                
                                {isDatePickerOpen && (
                                    <DateTimePicker 
                                        selectedDateTime={scheduleDateTime}
                                        onChange={(date) => {
                                            setScheduleDateTime(date);
                                            setIsDatePickerOpen(false);
                                        }}
                                        onClose={() => setIsDatePickerOpen(false)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Tags Rápidas */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em]">Motivo Principal</label>
                        <div className="flex flex-wrap gap-2.5">
                            {TAG_OPTIONS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                                    className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${
                                        selectedTag === tag 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Área de Nota */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em]">Nota de Contexto (Obrigatória)</label>
                        <div className="relative group">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full h-32 p-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-slate-800 placeholder-slate-400 leading-relaxed shadow-sm"
                                placeholder="Descreva o que motivou essa mudança..."
                                autoFocus
                            />
                            <MessageSquare size={18} className="absolute top-4 right-4 text-slate-300 pointer-events-none group-focus-within:text-indigo-400 transition-colors"/>
                        </div>
                    </div>

                    {/* Warning se for um movimento de risco */}
                    {targetStatus === 'PRECISA_CONTATO' && (
                        <div className="p-4 bg-rose-50/50 backdrop-blur-md rounded-2xl border border-rose-100 flex items-start gap-4 shadow-sm">
                            <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5"/>
                            <p className="text-xs text-rose-900 font-medium leading-relaxed">
                                Mover para <strong className="font-black">Precisa de Contato</strong> acionará alertas de SLA críticos para a gerência.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-10 py-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3.5 text-[11px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-[0.2em]"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={(!note.trim() && !selectedTag) || (targetStatus === 'AGUARDANDO_RETORNO' && !scheduleDateTime)}
                        className="flex-[2] py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] text-[11px]"
                    >
                        Confirmar Mudança <ArrowRight size={16}/>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
