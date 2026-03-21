import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <div 
        className={`w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-between transition-all hover:border-indigo-500/50 ${isOpen ? 'border-indigo-500/50 ring-4 ring-indigo-500/[0.06]' : ''} ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value ? new Date(value).toLocaleDateString('pt-BR') : 'DD/MM/AAAA'}
        </span>
        <Calendar size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-300 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
          <input
            type="date"
            value={value}
            onChange={(e) => {
              onChange(e);
              setIsOpen(false);
            }}
            className="w-full p-2 border-0 outline-none text-sm font-semibold text-slate-900 bg-white rounded-xl focus:ring-0"
            autoFocus
          />
        </div>
      )}
    </div>
  );
};
