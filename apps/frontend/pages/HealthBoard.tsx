
import React, { useMemo, useState, useEffect } from 'react';
import { Producer, HealthStatus, Usuario } from '../types';
import { HeartPulse, AlertTriangle, TrendingUp, XCircle, DollarSign, ArrowRight, MoreHorizontal, MessageSquare, Briefcase, Activity, ShieldCheck, PieChart, Users } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db, fieldValue, auth } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { Client360Modal } from '../components/Client360Modal';

interface Props {
    producers: Producer[];
}

const HEALTH_COLUMNS: { id: HealthStatus; label: string; color: string; bg: string; icon: any; border: string, accent: string }[] = [
    { id: 'SAUDAVEL', label: 'Saudável', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: HeartPulse, border: 'border-emerald-200', accent: 'bg-emerald-500' },
    { id: 'ATENCAO', label: 'Em Atenção', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle, border: 'border-amber-200', accent: 'bg-amber-500' },
    { id: 'RISCO', label: 'Risco de Churn', color: 'text-orange-700', bg: 'bg-orange-50', icon: TrendingUp, border: 'border-orange-200', accent: 'bg-orange-500' },
    { id: 'CHURN', label: 'Churn Confirmado', color: 'text-rose-700', bg: 'bg-rose-50', icon: XCircle, border: 'border-rose-200', accent: 'bg-rose-500' },
];

