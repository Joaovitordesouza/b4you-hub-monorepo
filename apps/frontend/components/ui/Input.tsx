import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>}
      <input
        {...props}
        className={`w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-semibold outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/[0.06] transition-all ${className}`}
      />
    </div>
  );
};
