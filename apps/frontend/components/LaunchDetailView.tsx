import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Launch, Producer, Usuario, LaunchStatus, AnaliseIA } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { DatePicker } from './ui/DatePicker';
import { 
    X, Edit2, Save, Rocket, User, Calendar, 
    DollarSign, Briefcase, CheckCircle2, AlertCircle, 
    Clock, TrendingUp, ShieldCheck, FileText,
    ChevronRight, Activity, Target, Zap, Brain,
    Sparkles, MessageSquare, Lightbulb
} from 'lucide-react';

interface LaunchDetailViewProps {
    launch: Launch;
    producers: Producer[];
    users: Usuario[];
    onClose: () => void;
    onSave: (data: Partial<Launch>) => void;
}

const StatusBadge = ({ status }: { status: LaunchStatus }) => {
    const configs: Record<LaunchStatus, { color: string, label: string, icon: any }> = {
        'PRE_LANCAMENTO': { color: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Pré-Lançamento', icon: Clock },
        'EM_TESTE': { color: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Em Teste', icon: Activity },
        'APROVADO': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Aprovado', icon: ShieldCheck },
        'AO_VIVO': { color: 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse', label: 'AO VIVO', icon: Zap },
        'FINALIZADO': { color: 'bg-slate-50 text-slate-600 border-slate-100', label: 'Finalizado', icon: CheckCircle2 },
        'POS_ANALISE': { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Pós-Análise', icon: FileText },
    };

    const config = configs[status] || configs['PRE_LANCAMENTO'];
    const Icon = config.icon;

    return (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${config.color}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
};

const MetricCard = ({ label, value, icon: Icon, color = 'indigo', onDoubleClick }: { label: string, value: string | number, icon: any, color?: string, onDoubleClick?: () => void }) => (
    <div 
        onDoubleClick={onDoubleClick}
        className="bg-white p-5 rounded-2xl border border-black/[0.05] shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
    >
        <div className="flex items-center justify-between mb-3">
            <div className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
            <TrendingUp size={16} className="text-slate-300" />
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-900 tracking-tight">{value}</p>
    </div>
);

const ChecklistItem = ({ label, checked, isEditing, onToggle }: { label: string, checked: boolean, isEditing: boolean, onToggle?: () => void }) => (
    <div 
        onClick={() => isEditing && onToggle?.()}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            checked 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
                : 'bg-slate-50 border-slate-100 text-slate-400'
        } ${isEditing ? 'cursor-pointer hover:border-indigo-200' : ''}`}
    >
        <span className="text-xs font-medium">{label}</span>
        {checked ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-slate-300" />}
    </div>
);

export const LaunchDetailView: React.FC<LaunchDetailViewProps> = ({ launch, producers, users, onClose, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Launch>(launch);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Autosave logic
    useEffect(() => {
        if (JSON.stringify(formData) !== JSON.stringify(launch)) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            
            setIsSaving(true);
            saveTimeoutRef.current = setTimeout(async () => {
                await onSave(formData);
                setIsSaving(false);
            }, 1500); // 1.5s debounce for autosave
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [formData, launch, onSave]);

    const handleChange = (field: keyof Launch, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleToggleTest = (testKey: keyof Launch['tests']) => {
        setFormData(prev => ({
            ...prev,
            tests: { ...prev.tests, [testKey]: !prev.tests[testKey] }
        }));
    };

    const producer = producers.find(p => p.id === formData.producerId);
    const manager = users.find(u => u.id === formData.accountManagerId);

    const completedTests = Object.values(formData.tests).filter(Boolean).length;
    const totalTests = Object.values(formData.tests).length;
    const progress = Math.round((completedTests / totalTests) * 100);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#FBFBFB] rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-white/20"
            >
                {/* Floating Header Toolbar */}
                <div className="sticky top-0 z-10 px-8 py-5 bg-white/80 backdrop-blur-xl border-b border-black/[0.03] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Rocket size={24} />
                        </div>
                        <div onDoubleClick={handleDoubleClick}>
                            {isEditing ? (
                                <input 
                                    autoFocus
                                    value={formData.productName}
                                    onChange={(e) => handleChange('productName', e.target.value)}
                                    className="text-xl font-bold text-slate-900 tracking-tight leading-tight bg-transparent border-b border-indigo-200 focus:outline-none focus:border-indigo-500"
                                />
                            ) : (
                                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-tight cursor-text">
                                    {formData.productName || 'Novo Lançamento'}
                                </h2>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                                <StatusBadge status={formData.status} />
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">ID: {formData.id.slice(0, 8)}</span>
                                {isSaving && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">
                                        <Clock size={10} /> Salvando...
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                            <Sparkles size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Double-click para editar</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <button 
                            onClick={onClose} 
                            className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all active:scale-90"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* Left Column: Main Info & Checklist */}
                        <div className="lg:col-span-8 p-8 space-y-10 border-r border-black/[0.03]">
                            
                            {/* Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard 
                                    label="Objetivo de Receita" 
                                    value={`R$ ${(formData.revenueGoal || 0).toLocaleString('pt-BR')}`} 
                                    icon={Target} 
                                    color="emerald"
                                    onDoubleClick={handleDoubleClick}
                                />
                                <MetricCard 
                                    label="Pico de Vendas" 
                                    value={formData.openDate ? new Date(formData.openDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '---'} 
                                    icon={Calendar} 
                                    color="indigo"
                                    onDoubleClick={handleDoubleClick}
                                />
                                <MetricCard 
                                    label="Ticket Médio" 
                                    value={`R$ ${(formData.estimatedTicket || 0).toLocaleString('pt-BR')}`} 
                                    icon={DollarSign} 
                                    color="blue"
                                    onDoubleClick={handleDoubleClick}
                                />
                            </div>

                            {/* Technical Checklist Section */}
                            <section className="bg-white p-6 rounded-3xl border border-black/[0.03] shadow-sm" onDoubleClick={handleDoubleClick}>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck size={16} className="text-indigo-500" />
                                            Testes Técnicos
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">Verificação obrigatória para aprovação do lançamento</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-bold text-slate-900">{progress}%</span>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concluído</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ChecklistItem label="Checkout & Pagamento" checked={formData.tests.checkout} isEditing={isEditing} onToggle={() => handleToggleTest('checkout')} />
                                    <ChecklistItem label="Split de Comissões" checked={formData.tests.split} isEditing={isEditing} onToggle={() => handleToggleTest('split')} />
                                    <ChecklistItem label="Integrações (CRM/ERP)" checked={formData.tests.integrations} isEditing={isEditing} onToggle={() => handleToggleTest('integrations')} />
                                    <ChecklistItem label="Webhooks & Eventos" checked={formData.tests.webhook} isEditing={isEditing} onToggle={() => handleToggleTest('webhook')} />
                                    <ChecklistItem label="Área de Membros" checked={formData.tests.membersArea} isEditing={isEditing} onToggle={() => handleToggleTest('membersArea')} />
                                    <ChecklistItem label="Notificações (E-mail/Zap)" checked={formData.tests.notifications} isEditing={isEditing} onToggle={() => handleToggleTest('notifications')} />
                                    <ChecklistItem label="Página de Vendas" checked={formData.tests.salesPage} isEditing={isEditing} onToggle={() => handleToggleTest('salesPage')} />
                                    <ChecklistItem label="Pixel & Rastreamento" checked={formData.tests.pixel} isEditing={isEditing} onToggle={() => handleToggleTest('pixel')} />
                                </div>
                            </section>

                            {/* AI Analysis Section */}
                            <section className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Brain size={120} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                            <Sparkles size={20} className="text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest">Análise Estratégica IA</h3>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <textarea 
                                                value={formData.analysis?.resumo || ''}
                                                onChange={(e) => handleChange('analysis', { ...formData.analysis, resumo: e.target.value })}
                                                placeholder="Resumo da análise estratégica..."
                                                className="w-full h-24 bg-white/10 border border-white/20 rounded-2xl p-4 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all"
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Pontos Fortes (separados por vírgula)</p>
                                                    <input 
                                                        value={formData.analysis?.pontos_fortes?.join(', ') || ''}
                                                        onChange={(e) => handleChange('analysis', { ...formData.analysis, pontos_fortes: e.target.value.split(',').map(s => s.trim()) })}
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:outline-none focus:bg-white/20"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Mensagem Personalizada</p>
                                                    <input 
                                                        value={formData.analysis?.mensagem_personalizada || ''}
                                                        onChange={(e) => handleChange('analysis', { ...formData.analysis, mensagem_personalizada: e.target.value })}
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:outline-none focus:bg-white/20"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <p className="text-lg font-medium leading-relaxed italic opacity-90">
                                                "{formData.analysis?.resumo || 'Nenhuma análise estratégica gerada para este lançamento ainda. Clique duas vezes para adicionar insights manuais ou aguarde o processamento do Hunter Agent.'}"
                                            </p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                        <Lightbulb size={12} />
                                                        Insights & Pontos Fortes
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {formData.analysis?.pontos_fortes?.map((ponto, i) => (
                                                            <span key={i} className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                                                                {ponto}
                                                            </span>
                                                        )) || <span className="text-xs opacity-40 italic">Sem pontos mapeados</span>}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                                        <MessageSquare size={12} />
                                                        Pitch de Abordagem
                                                    </div>
                                                    <p className="text-xs leading-relaxed opacity-80">
                                                        {formData.analysis?.mensagem_personalizada || 'Aguardando definição de estratégia de comunicação...'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Timeline & Dates */}
                            <section onDoubleClick={handleDoubleClick}>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-500" />
                                    Cronograma Estratégico
                                </h3>
                                {isEditing ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-3xl border border-black/[0.03]">
                                        <DatePicker label="Abertura de Carrinho" value={formData.openDate} onChange={(value) => handleChange('openDate', value)} />
                                        <DatePicker label="Fechamento" value={formData.closeDate} onChange={(value) => handleChange('closeDate', value)} />
                                        <DatePicker label="Prazo Final Testes" value={formData.testDeadline} onChange={(value) => handleChange('testDeadline', value)} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 bg-white p-4 rounded-2xl border border-black/[0.03] flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abertura</p>
                                                <p className="text-sm font-bold text-slate-900">{formData.openDate ? new Date(formData.openDate).toLocaleDateString('pt-BR') : 'Definir'}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-white p-4 rounded-2xl border border-black/[0.03] flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fechamento</p>
                                                <p className="text-sm font-bold text-slate-900">{formData.closeDate ? new Date(formData.closeDate).toLocaleDateString('pt-BR') : 'Definir'}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-white p-4 rounded-2xl border border-black/[0.03] flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prazo Testes</p>
                                                <p className="text-sm font-bold text-slate-900">{formData.testDeadline ? new Date(formData.testDeadline).toLocaleDateString('pt-BR') : 'Definir'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Quick Notes */}
                            <section onDoubleClick={handleDoubleClick}>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-500" />
                                    Notas Rápidas & Observações
                                </h3>
                                <div className="bg-white rounded-3xl border border-black/[0.03] overflow-hidden shadow-sm">
                                    <textarea 
                                        value={formData.notes || ''}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        placeholder="Adicione observações estratégicas, riscos mapeados ou detalhes do Plano B..."
                                        className="w-full h-32 p-6 text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none resize-none bg-transparent"
                                        readOnly={!isEditing}
                                    />
                                    <div className="px-6 py-3 bg-slate-50 border-t border-black/[0.03] flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Última atualização: {new Date(formData.updatedAt).toLocaleDateString('pt-BR')}</span>
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar (Producer & Manager) */}
                        <div className="lg:col-span-4 bg-slate-50/50 p-8 space-y-8">
                            
                            {/* Producer Info */}
                            <div onDoubleClick={handleDoubleClick}>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Produtor Responsável</h3>
                                <div className="bg-white p-5 rounded-3xl border border-black/[0.03] shadow-sm">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                                            {producer?.foto_url ? (
                                                <img src={producer.foto_url} alt={producer.nome_display} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <User size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-slate-900 leading-tight">{producer?.nome_display || 'Não definido'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">@{producer?.instagram_username || 'sem_instagram'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 pt-4 border-t border-slate-50">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Plataforma</span>
                                            <span className="font-bold text-slate-700">{formData.platform || 'Kiwify'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Tipo</span>
                                            <span className="font-bold text-slate-700">{formData.productType}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Perfil</span>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] uppercase">{formData.producerProfile}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Manager Info */}
                            <div onDoubleClick={handleDoubleClick}>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Gerente de Conta (CS)</h3>
                                <div className="bg-white p-5 rounded-3xl border border-black/[0.03] shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            {manager?.avatar ? (
                                                <img src={manager.avatar} alt={manager.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <Briefcase size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{manager?.nome || 'Sem Gerente'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{manager?.department || 'Time de Sucesso'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategic Flags */}
                            <div className="space-y-3" onDoubleClick={handleDoubleClick}>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Indicadores Estratégicos</h3>
                                <div 
                                    onClick={() => isEditing && handleChange('isStrategicMonth', !formData.isStrategicMonth)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${formData.isStrategicMonth ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-white border-black/[0.03] text-slate-400'} ${isEditing ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <TrendingUp size={18} />
                                        <span className="text-xs font-bold">Mês Estratégico</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isStrategicMonth ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.isStrategicMonth ? 'left-6' : 'left-1'}`} />
                                    </div>
                                </div>
                                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${formData.priority === 'CRITICA' || formData.priority === 'ALTA' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-white border-black/[0.03] text-slate-400'}`}>
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={18} />
                                        <span className="text-xs font-bold">Prioridade {formData.priority}</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </div>
                            </div>

                            {/* Edit Mode Sidebar Fields */}
                            {isEditing && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-4 border-t border-slate-200"
                                >
                                    <Select label="Produtor" value={formData.producerId} options={producers.map(p => ({ value: p.id, label: p.nome_display }))} onChange={(value) => handleChange('producerId', value)} searchable />
                                    <Select label="Gerente CS" value={formData.accountManagerId || ''} options={users.map(u => ({ value: u.id, label: u.nome }))} onChange={(value) => handleChange('accountManagerId', value)} searchable />
                                    <Select label="Prioridade" value={formData.priority} options={['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(p => ({ value: p, label: p }))} onChange={(value) => handleChange('priority', value)} />
                                    <Select label="Status Lançamento" value={formData.status} options={['PRE_LANCAMENTO', 'EM_TESTE', 'APROVADO', 'AO_VIVO', 'FINALIZADO', 'POS_ANALISE'].map(s => ({ value: s, label: s }))} onChange={(value) => handleChange('status', value)} />
                                    
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all"
                                    >
                                        Concluir Edição
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