export const HealthBoard: React.FC<Props> = ({ producers }) => {
    const { addToast } = useToast();
    const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
    const [teamMembers, setTeamMembers] = useState<Usuario[]>([]);

    // Carrega membros da equipe para o modal
    useEffect(() => {
        const unsub = db.collection('users').onSnapshot(snap => {
            setTeamMembers(snap.docs.map(d => ({id: d.id, ...d.data()} as Usuario)));
        });
        return () => unsub();
    }, []);

    // Agrupa produtores por status de saúde
    const groupedProducers = useMemo(() => {
        const groups: Record<HealthStatus, Producer[]> = {
            'SAUDAVEL': [],
            'ATENCAO': [],
            'RISCO': [],
            'CHURN': []
        };
        
        producers.forEach(p => {
            const status = p.stats_financeiros?.status_health || 'SAUDAVEL';
            if (groups[status]) groups[status].push(p);
        });
        
        return groups;
    }, [producers]);

    // Métricas do Header
    const metrics = useMemo(() => {
        const totalMRR = producers.reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0);
        const riskMRR = groupedProducers['RISCO'].reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0) + 
                        groupedProducers['ATENCAO'].reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0);
        const healthyCount = groupedProducers['SAUDAVEL'].length;
        const totalCount = producers.length || 1;
        const healthyPercentage = Math.round((healthyCount / totalCount) * 100);

        return { totalMRR, riskMRR, healthyPercentage };
    }, [producers, groupedProducers]);

    const sendToTracking = async (e: React.MouseEvent, producer: Producer) => {
        e.stopPropagation();
        if (producer.tracking_status) {
            addToast({ type: 'info', message: 'Cliente já está em acompanhamento.' });
            return;
        }

        try {
            await db.collection('producers').doc(producer.id).update({
                tracking_status: 'PRECISA_CONTATO',
                lastContactAt: new Date().toISOString(),
                updatedAt: fieldValue.serverTimestamp()
            });
            
            await db.collection('producers').doc(producer.id).collection('timeline').add({
                type: 'SYSTEM_LOG',
                content: 'Enviado manualmente para Acompanhamento via Painel de Saúde',
                timestamp: Date.now(),
                authorName: auth.currentUser?.displayName || 'Admin',
                authorId: auth.currentUser?.uid,
                category: 'SYSTEM'
            });

            addToast({ type: 'success', message: 'Enviado para Acompanhamento!' });
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao mover cliente.' });
        }
    };

    const handleOpenChat = (e: React.MouseEvent, producer: Producer) => {
        e.stopPropagation();
        if (!producer.whatsapp_contato) {
            addToast({ type: 'error', message: 'Cliente sem WhatsApp cadastrado.' });
            return;
        }
        const cleanPhone = producer.whatsapp_contato.replace(/\D/g, '');
        const jid = cleanPhone.length < 12 ? `55${cleanPhone}` : cleanPhone;
        window.location.hash = `#/inbox?chatId=${jid}@s.whatsapp.net`;
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col font-sans">
            {selectedProducer && (
                <Client360Modal 
                    producer={selectedProducer} 
                    teamMembers={teamMembers} 
                    onClose={() => setSelectedProducer(null)}
                />
            )}
            
            {/* Header Executivo */}
            <div className="mb-8 px-2 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                            <Activity size={12}/> Gestão Financeira
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-[#111827] tracking-tight flex items-center gap-3">
                        Saúde da Carteira
                    </h1>
                    <p className="text-[#6B7280] font-medium mt-1">Monitoramento de risco e retenção baseado em faturamento.</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm min-w-[140px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={10}/> MRR Total</p>
                        <p className="text-2xl font-black text-gray-900">R$ {(metrics.totalMRR / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}k</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm min-w-[140px]">
                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle size={10}/> Em Risco</p>
                        <p className="text-2xl font-black text-orange-600">R$ {(metrics.riskMRR / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}k</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm min-w-[140px]">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldCheck size={10}/> Saudável</p>
                        <p className="text-2xl font-black text-emerald-600">{metrics.healthyPercentage}%</p>
                    </div>
                </div>
            </div>

            {/* Kanban Scrollable */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-6 px-2 custom-scrollbar">
                <div className="h-full flex space-x-6 min-w-[1400px]">
                    {HEALTH_COLUMNS.map(col => {
                        const items = groupedProducers[col.id];
                        const totalMRR = items.reduce((acc, p) => acc + (p.stats_financeiros?.faturamento_mes || 0), 0);

                        return (
                            <div key={col.id} className="w-[340px] flex-shrink-0 flex flex-col bg-[#F9FAFB] rounded-[1.5rem] border border-[#E5E7EB]">
                                <div className={`p-5 border-b border-[#E5E7EB] bg-white rounded-t-[1.5rem] sticky top-0 z-10`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${col.bg} ${col.color} border ${col.border}`}>
                                                <col.icon size={18} strokeWidth={2.5}/>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-base">{col.label}</h3>
                                        </div>
                                        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-lg font-black border border-gray-200">
                                            {items.length}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${col.accent} w-full opacity-80`}></div>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MRR Acumulado</span>
                                        <span className="text-sm font-black text-gray-900">R$ {(totalMRR / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}k</span>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar bg-gray-50/50 rounded-b-[1.5rem]">
                                    {items.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => setSelectedProducer(p)}
                                            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] transition-all group relative overflow-hidden hover:border-brand-300 cursor-pointer"
                                        >
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${col.accent}`}></div>

                                            {/* Tag de Tracking Ativo */}
                                            {p.tracking_status && (
                                                <div className="absolute top-0 right-0 bg-blue-50 text-blue-700 border-l border-b border-blue-100 text-[8px] font-black px-2 py-1 rounded-bl-lg z-10 shadow-sm">
                                                    EM ACOMPANHAMENTO
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 mb-4 pl-2">
                                                <Avatar src={p.foto_url} name={p.nome_display} alt="" className="w-10 h-10 rounded-xl border border-gray-100 shadow-sm object-cover"/>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-700 transition-colors">{p.nome_display}</h4>
                                                    <p className="text-[10px] text-gray-500 truncate font-medium flex items-center gap-1 mt-0.5">
                                                        <Briefcase size={10} /> {p.produto_principal}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4 ml-2">
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase font-black mb-0.5 tracking-wider">MRR Mensal</p>
                                                    <p className="text-sm font-black text-gray-900">R$ {(p.stats_financeiros?.faturamento_mes || 0).toLocaleString('pt-BR', { notation: 'compact' })}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] text-gray-400 uppercase font-black mb-0.5 tracking-wider">Health Score</p>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <div className={`w-2 h-2 rounded-full ${col.accent}`}></div>
                                                        <span className="text-sm font-black text-gray-700">{p.stats_financeiros?.health_score}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ações Rápidas (Hover) */}
                                            <div className="flex gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                {!p.tracking_status ? (
                                                    <button 
                                                        onClick={(e) => sendToTracking(e, p)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-900 text-white text-[10px] font-bold hover:bg-black transition-all shadow-sm"
                                                    >
                                                        <ArrowRight size={12} /> Iniciar Tratativa
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 rounded-lg border border-gray-100 cursor-not-allowed">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> Em tratativa
                                                    </div>
                                                )}
                                                
                                                <button 
                                                    onClick={(e) => handleOpenChat(e, p)}
                                                    className="p-2 bg-white border border-gray-200 hover:border-green-300 hover:text-green-600 hover:bg-green-50 rounded-lg text-gray-400 transition-all shadow-sm"
                                                    title="Abrir Chat"
                                                >
                                                    <MessageSquare size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
