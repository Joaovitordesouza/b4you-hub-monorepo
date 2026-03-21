import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Check, Calendar } from 'lucide-react';

interface DateTimePickerProps {
    selectedDateTime: string;
    onChange: (dateTime: string) => void;
    onClose: () => void;
    showTime?: boolean;
    align?: 'left' | 'right';
}

export const DateTimePicker = ({ selectedDateTime, onChange, onClose, showTime = true, align = 'left' }: DateTimePickerProps) => {
    // Ensure we have a valid date object to start with
    const getInitialDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const initialDate = getInitialDate(selectedDateTime);
    const [viewDate, setViewDate] = useState(initialDate);
    
    // Initialize selectedDateStr safely
    const [selectedDateStr, setSelectedDateStr] = useState(() => {
        if (!selectedDateTime) return '';
        const d = new Date(selectedDateTime);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
    });
    
    const snapMinutes = (mins: number) => {
        if (isNaN(mins)) return '00';
        if (mins < 15) return '00';
        if (mins < 30) return '15';
        if (mins < 45) return '30';
        return '45';
    };

    const [hours, setHours] = useState(() => {
        if (!selectedDateTime) return '09';
        const d = new Date(selectedDateTime);
        return isNaN(d.getTime()) ? '09' : d.getHours().toString().padStart(2, '0');
    });

    const [minutes, setMinutes] = useState(() => {
        if (!selectedDateTime) return '00';
        const d = new Date(selectedDateTime);
        return isNaN(d.getTime()) ? '00' : snapMinutes(d.getMinutes());
    });
    
    const [isHourOpen, setIsHourOpen] = useState(false);
    const [isMinuteOpen, setIsMinuteOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = () => {
            setIsHourOpen(false);
            setIsMinuteOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay, year, month };
    };

    const { days, firstDay, year, month } = getDaysInMonth(viewDate);

    const handleDateClick = (day: number) => {
        const d = new Date(year, month, day);
        const isoDate = d.toLocaleDateString('en-CA');
        setSelectedDateStr(isoDate);
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const handleConfirm = () => {
        if (!selectedDateStr) return;
        
        if (showTime) {
            // Ensure hours/minutes are valid strings
            const h = hours || '09';
            const m = minutes || '00';
            const finalDateTime = `${selectedDateStr}T${h}:${m}:00`;
            onChange(finalDateTime);
        } else {
            onChange(selectedDateStr);
        }
        onClose();
    };

    return (
        <div 
            className={`absolute top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-300 p-4 z-50 w-72 animate-in fade-in zoom-in-95 ring-1 ring-black/5 ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`} 
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-4 px-1">
                <button onClick={(e) => { e.stopPropagation(); changeMonth(-1); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={16}/></button>
                <span className="text-sm font-bold text-gray-800 capitalize">{monthNames[month]} {year}</span>
                <button onClick={(e) => { e.stopPropagation(); changeMonth(1); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-[10px] font-bold text-gray-400 text-center uppercase">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                    const day = i + 1;
                    const currentDateStr = new Date(year, month, day).toLocaleDateString('en-CA');
                    const isSelected = selectedDateStr === currentDateStr;
                    const isToday = new Date().toLocaleDateString('en-CA') === currentDateStr;

                    return (
                        <button 
                            key={day} 
                            onClick={(e) => { e.stopPropagation(); handleDateClick(day); }}
                            className={`
                                h-8 w-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                                ${isSelected ? 'bg-amber-500 text-white shadow-md' : isToday ? 'bg-amber-50 text-amber-600 font-bold' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                {showTime && (
                    <div className="flex items-center justify-center gap-1 bg-gray-50 p-2 rounded-xl border border-gray-200 flex-1 relative">
                        <Clock size={14} className="text-gray-400 absolute left-2"/>
                        
                        <div className="flex items-center gap-1 ml-4">
                            <div className="relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsHourOpen(!isHourOpen); setIsMinuteOpen(false); }}
                                    className="appearance-none bg-transparent font-bold text-gray-900 text-sm p-1 outline-none cursor-pointer text-center w-8 hover:bg-gray-200 rounded transition-colors"
                                >
                                    {hours}
                                </button>
                                {isHourOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-100 shadow-xl rounded-xl w-[140px] h-48 overflow-y-auto custom-scrollbar z-[60] grid grid-cols-4 gap-1 p-2 animate-in fade-in zoom-in-95 origin-bottom" onMouseDown={e => e.stopPropagation()}>
                                        {Array.from({length: 24}).map((_, i) => {
                                            const val = i.toString().padStart(2, '0');
                                            return (
                                                <button 
                                                    key={i} 
                                                    onClick={(e) => { e.stopPropagation(); setHours(val); setIsHourOpen(false); }}
                                                    className={`p-1.5 text-xs font-bold rounded-md transition-colors ${hours === val ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    {val}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            <span className="text-gray-400 font-bold">:</span>
                            
                            <div className="relative">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMinuteOpen(!isMinuteOpen); setIsHourOpen(false); }}
                                    className="appearance-none bg-transparent font-bold text-gray-900 text-sm p-1 outline-none cursor-pointer text-center w-8 hover:bg-gray-200 rounded transition-colors"
                                >
                                    {minutes}
                                </button>
                                {isMinuteOpen && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-100 shadow-xl rounded-xl w-16 overflow-y-auto z-[60] flex flex-col gap-1 p-2 animate-in fade-in zoom-in-95 origin-bottom" onMouseDown={e => e.stopPropagation()}>
                                        {['00', '15', '30', '45'].map(m => (
                                            <button 
                                                key={m} 
                                                onClick={(e) => { e.stopPropagation(); setMinutes(m); setIsMinuteOpen(false); }}
                                                className={`p-1.5 text-xs font-bold rounded-md transition-colors ${minutes === m ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                    disabled={!selectedDateStr}
                    className={`p-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors disabled:opacity-50 ${!showTime ? 'w-full' : ''}`}
                >
                    <Check size={16}/>
                </button>
            </div>
        </div>
    );
};
