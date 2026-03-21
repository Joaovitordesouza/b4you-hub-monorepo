
import React, { useState } from 'react';
import { Launch, LaunchStatus } from '../types';
import { X, MessageSquare, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
    launch: Launch;
    targetStatus: LaunchStatus;
    onClose: () => void;
    onConfirm: (note: string, updatedTests?: Launch['tests']) => void;
}

export const LaunchTransitionGuard: React.FC<Props> = ({ launch, targetStatus, onClose, onConfirm }) => {
    const [note, setNote] = useState('');
    const [tests, setTests] = useState<Launch['tests']>(launch.tests || {
        checkout: false,
        split: false,
        integrations: false,
        webhook: false,
        membersArea: false,
        notifications: false,
        salesPage: false,
        pixel: false
    });

    const isMovingToApprovedOrLive = targetStatus === 'APROVADO' || targetStatus === 'AO_VIVO';
    const allTestsDone = Object.values(tests).every(v => v === true);
    const canConfirm = !isMovingToApprovedOrLive || allTestsDone;

    const toggleTest = (key: keyof Launch['tests']) => {
        setTests(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-black/[0.05] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-black/[0.05] flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <ArrowRight size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transição de Lançamento</h2>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Validação de Segurança</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/[0.05] rounded-xl text-slate-400 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Status Change Indicator */}
                    <div className="flex items-center justify-center gap-6 p-6 bg-black/[0.02] rounded-[24px] border border-black/[0.03]">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status Atual</span>
                            <span className="px-4 py-1.5 bg-white rounded-full border border-black/[0.05] text-xs font-bold text-slate-600 shadow-sm">
                                {launch.status.replace('_', ' ')}
                            </span>
                        </div>
                        <ArrowRight className="text-slate-300" size={20} />
                        <div className="text-center">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Novo Status</span>
                            <span className="px-4 py-1.5 bg-indigo-600 rounded-full text-xs font-bold text-white shadow-lg shadow-indigo-600/20">
                                {targetStatus.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    {/* QA Checklist if moving to Approved/Live */}
                    {isMovingToApprovedOrLive && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2 text-rose-600">
                                <ShieldCheck size={18} />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Checklist de QA Obrigatório</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'checkout', label: 'Checkout' },
                                    { id: 'split', label: 'Split' },
                                    { id: 'integrations', label: 'Integrações' },
                                    { id: 'webhook', label: 'Webhook' },
                                    { id: 'membersArea', label: 'Membros' },
                                    { id: 'notifications', label: 'Notificações' },
                                    { id: 'salesPage', label: 'Páginas' },
                                    { id: 'pixel', label: 'Pixel' },
                                ].map(test => (
                                    <button
                                        key={test.id}
                                        onClick={() => toggleTest(test.id as keyof Launch['tests'])}
                                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${tests[test.id as keyof Launch['tests']] ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-black/[0.05] text-slate-400 hover:border-indigo-200'}`}
                                    >
                                        <span className="text-xs font-bold">{test.label}</span>
                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${tests[test.id as keyof Launch['tests']] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                            <CheckCircle2 size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {!allTestsDone && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                                    <AlertTriangle size={18} />
                                    <p className="text-xs font-bold">Complete todos os testes para aprovar o lançamento.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transition Note */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-900">
                            <MessageSquare size={18} className="text-indigo-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">Nota da Transição</h3>
                        </div>
                        <textarea
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[24px] text-sm font-semibold outline-none focus:bg-white focus:border-indigo-500/30 focus:ring-8 focus:ring-indigo-500/[0.04] transition-all min-h-[120px] placeholder:text-slate-300"
                            placeholder="O que aconteceu nesta fase? Algum ponto de atenção?"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 border-t border-black/[0.05] flex items-center justify-end gap-3 bg-slate-50/50">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all">Cancelar</button>
                    <button 
                        disabled={!canConfirm}
                        onClick={() => onConfirm(note, isMovingToApprovedOrLive ? tests : undefined)}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${canConfirm ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                    >
                        Confirmar Transição
                    </button>
                </div>
            </div>
        </div>
    );
};
