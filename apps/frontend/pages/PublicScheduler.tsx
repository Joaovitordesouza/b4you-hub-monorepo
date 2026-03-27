import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { functions, db } from '../firebase';
import { 
    Calendar as CalendarIcon, Clock, CheckCircle2, 
    ChevronLeft, ChevronRight, Globe, ShieldCheck,
    Loader2, AlertCircle, Video, Sparkles
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { format, addDays, startOfDay, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PublicScheduler: React.FC = () => {
    const { csId } = useParams<{ csId: string }>();
    const [searchParams] = useSearchParams();
    const producerId = searchParams.get('producerId');
    const { addToast } = useToast();
    
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [slots, setSlots] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
    const [success, setSuccess] = useState(false);
    const [csName, setCsName] = useState('Consultor B4You');
    const [csAvatar, setCsAvatar] = useState('');

    useEffect(() => {
        if (!csId) return;

        const fetchData = async () => {
            try {
                const userDoc = await db.collection('users').doc(csId).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    setCsName(data?.nome || 'Consultor B4You');
                    setCsAvatar(data?.avatar || '');
                }

                const getSlots = functions.httpsCallable('getAvailableSlots');
                const { data } = await getSlots({ csId });
                setSlots(data);
            } catch (e) {
                console.error(e);
                addToast({ type: 'error', message: 'Erro ao carregar horários disponíveis.' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [csId]);

    const filteredSlots = slots.filter(slot => isSameDay(parseISO(slot.start), selectedDate));

    const handleBook = async () => {
        if (!selectedSlot || !producerId || !csId) {
            addToast({ type: 'info', message: 'Selecione um horário validamente.' });
            return;
        }

        setBooking(true);
        try {
            const book = functions.httpsCallable('bookMeeting');
            await book({
                producerId,
                csId,
                startTime: selectedSlot.start,
                endTime: selectedSlot.end,
                title: `Onboarding Call - B4You Hub`,
                description: `Chamada de alinhamento técnico inicial.`
            });
            setSuccess(true);
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', message: 'Erro ao realizar o agendamento.' });
        } finally {
            setBooking(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 space-y-4">
                <Loader2 className="animate-spin text-brand-600 space-y-4" size={32} />
                <p className="font-semibold text-gray-500 text-sm tracking-wide">Preparando agenda...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center max-w-sm w-full animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Tudo Certo!</h1>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Imersão técnica agendada. O link do Google Meet foi enviado para o seu e-mail.
                    </p>
                    
                    <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                            <Video size={20} className="text-brand-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1 flex items-center gap-1">Confirmado</p>
                            <p className="font-semibold text-gray-900 text-sm">{format(parseISO(selectedSlot.start), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
                        </div>
                    </div>
                    
                    <button onClick={() => window.close()} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-black transition-all">
                        Fechar Janela
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-8 flex justify-center items-start">
            
            <div className="w-full max-w-[900px] flex flex-col md:flex-row bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                
                {/* Painel Esquerdo: Info da Reunião */}
                <div className="w-full md:w-[320px] bg-gray-50/50 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 relative">
                    <div className="mb-8">
                        {csAvatar ? (
                            <img src={csAvatar} alt={csName} className="w-16 h-16 object-cover rounded-2xl shadow-sm mb-4" />
                        ) : (
                            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                <CalendarIcon size={24} />
                            </div>
                        )}
                        <p className="text-gray-500 font-semibold text-xs tracking-wide uppercase mb-1">Com {csName}</p>
                        <h1 className="text-2xl font-bold text-gray-900 leading-snug">Imersão de Onboarding</h1>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                            <Clock size={18} className="text-gray-400" />
                            Sessão de 45 min
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                            <Video size={18} className="text-gray-400" />
                            Google Meet
                        </div>
                        <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                            <Globe size={18} className="text-gray-400" />
                            Horário de Brasília
                        </div>
                    </div>

                    <div className="mt-auto">
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            Alinhe sua estratégia técnica com o nosso time de CS para explorar todo o potencial da plataforma B4You Hub.
                        </p>
                    </div>
                </div>

                {/* Painel Direito: Calendário e Horários */}
                <div className="flex-1 p-6 md:p-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Selecione data e hora</h2>

                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* Calendário (Esquerda) */}
                        <div className="w-full lg:w-[300px] shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-semibold text-gray-900 capitalize">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setSelectedDate(d => addDays(d, -1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={20}/></button>
                                    <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight size={20}/></button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={i} className="text-[10px] font-bold text-gray-400 uppercase">{d}</span>)}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1">
                                {[...Array(21)].map((_, i) => {
                                    const d = addDays(startOfDay(new Date()), i);
                                    const isActive = isSameDay(d, selectedDate);
                                    const hasSlots = slots.some(s => isSameDay(parseISO(s.start), d));
                                    
                                    return (
                                        <button 
                                            key={i}
                                            onClick={() => hasSlots && setSelectedDate(d)}
                                            disabled={!hasSlots}
                                            className={`
                                                w-9 h-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all relative
                                                ${isActive ? 'bg-brand-600 text-white shadow-md' : 
                                                  hasSlots ? 'bg-transparent text-gray-700 hover:bg-brand-50 hover:text-brand-700' : 
                                                  'text-gray-300 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <span className="relative z-10">{d.getDate()}</span>
                                            {hasSlots && !isActive && <span className="absolute bottom-1 w-1 h-1 bg-brand-300 rounded-full"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Lista de Slots (Direita) */}
                        <div className="flex-1 flex flex-col min-h-[300px]">
                            <h3 className="text-xs font-semibold text-gray-500 mb-4">
                                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 max-h-[320px] custom-scrollbar">
                                {filteredSlots.length > 0 ? filteredSlots.map((slot, i) => {
                                    const isSelected = selectedSlot?.start === slot.start;
                                    return (
                                        <div key={i} className="flex gap-2">
                                            <button 
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`
                                                    flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border
                                                    ${isSelected
                                                        ? 'bg-gray-800 border-gray-800 text-white' 
                                                        : 'bg-white border-brand-200 text-brand-700 hover:border-brand-600'
                                                    }
                                                `}
                                            >
                                                {format(parseISO(slot.start), 'HH:mm')}
                                            </button>
                                            
                                            {isSelected && (
                                                <button 
                                                    onClick={handleBook}
                                                    disabled={booking}
                                                    className="w-[120px] bg-brand-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-brand-700 transition-colors animate-in slide-in-from-right-2 duration-200"
                                                >
                                                    {booking ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar'}
                                                </button>
                                            )}
                                        </div>
                                    )
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                                        <AlertCircle size={24} className="text-gray-300 mb-3" />
                                        <p className="text-sm font-medium text-gray-500">Nenhum horário livre.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rodapé Confiança */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-6 opacity-60">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    <ShieldCheck size={14} /> Integração Segura
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                    <CheckCircle2 size={14} /> Powered by B4You
                </span>
            </div>
            
        </div>
    );
};
