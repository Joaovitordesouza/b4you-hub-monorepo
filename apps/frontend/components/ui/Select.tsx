import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  searchable?: boolean;
  renderOption?: (option: { value: string; label: string }) => React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, options, value, onChange, className = '', searchable = false, renderOption }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-semibold cursor-pointer flex items-center justify-between transition-all hover:border-indigo-500/50 ${isOpen ? 'border-indigo-500/50 ring-4 ring-indigo-500/[0.06]' : ''} ${className}`}
      >
        <span className={selectedOption ? 'text-slate-900' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : 'Selecionar...'}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-300 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
          {searchable && (
            <div className="px-2 pb-2">
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500/50"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          {filteredOptions.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onChange({ target: { value: option.value } });
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`px-5 py-3 text-sm font-semibold cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${value === option.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'}`}
            >
              {renderOption ? renderOption(option) : option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
