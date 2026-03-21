import React, { useState } from 'react';
import { Producer } from '../types';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, ChevronDown, User } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';

interface Props {
    producer: Producer;
    onClose: () => void;
    onConfirm: (data: { scheduleAt: string }) => void;
}

export const OnboardingRequestModal: React.FC<Props> = ({ producer, onClose, onConfirm }) => {
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleConfirm = () => {
        if (!scheduleDateTime) return;
        onConfirm({ scheduleAt: new Date(scheduleDateTime).toISOString() });
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md font-sans">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 relative">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-900">Agendar Onboarding</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                
                <div className="space-y-6">
                    <p className="text-sm text-slate-600">
                        Agende a call de onboarding para o produtor <strong>{producer.nome_display}</strong>.
                    </p>

                    <div className="relative">
                        <button 
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                            className={`w-full flex items-center justify-between p-4 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${scheduleDateTime ? 'border-brand-500 bg-white text-brand-950' : 'bg-white text-slate-500'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Calendar size={16} />
                                <span>
                                    {scheduleDateTime && !isNaN(new Date(scheduleDateTime).getTime()) 
                                        ? new Date(scheduleDateTime).toLocaleString('pt-BR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}).replace(',', ' às') 
                                        : 'Definir Data e Hora'}
                                </span>
                            </div>
                            <ChevronDown size={16} className={`transition-transform ${isDatePickerOpen ? 'rotate-180' : ''}`}/>
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

                <div className="mt-8 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!scheduleDateTime}
                        className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
