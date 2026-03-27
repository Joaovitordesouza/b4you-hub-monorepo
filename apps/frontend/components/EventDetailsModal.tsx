import React, { useState } from 'react';
import { format, differenceInMinutes, setHours, setMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Calendar, Clock, Users, Link as LinkIcon, Trash2, Edit2, Loader2, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Props {
    event: any;
    readOnly?: boolean;
    onClose: () => void;
    onSave: (eventId: string, updatedData: any) => Promise<void>;
    onDelete: (eventId: string) => Promise<void>;
}

export const EventDetailsModal: React.FC<Props> = ({ event, readOnly = false, onClose, onSave, onDelete }) => {
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Parse start and end times to extract time and duration
    const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
    const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : new Date();
    const durationMins = differenceInMinutes(endDate, startDate) || 30;
    
    const [editForm, setEditForm] = useState({
        title: event.summary || '',
        time: format(startDate, 'HH:mm'),
        duration: durationMins,
        attendeeEmail: event.attendees?.[0]?.email || '' // simplistic: first attendee
    });

    const handleSave = async () => {
        if (!editForm.title.trim()) {
            addToast({ type: 'error', message: 'O título do evento é obrigatório.' });
            return;
        }

        setSaving(true);
        try {
            const [hours, minutes] = editForm.time.split(':').map(Number);
            const startDateTime = setMinutes(setHours(startDate, hours), minutes);
            const endDateTime = new Date(startDateTime.getTime() + editForm.duration * 60000);

            const updatedData = {
                summary: editForm.title,
                start: { dateTime: startDateTime.toISOString() },
                end: { dateTime: endDateTime.toISOString() },
                attendees: editForm.attendeeEmail ? [{ email: editForm.attendeeEmail }] : []
            };

            await onSave(event.id, updatedData);
            setIsEditing(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja cancelar este evento?')) return;
        setDeleting(true);
        try {
            await onDelete(event.id);
            onClose();
        } catch (err) {
            console.error(err);
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Calendar size={16} className={readOnly ? 'text-gray-500' : 'text-brand-600'} />
                        {isEditing ? 'Editar Evento' : 'Detalhes do Evento'}
                    </h3>
                    <div className="flex items-center gap-1">
                        {!readOnly && !isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors" title="Editar">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Deletar">
                                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Título */}
                    <div>
                        {isEditing ? (
                            <input 
                                type="text" 
                                className="w-full text-xl font-black text-gray-900 placeholder-gray-300 border-b border-gray-200 outline-none focus:border-brand-500 p-1"
                                value={editForm.title}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                                autoFocus
                            />
                        ) : (
                            <h2 className="text-xl font-black text-gray-900 leading-tight">{event.summary || '(Sem Título)'}</h2>
                        )}
                        <p className="text-sm text-gray-500 font-medium capitalize mt-1">
                            {format(startDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Horário e Duração */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
                            <Clock size={16} className="text-gray-400" />
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="time" 
                                        className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 cursor-pointer"
                                        value={editForm.time}
                                        onChange={e => setEditForm({...editForm, time: e.target.value})}
                                    />
                                    <span className="text-gray-300 text-xs">-</span>
                                    <select 
                                        className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 cursor-pointer focus:ring-0"
                                        value={editForm.duration}
                                        onChange={e => setEditForm({...editForm, duration: Number(e.target.value)})}
                                    >
                                        <option value={15}>15 minutos</option>
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>1 hjora</option>
                                        <option value={90}>1.5 h</option>
                                        <option value={120}>2 horas</option>
                                    </select>
                                </div>
                            ) : (
                                <span className="text-sm font-bold text-gray-700">
                                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')} ({durationMins} min)
                                </span>
                            )}
                        </div>

                        {/* Convidados */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
                            <Users size={16} className="text-gray-400" />
                            {isEditing ? (
                                <input 
                                    type="email" 
                                    placeholder="E-mail principal do convidado" 
                                    className="w-full text-sm font-medium text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                                    value={editForm.attendeeEmail}
                                    onChange={e => setEditForm({...editForm, attendeeEmail: e.target.value})}
                                />
                            ) : (
                                <div className="flex flex-col">
                                    {event.attendees && event.attendees.length > 0 ? (
                                        event.attendees.map((attendee: any, i: number) => (
                                            <span key={i} className="text-sm font-medium text-gray-700">{attendee.email} {attendee.responseStatus === 'accepted' ? '✅' : '⏳'}</span>
                                        ))
                                    ) : (
                                        <span className="text-sm font-medium text-gray-400 italic">Nenhum convidado</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Google Meet Link */}
                        {event.hangoutLink && !isEditing && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                    <LinkIcon size={14} />
                                </div>
                                <a 
                                    href={event.hangoutLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-sm font-bold text-blue-700 hover:underline"
                                >
                                    Participar do Google Meet
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer (Apenas no modo edição) */}
                {isEditing && (
                    <div className="flex justify-end gap-3 p-5 pt-0">
                        <button 
                            onClick={() => { setIsEditing(false); setEditForm({...editForm, title: event.summary || '', time: format(startDate, 'HH:mm'), duration: durationMins, attendeeEmail: event.attendees?.[0]?.email || ''}); }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
