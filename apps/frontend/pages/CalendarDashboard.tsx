import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Plus, Loader2, X, Clock, Users, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { functions, db } from '../firebase';
import { EventDetailsModal } from '../components/EventDetailsModal';

export const CalendarDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [eventForm, setEventForm] = useState({ title: '', time: '10:00', duration: 30, attendeeEmail: '' });
    const [savingEvent, setSavingEvent] = useState(false);

    // Editing State
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    // Team View State
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [teamSearch, setTeamSearch] = useState('');

    useEffect(() => {
        const unsub = db.collection('users').onSnapshot(snap => {
            setTeamMembers(snap.docs.map(d => ({id: d.id, ...d.data()})));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        fetchEvents();
    }, [currentDate, currentUser, viewMode, selectedUserId]);

    const fetchEvents = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // Determine time range based on viewMode
            let timeMin, timeMax;
            if (viewMode === 'month') {
                const start = startOfMonth(currentDate);
                const end = endOfMonth(currentDate);
                timeMin = start.toISOString();
                timeMax = end.toISOString();
            } else { // viewMode === 'week'
                const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
                const end = endOfWeek(currentDate, { weekStartsOn: 0 });
                timeMin = start.toISOString();
                timeMax = end.toISOString();
            }

            const listEvents = functions.httpsCallable('listEvents');
            const response = await listEvents({ 
                timeMin, 
                timeMax,
                targetUserId: selectedUserId || undefined
            });
            setEvents(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch events:', error);
            // Ignore error gracefully so UI doesn't break if not connected yet
        } finally {
            setLoading(false);
        }
    };

    const handlePrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
        } else {
            setCurrentDate(d => subWeeks(d, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
        } else {
            setCurrentDate(d => addWeeks(d, 1));
        }
    };

    const handleDayClick = (day: Date) => {
        if (selectedUserId && selectedUserId !== currentUser?.uid) {
            addToast({ type: 'error', message: 'Você só pode criar eventos na sua própria agenda.' });
            return;
        }
        setSelectedDate(day);
        setEventForm({ title: '', time: '10:00', duration: 30, attendeeEmail: '' });
        setIsModalOpen(true);
    };

    const handleEventClick = (e: React.MouseEvent, event: any) => {
        e.stopPropagation();
        setSelectedEvent(event);
    };

    const handleSaveExistingEvent = async (eventId: string, updatedData: any) => {
        try {
            const manageEvent = functions.httpsCallable('manageEvent');
            const response = await manageEvent({ action: 'update', eventId, eventData: updatedData, targetUserId: selectedUserId || undefined });
            // Optimistic Update
            if (response.data) {
                setEvents(prev => prev.map(e => e.id === eventId ? response.data : e));
            }
            addToast({ type: 'success', message: 'Evento atualizado!' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao atualizar o evento.' });
            throw error;
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        try {
            const manageEvent = functions.httpsCallable('manageEvent');
            await manageEvent({ action: 'delete', eventId, targetUserId: selectedUserId || undefined });
            // Optimistic Update
            setEvents(prev => prev.filter(e => e.id !== eventId));
            addToast({ type: 'success', message: 'Evento cancelado!' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao deletar o evento.' });
            throw error;
        }
    };

    const handleCreateEvent = async () => {
        if (!eventForm.title) {
            addToast({ type: 'error', message: 'O título do evento é obrigatório.' });
            return;
        }

        setSavingEvent(true);
        try {
            const [hours, minutes] = eventForm.time.split(':').map(Number);
            const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
            const endDateTime = addMinutes(startDateTime, eventForm.duration);

            const manageEvent = functions.httpsCallable('manageEvent');
            const response = await manageEvent({
                action: 'create',
                eventData: {
                    summary: eventForm.title,
                    start: { dateTime: startDateTime.toISOString() },
                    end: { dateTime: endDateTime.toISOString() },
                    attendees: eventForm.attendeeEmail ? [{ email: eventForm.attendeeEmail }] : [],
                    conferenceData: {
                        createRequest: { requestId: `b4you-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
                    }
                },
                targetUserId: selectedUserId || undefined
            });

            // Optimistic UI update
            if (response.data) {
                setEvents(prev => [...prev, response.data]);
            }

            addToast({ type: 'success', message: 'Evento criado com sucesso no Google Calendar!' });
            setIsModalOpen(false);
        } catch (error) {
            console.error('Erro ao criar evento:', error);
            addToast({ type: 'error', message: 'Erro ao criar o evento. Verifique sua conexão.' });
        } finally {
            setSavingEvent(false);
        }
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
        const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="flex flex-1 overflow-x-auto bg-gray-50 border-t border-l border-gray-200">
                {days.map(day => {
                    const dayEvents = events.filter(e => {
                        const eventDate = e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date) : null);
                        return eventDate && isSameDay(eventDate, day);
                    });

                    return (
                        <div key={day.toISOString()} className="flex-1 min-w-[150px] border-r border-gray-200 flex flex-col bg-white">
                            <div className="p-3 border-b border-gray-100 flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">{format(day, 'E', { locale: ptBR })}</span>
                                <div className={`mt-1 flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-brand-600 text-white font-bold' : 'text-gray-900 font-medium'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto cursor-pointer hover:bg-gray-50/50" onClick={() => handleDayClick(day)}>
                                {dayEvents.map(evt => {
                                    const eventStart = new Date(evt.start.dateTime || evt.start.date);
                                    const isAllDay = !evt.start.dateTime;
                                    
                                    return (
                                        <div 
                                            key={evt.id} 
                                            title={evt.summary}
                                            onClick={(e) => handleEventClick(e, evt)}
                                            className={`p-2 rounded-lg text-xs cursor-pointer hover:opacity-90 transition-opacity shadow-sm border ${
                                                isAllDay ? 'bg-brand-50 text-brand-700 border-brand-200 font-bold' : 'bg-blue-50 text-blue-800 border-l-4 border-l-blue-500 border-transparent font-medium'
                                            }`}
                                        >
                                            <div className="font-bold mb-0.5">{evt.summary}</div>
                                            {!isAllDay && <div className="text-[10px] opacity-80">{format(eventStart, 'HH:mm')}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderMonthView = () => {
        const startDate = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
        const endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 border-t border-l border-gray-200 flex-1">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-b border-gray-200">
                        {day}
                    </div>
                ))}
                {days.map(day => {
                    const dayEvents = events.filter(e => {
                        const eventDate = e.start?.dateTime ? new Date(e.start.dateTime) : (e.start?.date ? new Date(e.start.date) : null);
                        return eventDate && isSameDay(eventDate, day);
                    });

                    return (
                        <div 
                            key={day.toISOString()} 
                            onClick={() => handleDayClick(day)}
                            className={`min-h-[100px] p-2 border-r border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${!isSameMonth(day, currentDate) ? 'bg-gray-50' : 'bg-white'}`}
                        >
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday(day) ? 'bg-brand-600 text-white font-bold text-xs' : 'text-gray-900 text-xs font-medium'}`}>
                                {format(day, 'd')}
                            </div>
                            <div className="space-y-1 mt-2">
                                {dayEvents.map(evt => {
                                    const eventStart = new Date(evt.start.dateTime || evt.start.date);
                                    const isAllDay = !evt.start.dateTime;
                                    
                                    return (
                                        <div 
                                            key={evt.id} 
                                            title={evt.summary}
                                            onClick={(e) => handleEventClick(e, evt)}
                                            className={`text-xs px-1.5 py-0.5 rounded mb-1 truncate shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${
                                                isAllDay ? 'bg-brand-100 text-brand-800 border border-brand-200 font-bold' : 'bg-blue-50 text-blue-800 border-l-2 border-blue-500 font-medium'
                                            }`}
                                        >
                                            {isAllDay ? 'Dia Todo' : format(eventStart, 'HH:mm')} - {evt.summary}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={18} /></button>
                        <span className="text-sm font-bold text-gray-900 min-w-[120px] text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight size={18} /></button>
                    </div>

                    <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
                        <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Mês</button>
                        <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Semana</button>
                    </div>

                    <div className="flex items-center gap-2 ml-4 relative">
                        <button 
                            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 bg-white transition-colors text-sm font-bold text-gray-700 w-48 shadow-sm"
                        >
                            <Users size={16} className="text-gray-400" />
                            <span className="truncate flex-1 text-left">{selectedUserId ? teamMembers.find(u => u.id === selectedUserId)?.nome || 'Usuário' : 'Minha Agenda'}</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isTeamDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isTeamDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-[90]" onClick={() => setIsTeamDropdownOpen(false)}></div>
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 pb-2 mb-2 border-b border-gray-50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ver agenda da Equipe</span>
                                    </div>
                                    <div className="px-3 pb-2 mb-2">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar membro..." 
                                            className="w-full text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium text-gray-700"
                                            value={teamSearch}
                                            onChange={(e) => setTeamSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedUserId(''); setIsTeamDropdownOpen(false); setTeamSearch(''); }}
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${!selectedUserId ? 'text-brand-600 font-bold bg-brand-50/50' : 'text-gray-700 font-medium hover:bg-gray-50'}`}
                                    >
                                        Minha Agenda
                                    </button>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar-thin">
                                        {teamMembers.filter(u => u.id !== currentUser?.uid && (!teamSearch || u.nome?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(teamSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))).map(u => (
                                            <button 
                                                key={u.id}
                                                onClick={() => { setSelectedUserId(u.id); setIsTeamDropdownOpen(false); setTeamSearch(''); }}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedUserId === u.id ? 'text-brand-600 font-bold bg-brand-50/50' : 'text-gray-700 font-medium hover:bg-gray-50'}`}
                                            >
                                                {u.nome}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {loading && <Loader2 size={16} className="text-brand-500 animate-spin" />}
                    <button onClick={() => handleDayClick(new Date())} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
                        <Plus size={14} /> Novo Evento
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 p-4">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {viewMode === 'month' ? renderMonthView() : renderWeekView()}
                </div>
            </div>

            {/* Modal de Novo Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-100">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Calendar size={16} className="text-brand-600" />
                                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="Adicionar título" 
                                    className="w-full text-xl font-black text-gray-900 placeholder-gray-300 border-none outline-none focus:ring-0 p-0"
                                    value={eventForm.title}
                                    onChange={e => setEventForm({...eventForm, title: e.target.value})}
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <Clock size={16} className="text-gray-400" />
                                <input 
                                    type="time" 
                                    className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 cursor-pointer"
                                    value={eventForm.time}
                                    onChange={e => setEventForm({...eventForm, time: e.target.value})}
                                />
                                <span className="text-gray-300 text-xs">-</span>
                                <select 
                                    className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 cursor-pointer focus:ring-0"
                                    value={eventForm.duration}
                                    onChange={e => setEventForm({...eventForm, duration: Number(e.target.value)})}
                                >
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                    <option value={45}>45 minutos</option>
                                    <option value={60}>1 hora</option>
                                    <option value={90}>1.5 hora</option>
                                    <option value={120}>2 horas</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                <Users size={16} className="text-gray-400" />
                                <input 
                                    type="email" 
                                    placeholder="Adicionar convidado (e-mail opcional)" 
                                    className="w-full text-sm text-gray-700 placeholder-gray-400 border-none outline-none focus:ring-0 p-0"
                                    value={eventForm.attendeeEmail}
                                    onChange={e => setEventForm({...eventForm, attendeeEmail: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <LinkIcon size={14} />
                                </div>
                                <span className="text-xs font-semibold text-gray-600">Reunião do Google Meet gerada automaticamente</span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-5 pt-0">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateEvent}
                                disabled={savingEvent}
                                className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                            >
                                {savingEvent ? <Loader2 size={14} className="animate-spin" /> : null}
                                {savingEvent ? 'Salvando...' : 'Salvar no Google'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes e Edição */}
            {selectedEvent && (
                <EventDetailsModal 
                    event={selectedEvent}
                    readOnly={selectedUserId ? selectedUserId !== currentUser?.uid : false}
                    onClose={() => setSelectedEvent(null)}
                    onSave={handleSaveExistingEvent}
                    onDelete={handleDeleteEvent}
                />
            )}
        </div>
    );
};
