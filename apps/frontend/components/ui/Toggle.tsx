import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
  label: string;
  sublabel?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label, sublabel }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-black/[0.03] hover:bg-white hover:border-indigo-500/20 transition-all group">
    <div>
      <p className="text-xs font-bold text-slate-900">{label}</p>
      {sublabel && <p className="text-[10px] text-slate-400 font-medium">{sublabel}</p>}
    </div>
    <button 
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all duration-300 relative ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${enabled ? 'left-6' : 'left-1'}`}></div>
    </button>
  </div>
);
