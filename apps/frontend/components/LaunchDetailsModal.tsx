
import React, { useState, useEffect } from 'react';
import { Launch, Producer, Usuario } from '../types';
import { 
    X, Rocket, Settings, CheckSquare, AlertCircle, 
    Calendar, DollarSign, Target, Zap, Wrench, 
    Shield, MessageSquare, AlertTriangle, Users,
    Globe, Layout, Share2, MousePointer2, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Toggle } from './ui/Toggle';
import { DatePicker } from './ui/DatePicker';
import { auth, db } from '../firebase';
import { useToast } from '../contexts/ToastContext';

interface Props {
    launch: Partial<Launch> | null;
    producers: Producer[];
    users: Usuario[];
    onClose: () => void;
    onSave: (launch: Partial<Launch>) => void;
}

type Step = 1 | 2 | 3 | 4;

export const LaunchDetailsModal: React.FC<Props> = ({ launch, producers, users, onClose, onSave }) => {
    const { addToast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [formData, setFormData] = useState<Partial<Launch>>(launch || {
        status: 'PRE_LANCAMENTO',
        productType: 'DIGITAL',
        volumeExpectation: 'MEDIO',
        integrations: [],
        funnel: { orderBump: false, upsell: false, downsell: false },
        tests: {
            checkout: false,
            split: false,
            integrations: false,
            webhook: false,
            membersArea: false,
            notifications: false,
            salesPage: false,
            pixel: false
        },
        priority: 'MEDIA',
        accountManagerId: auth.currentUser?.uid
    });

    useEffect(() => {
        if (launch) setFormData(launch);
    }, [launch]);

    const handleSave = () => {
        if (!formData.productName || !formData.producerId || !formData.openDate) {
            addToast({ message: 'Preencha os campos obrigatórios (Produto, Produtor e Data)', type: 'error' });
            return;
        }
        onSave(formData);
    };

    const toggleIntegration = (id: string) => {
        const current = formData.integrations || [];
        if (current.includes(id)) {
            setFormData({ ...formData, integrations: current.filter(i => i !== id) });
        } else {
            setFormData({ ...formData, integrations: [...current, id] });
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4) as Step);
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1) as Step);

    const steps = [
        { id: 1, label: 'Identificação', icon: Users },
        { id: 2, label: 'Estratégia', icon: Target },
        { id: 3, label: 'Engenharia', icon: Settings },
        { id: 4, label: 'Risco', icon: AlertCircle },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Stepper */}
                <div className="px-8 py-6 bg-white/95 backdrop-blur-sm shadow-[0_4px_10px_rgba(0,0,0,0.03)] z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <Rocket size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                                    {launch?.id ? 'Configurar Lançamento' : 'Novo Lançamento'}
                                </h2>
                                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Jornada de Lançamento</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Stepper Visual */}
                    <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
                        <div 
                            className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                        ></div>
                        
                        {steps.map(step => (
                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${currentStep >= step.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-white border-slate-300 text-slate-400'}`}>
                                    <step.icon size={14} />
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${currentStep >= step.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
                    {currentStep === 1 && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Users size={16} className="text-indigo-500" /> Identificação Base
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    <Select
                                        label="Produtor Responsável"
                                        searchable
                                        value={formData.producerId}
                                        onChange={e => setFormData({ ...formData, producerId: e.target.value })}
                                        options={[{ value: '', label: 'Selecionar Produtor...' }, ...producers.map(p => ({ value: p.id, label: p.nome_display }))]}
                                    />

                                    <Input
                                        label="Nome do Produto"
                                        placeholder="Ex: Método 10k em 30 dias"
                                        value={formData.productName}
                                        onChange={e => setFormData({ ...formData, productName: e.target.value })}
                                    />

                                    <Select
                                        label="Gerente de Conta (CS)"
                                        searchable
                                        value={formData.accountManagerId || ''}
                                        onChange={e => setFormData({ ...formData, accountManagerId: e.target.value })}
                                        options={[{ value: '', label: 'Selecionar CS...' }, ...users.map(u => ({ value: u.id, label: u.nome }))]}
                                    />

                                    <div className="grid grid-cols-2 gap-6">
                                        <Select
                                            label="Tipo"
                                            searchable
                                            value={formData.productType}
                                            onChange={e => setFormData({ ...formData, productType: e.target.value as any })}
                                            options={[
                                                { value: 'DIGITAL', label: 'Digital' },
                                                { value: 'FISICO', label: 'Físico' },
                                                { value: 'HIBRIDO', label: 'Híbrido' }
                                            ]}
                                        />
                                        <Input
                                            label="Plataforma"
                                            placeholder="Shopify, Kiwify..."
                                            value={formData.platform}
                                            onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-500" /> Cronograma & Metas
                                </h3>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <DatePicker
                                            label="Abertura"
                                            value={formData.openDate}
                                            onChange={e => setFormData({ ...formData, openDate: e.target.value })}
                                        />
                                        <DatePicker
                                            label="Fechamento"
                                            value={formData.closeDate}
                                            onChange={e => setFormData({ ...formData, closeDate: e.target.value })}
                                        />
                                    </div>

                                    <Input
                                        label="Meta de Faturamento (R$)"
                                        type="number"
                                        placeholder="Ex: 1.000.000"
                                        value={formData.revenueGoal}
                                        onChange={e => setFormData({ ...formData, revenueGoal: Number(e.target.value) })}
                                    />

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Expectativa de Volume</label>
                                        <div className="grid grid-cols-4 gap-3">
                                            {['BAIXO', 'MEDIO', 'ALTO', 'PICO'].map(vol => (
                                                <button
                                                    key={vol}
                                                    onClick={() => setFormData({ ...formData, volumeExpectation: vol as any })}
                                                    className={`py-3 rounded-xl text-[10px] font-bold transition-all border ${formData.volumeExpectation === vol ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
                                                >
                                                    {vol}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Zap size={16} className="text-amber-500" /> Oferta & Engenharia
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <Toggle 
                                        enabled={!!formData.hasDiscount} 
                                        onChange={() => setFormData({ ...formData, hasDiscount: !formData.hasDiscount })}
                                        label="Haverá Desconto?"
                                        sublabel="Percentual ou valor fixo"
                                    />

                                    {formData.hasDiscount && (
                                        <Input
                                            placeholder="Detalhes do desconto (ex: 20% OFF)"
                                            value={formData.discountDetails}
                                            onChange={e => setFormData({ ...formData, discountDetails: e.target.value })}
                                            className="animate-in slide-in-from-top-2 duration-300"
                                        />
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <Toggle 
                                            enabled={!!formData.hasCoupon} 
                                            onChange={() => setFormData({ ...formData, hasCoupon: !formData.hasCoupon })}
                                            label="Cupom?"
                                        />
                                        <Toggle 
                                            enabled={!!formData.priceChange} 
                                            onChange={() => setFormData({ ...formData, priceChange: !formData.priceChange })}
                                            label="Mudar Preço?"
                                        />
                                    </div>
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 pt-4">
                                    <Share2 size={16} className="text-indigo-500" /> Funil & Integrações
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {['orderBump', 'upsell', 'downsell'].map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setFormData({ ...formData, funnel: { ...formData.funnel!, [key]: !formData.funnel![key as keyof Launch['funnel']] } })}
                                            className={`py-3 rounded-xl text-[10px] font-bold transition-all border ${formData.funnel?.[key as keyof Launch['funnel']] ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
                                        >
                                            {key.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    {['Shopify', 'ERP', 'Shopee', 'Área de Membros', 'API Externa', 'ActiveCampaign', 'Hotmart', 'Eduzz'].map(int => (
                                        <button
                                            key={int}
                                            onClick={() => toggleIntegration(int)}
                                            className={`px-5 py-4 rounded-2xl text-xs font-semibold text-left transition-all border flex items-center justify-between ${formData.integrations?.includes(int) ? 'bg-white text-indigo-700 border-indigo-300 shadow-sm' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
                                        >
                                            {int}
                                            {formData.integrations?.includes(int) && <CheckSquare size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <MessageSquare size={16} className="text-indigo-500" /> Log & Risco
                                </h3>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input
                                            label="Quem avisou?"
                                            placeholder="Ex: Produtor / CS João"
                                            value={formData.notifiedBy}
                                            onChange={e => setFormData({ ...formData, notifiedBy: e.target.value })}
                                        />
                                        <DatePicker
                                            label="Data do Aviso"
                                            value={formData.notifiedAt}
                                            onChange={e => setFormData({ ...formData, notifiedAt: e.target.value })}
                                        />
                                    </div>

                                    <Toggle 
                                        enabled={!!formData.techNotified} 
                                        onChange={() => setFormData({ ...formData, techNotified: !formData.techNotified })}
                                        label="Tech já foi notificada?"
                                    />

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Risco Mapeado</label>
                                        <textarea 
                                            className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/[0.06] transition-all min-h-[100px]"
                                            placeholder="Descreva possíveis gargalos..."
                                            value={formData.riskMapped}
                                            onChange={e => setFormData({ ...formData, riskMapped: e.target.value })}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Prioridade</label>
                                        <div className="flex gap-2">
                                            {['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setFormData({ ...formData, priority: p as any })}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all border ${formData.priority === p ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-10 py-6 flex items-center justify-between bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10">
                    <button 
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <ChevronLeft size={18} /> Voltar
                    </button>
                    
                    <div className="flex items-center gap-3">
                        {currentStep < 4 ? (
                            <button 
                                onClick={nextStep}
                                className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-95"
                            >
                                Continuar <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSave}
                                className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                            >
                                Finalizar Cadastro
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
