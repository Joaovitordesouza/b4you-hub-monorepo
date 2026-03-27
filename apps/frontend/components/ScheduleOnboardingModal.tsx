import React, { useState } from 'react';
import { Producer } from '../types';
import { X, Calendar, Send, Copy, AlertTriangle, Link, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useToast } from '../contexts/ToastContext';
import { functions } from '../firebase';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
    producer: Producer;
    onClose: () => void;
}

export const ScheduleOnboardingModal: React.FC<Props> = ({ producer, onClose }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    
    const [actionType, setActionType] = useState<'link' | 'instant'>('link');
    const [saving, setSaving] = useState(false);
    
    // For manual scheduling
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState<string>('14:00');
    
    const schedulingLink = `https://crm.b4you.hub/#/schedule/${currentUser?.id}?producerId=${producer.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`Olá ${producer.nome_display}, tudo bem?\n\nSou ${currentUser?.nome} e serei seu CSM na B4You!\nPara iniciarmos seu setup, por favor escolha um horário na minha agenda: ${schedulingLink}`);
        addToast({ type: 'success', message: 'Mensagem com link copiada para a área de transferência!' });
    };

    const handleSendEmail = () => {
        window.open(`mailto:${producer.email_contato}?subject=Vamos iniciar seu Onboarding na B4You!&body=Olá ${producer.nome_display}, tudo bem? Sou ${currentUser?.nome} e serei seu CSM na B4You! Para iniciarmos seu setup, por favor escolha um horário na minha agenda: ${schedulingLink}`);
    };

    const handleWhatsApp = () => {
        const phone = producer.whatsapp_contato?.replace(/\D/g, '') || '';
        if (!phone) {
            addToast({ type: 'error', message: 'Cliente não possui telefone cadastrado.' });
            return;
        }
        window.open(`https://wa.me/55${phone}?text=Olá ${producer.nome_display}, tudo bem? Sou ${currentUser?.nome} e serei seu CSM na B4You! Para iniciarmos seu setup, por favor escolha um horário na minha agenda: ${schedulingLink}`);
    };

    const handleInstantSchedule = async () => {
        setSaving(true);
        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const baseDate = new Date(`${selectedDate}T00:00:00`);
            const startDateTime = setMinutes(setHours(baseDate, hours), minutes);
            const endDateTime = addMinutes(startDateTime, 45); // 45 min default for kick-off

            const manageEvent = functions.httpsCallable('manageEvent');
            await manageEvent({
                action: 'create',
                eventData: {
                    summary: `Kick-off Onboarding: ${producer.nome_display}`,
                    description: `Reunião automática gerada pelo B4You Hub CRM.\nCliente: ${producer.email_contato}`,
                    start: { dateTime: startDateTime.toISOString() },
                    end: { dateTime: endDateTime.toISOString() },
                    attendees: producer.email_contato ? [{ email: producer.email_contato }] : [],
                    conferenceData: {
                        createRequest: { requestId: `b4you-onb-${producer.id}-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
                    }
                }
            });

            // Opcional: registrar em Firestore collection 'meetings' para visualização no card
            const { db, fieldValue } = await import('../firebase');
            await db.collection('meetings').add({
                producerId: producer.id,
                csId: currentUser?.id,
                startTime: startDateTime,
                endTime: endDateTime,
                status: 'scheduled',
                createdAt: fieldValue.serverTimestamp()
            });

            addToast({ type: 'success', message: 'Reunião de Kick-off agendada com sucesso!' });
            onClose();
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao agendar reunião. Verifique a integração na sua agenda.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-0 relative overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-brand-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-none">Agendar Kick-off</h2>
                            <p className="text-xs text-brand-600 mt-1 font-bold">{producer.nome_display}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-brand-100 rounded-full text-brand-700 transition-colors"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-600 font-medium">Você moveu este cliente para a etapa de Setup. Deseja agendar a Call de Kick-off agora?</p>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setActionType('link')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center ${actionType === 'link' ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <Link size={24} className={actionType === 'link' ? 'text-brand-600' : 'text-gray-400'}/>
                            <div>
                                <h4 className={`text-sm font-bold ${actionType === 'link' ? 'text-brand-900' : 'text-gray-700'}`}>Enviar Convite</h4>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">Cliente escolhe o horário</p>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setActionType('instant')}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 text-center ${actionType === 'instant' ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                            <Clock size={24} className={actionType === 'instant' ? 'text-brand-600' : 'text-gray-400'}/>
                            <div>
                                <h4 className={`text-sm font-bold ${actionType === 'instant' ? 'text-brand-900' : 'text-gray-700'}`}>Agendar Agora</h4>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">Você impõe o horário</p>
                            </div>
                        </button>
                    </div>

                    {actionType === 'link' && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 animate-in slide-in-from-bottom-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Seu Link Público</label>
                            <div className="flex items-center gap-2 bg-white p-2 border border-gray-200 rounded-lg">
                                <input type="text" readOnly value={schedulingLink} className="flex-1 bg-transparent text-xs text-gray-600 outline-none truncate" />
                                <button onClick={handleCopyLink} className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"><Copy size={14}/></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSendEmail} className="flex-1 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Via E-mail</button>
                                <button onClick={handleWhatsApp} className="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">Via WhatsApp</button>
                            </div>
                        </div>
                    )}

                    {actionType === 'instant' && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Data</label>
                                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-brand-500"/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Horário</label>
                                    <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-brand-500"/>
                                </div>
                            </div>
                            <button 
                                onClick={handleInstantSchedule}
                                disabled={saving}
                                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold shadow-md hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                                {saving ? 'Agendando...' : 'Confirmar no Google Calendar'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
