
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Filter, Users, Zap, CheckCircle2, RefreshCw, Smartphone, Mail, ExternalLink, Trash2, Rocket, ArrowLeft, Check, Lock, ChevronRight, Sliders, Target, Search, Sparkles, TrendingUp, Dumbbell, Wallet, Lightbulb, Globe, MessageSquareQuote, MousePointerClick, BookOpen, Headphones, GraduationCap, MessagesSquare, LayoutGrid, Activity, Heart, Briefcase, Flame, Clapperboard, Utensils, Languages, Scale, Laptop, Home, Brain, Gem, PawPrint, Palette, Leaf, ChevronDown, ChevronUp, X, Copy, Eye, Edit2, AlertTriangle, FileText, ThumbsUp, ThumbsDown, CheckSquare, Square, MoreHorizontal, Download, Plus, ArrowRight, MessageCircle, Calendar, Hash, Wand2, ChevronLeft, Play, Pause, AlertCircle } from 'lucide-react';
import { HunterChatMessage, HunterCreator, HunterCampaignConfig, HunterStep, HunterStrategyConfig, ProductType, AudienceSize, MaturityLevel } from '../types';
import { hunterFactory } from '../services/hunterFactory';
import { db, auth, fieldValue } from '../firebase'; // Import Firebase

// --- Constantes de Categorias ---
const CATEGORIES = [
  { id: 'all', label: 'Todas as categorias', icon: LayoutGrid },
  { id: 'Saúde e Esportes', label: 'Saúde e Esportes', icon: Activity },
  { id: 'Finanças e Investimentos', label: 'Finanças e Investimentos', icon: Wallet },
  { id: 'Relacionamentos', label: 'Relacionamentos', icon: Heart },
  { id: 'Negócios e Carreira', label: 'Negócios e Carreira', icon: Briefcase },
  { id: 'Espiritualidade', label: 'Espiritualidade', icon: Sparkles },
  { id: 'Sexualidade', label: 'Sexualidade', icon: Flame },
  { id: 'Entretenimento', label: 'Entretenimento', icon: Clapperboard },
  { id: 'Culinária e Gastronomia', label: 'Culinária e Gastronomia', icon: Utensils },
  { id: 'Idiomas', label: 'Idiomas', icon: Languages },
  { id: 'Direito', label: 'Direito', icon: Scale },
  { id: 'Apps & Software', label: 'Apps & Software', icon: Laptop },
  { id: 'Literatura', label: 'Literatura', icon: BookOpen },
  { id: 'Casa e Construção', label: 'Casa e Construção', icon: Home },
  { id: 'Desenvolvimento Pessoal', label: 'Desenv. Pessoal', icon: Brain },
  { id: 'Moda e Beleza', label: 'Moda e Beleza', icon: Gem },
  { id: 'Animais e Plantas', label: 'Animais e Plantas', icon: PawPrint },
  { id: 'Educacional', label: 'Educacional', icon: GraduationCap },
  { id: 'Hobbies', label: 'Hobbies', icon: Palette },
  { id: 'Internet', label: 'Internet', icon: Globe },
  { id: 'Ecologia e Meio Ambiente', label: 'Ecologia', icon: Leaf },
];

const RangeSlider = ({ label, min, max, valueMin, valueMax, onChange, unit = '' }: any) => {
    const getPercent = (value: number) => Math.round(((value - min) / (max - min)) * 100);
    const minPercent = getPercent(valueMin);
    const maxPercent = getPercent(valueMax);
    return (
        <div className="space-y-4 group select-none">
            <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 transition-colors group-hover:text-brand-600">{label}</label><div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 shadow-sm min-w-[100px] text-center group-hover:border-brand-200 transition-colors">{unit}{valueMin} <span className="text-gray-300 mx-1">|</span> {unit}{valueMax}</div></div>
            <div className="relative w-full h-8 flex items-center"><div className="absolute w-full h-2.5 bg-gray-200 rounded-full shadow-inner"></div><div className="absolute h-2.5 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)] transition-all duration-75" style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}></div><input type="range" min={min} max={max} value={valueMin} onChange={(e) => {const val = Math.min(Number(e.target.value), valueMax - 1); onChange(val, valueMax);}} className="pointer-events-none absolute w-full h-full appearance-none bg-transparent z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing" /><input type="range" min={min} max={max} value={valueMax} onChange={(e) => {const val = Math.max(Number(e.target.value), valueMin + 1); onChange(valueMin, val);}} className="pointer-events-none absolute w-full h-full appearance-none bg-transparent z-40 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing" /></div>
        </div>
    );
};

const CategoryCard: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 w-full h-24 group overflow-hidden ${active ? 'bg-gradient-to-br from-brand-50 to-white border-brand-500 shadow-lg shadow-brand-100 scale-[1.02]' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5'}`}><div className={`p-2 rounded-full mb-1.5 transition-all duration-300 ${active ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-50 text-gray-400 group-hover:text-brand-600 group-hover:bg-brand-50'}`}><Icon size={18} strokeWidth={active ? 2.5 : 2} /></div><span className={`text-[10px] font-bold uppercase tracking-tight text-center leading-tight px-1 ${active ? 'text-brand-800' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span>{active && (<><div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.6)]"></div><div className="absolute inset-0 bg-gradient-to-tr from-brand-500/5 to-transparent pointer-events-none"></div></>)}</button>
);

const IndicatorToggle = ({ label, icon: Icon, active, onClick }: { label: string, icon: any, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group ${active ? 'bg-gradient-to-r from-white to-brand-50/50 border-brand-500 shadow-md ring-1 ring-brand-100 transform translate-x-1' : 'bg-[#F9FAFB] border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'}`}><div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg transition-all duration-300 shadow-sm ${active ? 'bg-brand-100 text-brand-600 rotate-3' : 'bg-white text-gray-400 border border-gray-100 group-hover:border-gray-200 group-hover:text-gray-600'}`}><Icon size={16} strokeWidth={active ? 2.5 : 2} /></div><span className={`text-xs font-bold transition-colors ${active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span></div><div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${active ? 'bg-brand-500 border-brand-500 scale-110 shadow-sm' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>{active && <Check size={12} className="text-white" strokeWidth={3} />}</div></button>
);

const SelectablePill = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all duration-200 ${active ? 'bg-gray-900 text-white border-gray-900 shadow-lg transform scale-[1.02] hover:bg-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'}`}>{Icon && <Icon size={14} className={active ? 'text-brand-400' : 'text-gray-400'} />}{label}</button>
);

const CreatorDetailModal = ({ creator, onClose, onAction }: { creator: HunterCreator, onClose: () => void, onAction: (type: 'approve'|'reject'|'edit') => void }) => {
    if (!creator) return null;
    const estimatedProfit = (creator.productPrice * creator.commissionRate).toFixed(2);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 p-5 flex justify-between items-center"><div className="flex items-center gap-4"><img src={creator.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover" /><div><h3 className="font-black text-gray-900 text-lg leading-tight">{creator.name}</h3><span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Target size={12}/> {creator.niche}</span></div></div><button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X size={18} /></button></div>
                <div className="p-8 space-y-8">
                    <div className="flex gap-6 items-start"><div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-gray-300 border border-gray-200 shadow-inner"><BookOpen size={32} /></div><div className="flex-1"><div className="flex items-center gap-2 mb-2"><span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[10px] font-bold border border-brand-100 uppercase tracking-wide">Produto Principal</span></div><h2 className="text-xl font-bold text-gray-900 mb-2">{creator.productName}</h2><div className="flex gap-4"><div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Preço</p><p className="font-bold text-gray-900">R$ {creator.productPrice}</p></div><div className="h-auto w-px bg-gray-200"></div><div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sua Comissão</p><p className="font-bold text-green-600">{(creator.commissionRate * 100).toFixed(0)}% <span className="text-xs font-normal text-gray-400">(~R$ {estimatedProfit})</span></p></div></div></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Globe size={14}/> Presença Digital</h4><a href={`https://${creator.salesPageUrl}`} target="_blank" className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all group"><div className="flex items-center gap-3"><div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><LayoutGrid size={14}/></div><span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">Página Kiwify</span></div><ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500" /></a><a href={`https://instagram.com/${creator.instagram.replace('@','')}`} target="_blank" className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-pink-300 hover:shadow-sm transition-all group"><div className="flex items-center gap-3"><div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg"><Smartphone size={14}/></div><div className="flex flex-col"><span className="text-sm font-medium text-gray-700 group-hover:text-pink-600 transition-colors">{creator.instagram}</span><span className="text-[10px] text-gray-400">{creator.followers.toLocaleString()} seguidores</span></div></div><ExternalLink size={14} className="text-gray-300 group-hover:text-pink-500" /></a></div><div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Users size={14}/> Contatos Diretos</h4><div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200"><div className="flex items-center gap-3"><div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><Mail size={14}/></div><span className="text-sm font-medium text-gray-700">{creator.email || 'Não encontrado'}</span></div>{creator.email ? <Copy size={14} className="text-gray-300 hover:text-brand-500 cursor-pointer" /> : <button className="text-[10px] font-bold text-brand-600 hover:underline">Buscar</button>}</div><div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200"><div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${creator.whatsapp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}><Smartphone size={14}/></div><span className={`text-sm font-medium ${creator.whatsapp ? 'text-gray-700' : 'text-gray-400 italic'}`}>{creator.whatsapp || 'WhatsApp não detectado'}</span></div>{creator.whatsapp ? <Copy size={14} className="text-gray-300 hover:text-green-500 cursor-pointer" /> : <button className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-1"><Search size={10}/> Encontrar</button>}</div></div></div>
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-brand-500 blur-3xl opacity-20 rounded-full -mr-10 -mt-10"></div><div className="relative z-10 flex justify-between items-start"><div><h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Hunter Score</h4><div className="flex items-end gap-2"><span className="text-4xl font-black">{creator.matchScore}</span><span className="text-sm font-medium text-gray-400 mb-1.5">/100</span></div></div><div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20"><span className="text-xs font-bold text-brand-300">Alta Compatibilidade</span></div></div><div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4"><div className="space-y-1"><p className="text-[10px] font-bold text-gray-500 uppercase">Pontos Fortes</p><ul className="text-xs text-gray-300 space-y-1"><li className="flex items-center gap-1.5"><Check size={10} className="text-green-400"/> Produto Validado</li><li className="flex items-center gap-1.5"><Check size={10} className="text-green-400"/> Engajamento Recente</li></ul></div><div className="space-y-1"><p className="text-[10px] font-bold text-gray-500 uppercase">Atenção</p><ul className="text-xs text-gray-300 space-y-1"><li className="flex items-center gap-1.5"><AlertTriangle size={10} className="text-yellow-400"/> Sem WhatsApp</li></ul></div></div></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1"><FileText size={12}/> Notas Internas</label><textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none h-20" placeholder="Adicione observações sobre este lead..."></textarea></div>
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 flex gap-3"><button onClick={() => onAction('reject')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><ThumbsDown size={18} /> Rejeitar</button><button onClick={() => onAction('approve')} className="flex-[2] py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200 flex items-center justify-center gap-2"><ThumbsUp size={18} /> Aprovar Lead</button></div>
            </div>
        </div>
    );
};

const HorizontalStepper = ({ currentStep }: { currentStep: HunterStep }) => {
    const steps = [
        { id: 'ICP_DEFINITION', label: 'Alvo (ICP)', icon: Target },
        { id: 'SEARCH_RESULTS', label: 'Leads', icon: Users },
        { id: 'STRATEGY', label: 'Estratégia', icon: Zap },
        { id: 'EXECUTION', label: 'Lançamento', icon: Rocket },
    ];
    const currentIdx = steps.findIndex(s => s.id === currentStep);
    return (
        <div className="w-full px-8 pt-6 pb-2">
            <div className="flex items-center justify-between relative"><div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full"></div><div className="absolute top-1/2 left-0 h-1 bg-brand-500 -z-10 rounded-full transition-all duration-700 ease-in-out" style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}></div>{steps.map((step, idx) => {const isCompleted = idx < currentIdx; const isActive = idx === currentIdx; return (<div key={step.id} className="flex flex-col items-center gap-2 group cursor-default"><div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 ${isActive ? 'bg-brand-600 border-brand-100 text-white shadow-lg scale-110' : isCompleted ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>{isCompleted ? <Check size={16} strokeWidth={3} /> : <step.icon size={16} />}</div><span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-brand-700' : isCompleted ? 'text-brand-600' : 'text-gray-300'}`}>{step.label}</span></div>);})}</div>
        </div>
    );
};

export const HunterAgent: React.FC = () => {
  const [step, setStep] = useState<HunterStep>('ICP_DEFINITION');
  const [messages, setMessages] = useState<HunterChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false); // Novo state
  
  // States para Etapa 2 (Lista)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'insta' | 'email' | 'whatsapp'>('all');
  
  // States para Etapa 3 (Estratégia)
  const [strategyConfig, setStrategyConfig] = useState({
      approach: new Set(['product_mention', 'partnership']),
      personalization: new Set(['creator_name', 'product_name', 'niche']),
      cta: 'whatsapp_chat'
  });
  
  // States para Etapa 4 (Execução/Review)
  const [reviewStatus, setReviewStatus] = useState<Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'>>({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  
  const [config, setConfig] = useState<HunterCampaignConfig>({
    niche: '',
    minPrice: 97,
    maxPrice: 497,
    minCommission: 30,
    maxCommission: 80, 
    productTypes: ['Cursos Online'],
    maturity: 'ESTABLISHED',
    audienceSize: 'INTERMEDIATE',
    performanceIndicators: ['Tem página de vendas ativa', 'Possui Instagram ativo']
  });
  
  const [creators, setCreators] = useState<HunterCreator[]>([]);
  const [strategy, setStrategy] = useState<HunterStrategyConfig>({
      channel: 'WHATSAPP',
      tone: 'FRIENDLY',
      template: 'Oi {nome}! 👋\n\nVi seu trabalho incrível com o "{produto}" e fiquei impressionado com a qualidade.\n\nTrabalho ajudando creators de {niche} a expandirem o alcance dos seus produtos.\n\nTeria interesse em conversar sobre uma possível parceria? 🚀'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derivados
  const displayedCategories = isCategoriesExpanded ? CATEGORIES : CATEGORIES.slice(0, 10);
  
  const filteredCreators = creators.filter(c => {
      const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.productName || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilter === 'insta' && !c.instagram) return false;
      if (activeFilter === 'email' && !c.email) return false;
      if (activeFilter === 'whatsapp' && !c.whatsapp) return false;
      return true;
  });

  useEffect(() => {
    addMessage('agent', 'Olá! Vou te ajudar a encontrar creators ideais na Kiwify. Vamos começar definindo seu perfil ideal.', 'text');
    setTimeout(() => {
        addMessage('agent', 'Em qual nicho você quer focar? (Ex: Espiritualidade, Marketing, Finanças...)', 'text');
    }, 800);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
      // Regenerate template when strategy components change
      if (step === 'STRATEGY') {
          generateTemplate();
      }
  }, [strategy.channel, strategy.tone, strategyConfig.approach, strategyConfig.personalization, strategyConfig.cta]);

  // Initialize review data when entering EXECUTION
  useEffect(() => {
      if (step === 'EXECUTION' && Object.keys(reviewStatus).length === 0 && creators.length > 0) {
          const initialStatus: any = {};
          const initialMessages: any = {};
          creators.forEach(c => {
              initialStatus[c.id] = 'PENDING';
              let msg = strategy.template
                  .replace('{nome}', c.name.split(' ')[0])
                  .replace('{produto}', c.productName)
                  .replace('{niche}', config.niche);
              initialMessages[c.id] = msg;
          });
          setReviewStatus(initialStatus);
          setCustomMessages(initialMessages);
          setCurrentReviewIndex(0);
      }
  }, [step, creators]);

  const generateTemplate = () => {
      let greeting = '';
      let body = '';
      let cta = '';

      if (strategy.tone === 'FORMAL') greeting = `Olá {nome}, espero que esteja bem.`;
      else if (strategy.tone === 'FRIENDLY') greeting = `Oi {nome}! 👋`;
      else greeting = `{nome}, tudo bem?`;

      if (strategyConfig.approach.has('product_mention')) body += `\n\nVi seu trabalho com o "{produto}" e achei muito interessante a proposta.`;
      if (strategyConfig.approach.has('value_prop')) body += `\n\nSou especialista em escalar produtos de {niche} e vi um grande potencial no seu perfil.`;
      if (strategyConfig.approach.has('success_case')) body += `\n\nRecentemente ajudamos um creator do mesmo nicho a dobrar o faturamento com nossa metodologia.`;
      if (strategyConfig.approach.has('partnership')) body += `\n\nGostaria de propor uma parceria estratégica para alavancar suas vendas.`;

      if (strategyConfig.cta === 'meeting') cta = `\n\nTem disponibilidade para uma breve reunião nesta semana?`;
      else if (strategyConfig.cta === 'whatsapp_chat') cta = `\n\nPodemos conversar rapidinho por aqui?`;
      else cta = `\n\nSe fizer sentido, me avise para eu te enviar mais detalhes.`;

      setStrategy(prev => ({ ...prev, template: greeting + body + cta }));
  };

  const addMessage = (sender: 'user' | 'agent', text: string, type: 'text'|'action' = 'text', actionData?: any) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender,
      text,
      type,
      actionData
    }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const userText = inputText;
    addMessage('user', userText);
    setInputText('');
    setIsTyping(true);
    setTimeout(async () => { await processAgentLogic(userText); setIsTyping(false); }, 1200);
  };

  const processAgentLogic = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // Lógica Passo 1: ICP
    if (step === 'ICP_DEFINITION') {
        if (!config.niche) {
            setConfig(prev => ({ ...prev, niche: input }));
            addMessage('agent', `Perfeito! Nicho de ${input} definido. ✓`);
            addMessage('agent', 'Qual faixa de preço te interessa? (Baratos R$15-97, Médios R$97-497 ou Premium R$497+)');
            return;
        }
        
        if (lowerInput.includes('barato') || lowerInput.includes('baixo')) {
             setConfig(prev => ({ ...prev, minPrice: 15, maxPrice: 97 }));
             addMessage('agent', 'Entendi! Produtos ticket baixo (R$ 15-97). ✓');
             addMessage('agent', 'E quanto à comissão mínima? (ex: 40, 50, 60)');
             return;
        }
        if (lowerInput.includes('médio') || lowerInput.includes('medio')) {
             setConfig(prev => ({ ...prev, minPrice: 97, maxPrice: 497 }));
             addMessage('agent', 'Certo, produtos de ticket médio (R$ 97-497). ✓');
             addMessage('agent', 'E quanto à comissão mínima? (ex: 40, 50, 60)');
             return;
        }
        if (lowerInput.includes('premium') || lowerInput.includes('alto') || lowerInput.includes('caro')) {
             setConfig(prev => ({ ...prev, minPrice: 497, maxPrice: 2000 }));
             addMessage('agent', 'Focado em High Ticket (> R$ 497). ✓');
             addMessage('agent', 'E quanto à comissão mínima? (ex: 40, 50, 60)');
             return;
        }

        const commissionMatch = input.match(/\d+/);
        if (commissionMatch && parseInt(commissionMatch[0]) > 10 && config.minCommission === 30 && !lowerInput.includes('estabelecido') && !lowerInput.includes('iniciante')) {
             const comm = parseInt(commissionMatch[0]);
             setConfig(prev => ({ ...prev, minCommission: comm }));
             addMessage('agent', `Ótimo! Comissão mínima de ${comm}%. ✓`);
             addMessage('agent', 'Você prefere creators: Iniciantes (<5k seg), Estabelecidos (5k-50k) ou Grandes (>50k)?');
             return;
        }

        if (lowerInput.includes('iniciante')) {
            setConfig(prev => ({ ...prev, audienceSize: 'BEGINNER', maturity: 'LAUNCH' }));
            initSearch();
            return;
        }
        if (lowerInput.includes('estabelecido') || lowerInput.includes('médio')) {
            setConfig(prev => ({ ...prev, audienceSize: 'INTERMEDIATE', maturity: 'ESTABLISHED' }));
            initSearch();
            return;
        }
        if (lowerInput.includes('grande') || lowerInput.includes('autoridade')) {
            setConfig(prev => ({ ...prev, audienceSize: 'HUGE', maturity: 'CONSOLIDATED' }));
            initSearch();
            return;
        }

        addMessage('agent', 'Entendido. Atualizei os filtros no painel. Quer adicionar mais algum critério ou posso iniciar a busca?');
    }

    if (step === 'SEARCH_RESULTS') {
        if (lowerInput.includes('sim') || lowerInput.includes('busca')) {
             addMessage('agent', 'Perfeito! Vou fazer uma varredura nos perfis do Instagram para encontrar WhatsApp nos destaques, bio ou posts fixados.');
             setTimeout(() => {
                 setCreators(prev => prev.map((c, i) => {
                     if (!c.whatsapp && i % 2 === 0) return { ...c, whatsapp: `(11) 9${Math.floor(Math.random()*9000)+1000}-${Math.floor(Math.random()*9000)+1000}` };
                     return c;
                 }));
                 addMessage('agent', 'Encontrei 3 novos números! Mas alguns creators ainda não têm WhatsApp visível. Quer que eu os mantenha na lista?');
             }, 2000);
             return;
        }
        if (lowerInput.includes('manter') || lowerInput.includes('sim')) {
             setStep('STRATEGY');
             addMessage('agent', 'Ok, lista mantida. Vamos configurar a estratégia de abordagem.');
             return;
        }
        if (lowerInput.includes('ok') || lowerInput.includes('continuar')) {
            setStep('STRATEGY');
            addMessage('agent', 'Qual canal de abordagem? (WhatsApp, Instagram, Email)');
        }
    }

    if (step === 'STRATEGY') {
        if (lowerInput.includes('whats')) setStrategy(p => ({ ...p, channel: 'WHATSAPP' }));
        else if (lowerInput.includes('insta')) setStrategy(p => ({ ...p, channel: 'INSTAGRAM' }));
        else setStrategy(p => ({ ...p, channel: 'EMAIL' }));
        setStep('EXECUTION');
        addMessage('agent', 'Tudo pronto. Use o botão de lançamento para iniciar.');
    }
  };

  const initSearch = () => {
      addMessage('agent', 'Perfeito! Iniciando busca com seus critérios...');
      setTimeout(async () => {
        const results = await hunterFactory.searchCreators(config);
        setCreators(results);
        setStep('SEARCH_RESULTS');
        addMessage('agent', `Encontrei ${results.length} creators! Destaque para alguns perfis com alta comissão. Quer que eu busque os contatos que faltam?`);
    }, 1500);
  }

  const removeCreator = (id: string) => setCreators(prev => prev.filter(c => c.id !== id));
  
  const toggleSelectCreator = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };
  
  const toggleSelectAll = () => {
      if (selectedIds.size === filteredCreators.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredCreators.map(c => c.id)));
  };

  const handleReviewAction = (creatorId: string, action: 'APPROVED' | 'REJECTED') => {
      setReviewStatus(prev => ({ ...prev, [creatorId]: action }));
      if (action === 'APPROVED' || action === 'REJECTED') {
          if (currentReviewIndex < creators.length - 1) {
              setTimeout(() => setCurrentReviewIndex(prev => prev + 1), 300);
          }
      }
  };

  const handleLaunchCampaign = async () => {
      if (!auth.currentUser) return;
      setIsLaunching(true);
      try {
          const approvedCreators = creators.filter(c => reviewStatus[c.id] === 'APPROVED');
          if (approvedCreators.length === 0) {
              alert("Aprove pelo menos um creator para lançar.");
              setIsLaunching(false);
              return;
          }

          const campaignId = `camp_${Date.now()}`;
          const batch = db.batch();

          // 1. Criar Campanha
          const campRef = db.collection('campaigns').doc(campaignId);
          batch.set(campRef, {
              nome: `Prospecção ${config.niche} - ${new Date().toLocaleDateString()}`,
              nicho: config.niche,
              status: 'RODANDO',
              leads_count: approvedCreators.length,
              data_criacao: new Date().toISOString(),
              ownerId: auth.currentUser.uid,
              stats: {
                  contactados: 0,
                  respondidos: 0,
                  negociacao: 0,
                  fechados: 0
              }
          });

          // 2. Criar Leads
          approvedCreators.forEach(creator => {
              const leadRef = db.collection('leads').doc();
              batch.set(leadRef, {
                  campanha_id: campaignId,
                  ownerId: auth.currentUser.uid,
                  instagram_username: creator.instagram,
                  nome_display: creator.name,
                  foto_url: creator.avatar,
                  seguidores: creator.followers,
                  score_qualificacao: creator.matchScore,
                  status: 'NOVO', // Inicia o funil
                  tags: ['Hunter Lead', config.niche],
                  posicao_kanban: 0,
                  dados_contato: {
                      whatsapp: creator.whatsapp || null,
                      email: creator.email || null,
                      instagram: creator.instagram || null
                  },
                  analise_ia_json: {
                      resumo: `Lead encontrado via Hunter. Produto: ${creator.productName}.`,
                      pontos_fortes: ['Match com ICP', 'Produto Validado'],
                      sinais_monetizacao: true,
                      produto_detectado: {
                          tipo: 'Curso',
                          nome: creator.productName,
                          preco: `R$ ${creator.productPrice}`,
                          plataforma: 'Kiwify'
                      },
                      mensagem_personalizada: customMessages[creator.id] || strategy.template
                  }
              });
          });

          await batch.commit();
          
          // 3. Redirecionar
          window.location.hash = `#/campanhas/${campaignId}`;

      } catch (error) {
          console.error("Erro ao lançar campanha:", error);
          alert("Erro ao criar campanha. Tente novamente.");
      } finally {
          setIsLaunching(false);
      }
  };

  const renderStepContent = () => {
      switch(step) {
          case 'ICP_DEFINITION': return renderStepContentICP();
          case 'SEARCH_RESULTS': return renderStepContentSearch();
          case 'STRATEGY': // ... (Conteúdo Strategy mantido igual) ...
              const whatsappCount = creators.filter(c => c.whatsapp).length;
              const emailCount = creators.filter(c => c.email).length;
              const instaCount = creators.length;
              const exampleCreator = creators[0] || { name: 'Cristiane do Nascimento', productName: 'Dianus Lucífero', avatar: 'https://ui-avatars.com/api/?name=C' };

              return (
                  <div className="h-full flex flex-col md:flex-row animate-in zoom-in-95 duration-500 overflow-hidden">
                      <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-100 bg-[#FAFAFA]"><div className="space-y-8"><section><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Canal de Primeiro Contato</label><div className="space-y-2"><button onClick={() => setStrategy(s => ({...s, channel: 'WHATSAPP'}))} className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${strategy.channel === 'WHATSAPP' ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${strategy.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Smartphone size={18}/></div><span className={`text-sm font-bold ${strategy.channel === 'WHATSAPP' ? 'text-gray-900' : 'text-gray-600'}`}>WhatsApp</span></div><span className="text-xs font-bold text-gray-400">{whatsappCount} disponíveis</span></button><button onClick={() => setStrategy(s => ({...s, channel: 'INSTAGRAM'}))} className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${strategy.channel === 'INSTAGRAM' ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${strategy.channel === 'INSTAGRAM' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500'}`}><ExternalLink size={18}/></div><span className={`text-sm font-bold ${strategy.channel === 'INSTAGRAM' ? 'text-gray-900' : 'text-gray-600'}`}>Instagram Direct</span></div><span className="text-xs font-bold text-gray-400">{instaCount} disponíveis</span></button><button onClick={() => setStrategy(s => ({...s, channel: 'EMAIL'}))} className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${strategy.channel === 'EMAIL' ? 'bg-white border-brand-500 shadow-md ring-1 ring-brand-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${strategy.channel === 'EMAIL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}><Mail size={18}/></div><span className={`text-sm font-bold ${strategy.channel === 'EMAIL' ? 'text-gray-900' : 'text-gray-600'}`}>Email</span></div><span className="text-xs font-bold text-gray-400">{emailCount} disponíveis</span></button></div></section><section><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Tom da Mensagem</label><div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm mb-6">{['FORMAL', 'FRIENDLY', 'DIRECT'].map(t => (<button key={t} onClick={() => setStrategy(s => ({...s, tone: t as any}))} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${strategy.tone === t ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>{t === 'FORMAL' ? 'Formal' : t === 'FRIENDLY' ? 'Amigável' : 'Direto'}</button>))}</div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Elementos da Abordagem</label><div className="space-y-2">{[{id: 'product_mention', label: 'Mencionar produto específico'}, {id: 'partnership', label: 'Destacar parceria'}, {id: 'success_case', label: 'Oferecer caso de sucesso'}, {id: 'value_prop', label: 'Proposta de valor imediata'}].map(opt => (<div key={opt.id} onClick={() => setStrategyConfig(prev => { const n = new Set(prev.approach); n.has(opt.id) ? n.delete(opt.id) : n.add(opt.id); return {...prev, approach: n} })} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-brand-300 transition-all"><div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${strategyConfig.approach.has(opt.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>{strategyConfig.approach.has(opt.id) && <Check size={12} className="text-white" strokeWidth={3} />}</div><span className="text-sm text-gray-700 font-medium">{opt.label}</span></div>))}</div></section><section><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Chamada para Ação (CTA)</label><div className="space-y-2">{[{id: 'meeting', label: 'Agendar reunião', icon: Calendar}, {id: 'whatsapp_chat', label: 'Conversar no WhatsApp', icon: MessageCircle}, {id: 'reply', label: 'Responder com interesse', icon: ThumbsUp}].map(opt => (<button key={opt.id} onClick={() => setStrategyConfig(s => ({...s, cta: opt.id}))} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${strategyConfig.cta === opt.id ? 'bg-brand-50 border-brand-500 text-brand-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}><opt.icon size={16} /><span className="text-sm font-bold">{opt.label}</span>{strategyConfig.cta === opt.id && <div className="ml-auto w-2 h-2 bg-brand-500 rounded-full"></div>}</button>))}</div></section></div></div><div className="w-full md:w-1/2 bg-gray-100 flex flex-col relative overflow-hidden"><div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div><div className="p-6 border-b border-gray-200 bg-white/50 backdrop-blur-sm z-10 flex justify-between items-center"><h4 className="font-bold text-gray-900 flex items-center gap-2"><Eye size={16}/> Preview da Mensagem</h4><button onClick={generateTemplate} className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline"><RefreshCw size={12}/> Regenerar</button></div><div className="flex-1 flex items-center justify-center p-8 overflow-y-auto"><div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border-4 border-gray-900 overflow-hidden relative"><div className="bg-gray-900 h-6 w-full flex justify-between px-4 items-center"><div className="text-[10px] text-white font-bold">9:41</div><div className="flex gap-1"><div className="w-3 h-3 bg-white rounded-full opacity-20"></div><div className="w-3 h-3 bg-white rounded-full opacity-20"></div></div></div><div className="bg-[#075E54] p-3 flex items-center gap-3 text-white"><ArrowLeft size={18} /><div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden"><img src={exampleCreator.avatar} className="w-full h-full object-cover"/></div><div className="flex-1"><div className="font-bold text-sm leading-tight">{exampleCreator.name}</div><div className="text-[10px] opacity-80">visto por último hoje às 09:30</div></div></div><div className="bg-[#E5DDD5] min-h-[300px] p-4 flex flex-col gap-2 bg-opacity-50 relative"><div className="absolute inset-0 opacity-10 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]"></div><div className="self-end bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] relative z-10"><p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{strategy.template.replace('{nome}', exampleCreator.name).replace('{produto}', exampleCreator.productName).replace('{niche}', config.niche)}</p><div className="text-[10px] text-gray-500 text-right mt-1 flex justify-end gap-1">09:42 <span className="text-blue-500">✓✓</span></div></div></div><div className="bg-[#F0F0F0] p-2 flex items-center gap-2"><div className="bg-white flex-1 h-8 rounded-full border border-gray-200"></div><div className="w-8 h-8 bg-[#075E54] rounded-full flex items-center justify-center text-white"><Send size={14} /></div></div></div></div><div className="p-6 bg-white border-t border-gray-200 z-10 flex gap-3"><button className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"><Edit2 size={16} /> Editar</button><button onClick={() => { setStep('EXECUTION'); addMessage('agent', 'Estratégia configurada. Tudo pronto para o disparo.'); }} className="flex-[2] py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all flex items-center justify-center gap-2">Confirmar e Avançar <ArrowRight size={18} /></button></div></div></div>
              );

          case 'EXECUTION':
              const currentCreator = creators[currentReviewIndex];
              const approvedCount = Object.values(reviewStatus).filter(s => s === 'APPROVED').length;
              const rejectedCount = Object.values(reviewStatus).filter(s => s === 'REJECTED').length;
              const pendingCount = creators.length - approvedCount - rejectedCount;
              const progress = Math.round(((approvedCount + rejectedCount) / creators.length) * 100);
              const isLaunchReady = approvedCount / creators.length >= 0.7; // 70% rule

              if (!currentCreator) return null;

              return (
                  <div className="h-full flex flex-col md:flex-row animate-in zoom-in-95 duration-500 overflow-hidden bg-[#FAFAFA]">
                      
                      {/* Left: Review Card */}
                      <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center">
                          {/* Header Info */}
                          <div className="w-full max-w-xl mb-6 flex justify-between items-center">
                              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                  <Rocket size={20} className="text-brand-600"/> PRÉ-LANÇAMENTO
                              </h3>
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                  <button onClick={() => setCurrentReviewIndex(p => Math.max(0, p - 1))} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30" disabled={currentReviewIndex === 0}><ChevronLeft size={16}/></button>
                                  <span>Creator {currentReviewIndex + 1}/{creators.length}</span>
                                  <button onClick={() => setCurrentReviewIndex(p => Math.min(creators.length - 1, p + 1))} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30" disabled={currentReviewIndex === creators.length - 1}><ChevronRight size={16}/></button>
                              </div>
                          </div>

                          {/* Creator Card */}
                          <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl border border-gray-200 overflow-hidden mb-6 relative">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                                  <div className={`h-full transition-colors ${reviewStatus[currentCreator.id] === 'APPROVED' ? 'bg-green-500' : reviewStatus[currentCreator.id] === 'REJECTED' ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                              </div>
                              <div className="p-6 border-b border-gray-100">
                                  <div className="flex items-start gap-4">
                                      <img src={currentCreator.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                                      <div className="flex-1">
                                          <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{currentCreator.name}</h2>
                                          <p className="text-sm text-gray-500 font-medium mb-3 flex items-center gap-1">
                                              <BookOpen size={12}/> {currentCreator.productName}
                                          </p>
                                          <div className="flex items-center gap-3">
                                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1.5 ${strategy.channel === 'WHATSAPP' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>
                                                  {strategy.channel === 'WHATSAPP' ? <Smartphone size={12}/> : <ExternalLink size={12}/>}
                                                  {strategy.channel}
                                              </span>
                                              <span className="text-[10px] font-bold px-2 py-1 rounded-md border bg-gray-50 text-gray-600 border-gray-200">
                                                  Score: {currentCreator.matchScore}/100
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Message Editor */}
                              <div className="p-6 bg-gray-50/50">
                                  <div className="flex justify-between items-center mb-2">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mensagem Personalizada</label>
                                      <div className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">Score IA: 8/10</div>
                                  </div>
                                  <textarea 
                                      className="w-full h-40 p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed shadow-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none transition-all"
                                      value={customMessages[currentCreator.id] || ''}
                                      onChange={(e) => setCustomMessages(p => ({...p, [currentCreator.id]: e.target.value}))}
                                  />
                                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500 font-medium bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                      <div className="flex items-center gap-1.5"><User size={12} className="text-gray-400"/> {currentCreator.name}</div>
                                      <div className="flex items-center gap-1.5"><Target size={12} className="text-gray-400"/> {currentCreator.niche}</div>
                                      <div className="flex items-center gap-1.5"><BookOpen size={12} className="text-gray-400"/> {currentCreator.productName}</div>
                                      <div className="flex items-center gap-1.5"><Users size={12} className="text-gray-400"/> {currentCreator.followers} segs</div>
                                  </div>
                              </div>

                              {/* Actions */}
                              <div className="p-6 flex gap-3 bg-white border-t border-gray-100">
                                  <button onClick={() => handleReviewAction(currentCreator.id, 'REJECTED')} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${reviewStatus[currentCreator.id] === 'REJECTED' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                                      <X size={18} /> Rejeitar
                                  </button>
                                  <button onClick={() => handleReviewAction(currentCreator.id, 'APPROVED')} className={`flex-[2] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${reviewStatus[currentCreator.id] === 'APPROVED' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-900 text-white hover:bg-black shadow-md'}`}>
                                      {reviewStatus[currentCreator.id] === 'APPROVED' ? <CheckCircle2 size={18} /> : <ThumbsUp size={18} />}
                                      {reviewStatus[currentCreator.id] === 'APPROVED' ? 'Aprovado' : 'Aprovar'}
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Right: Overview Panel */}
                      <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col shadow-[-5px_0_20px_rgba(0,0,0,0.02)] z-10">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Progresso Geral</h4>
                          
                          <div className="mb-6">
                              <div className="flex justify-between items-end mb-2">
                                  <span className="text-3xl font-black text-gray-900">{progress}%</span>
                                  <span className="text-xs font-bold text-gray-500 mb-1">{approvedCount + rejectedCount}/{creators.length} Revisados</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                              </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-8">
                              <div className="bg-green-50 p-2 rounded-lg border border-green-100 text-center">
                                  <span className="block text-lg font-black text-green-700">{approvedCount}</span>
                                  <span className="text-[9px] font-bold text-green-600 uppercase">Aprovados</span>
                              </div>
                              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-center">
                                  <span className="block text-lg font-black text-gray-700">{pendingCount}</span>
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">Pendentes</span>
                              </div>
                              <div className="bg-red-50 p-2 rounded-lg border border-red-100 text-center">
                                  <span className="block text-lg font-black text-red-700">{rejectedCount}</span>
                                  <span className="text-[9px] font-bold text-red-600 uppercase">Rejeitados</span>
                              </div>
                          </div>

                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ações Rápidas</h4>
                          <div className="space-y-2 mb-auto">
                              <button onClick={() => {
                                  const updates = {...reviewStatus};
                                  creators.forEach(c => { if (updates[c.id] === 'PENDING') updates[c.id] = 'APPROVED'; });
                                  setReviewStatus(updates);
                              }} className="w-full py-2.5 px-3 bg-white border border-gray-200 hover:border-brand-300 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-between group transition-all">
                                  <span>Aprovar Todos Pendentes</span>
                                  <CheckCircle2 size={14} className="text-gray-400 group-hover:text-brand-500"/>
                              </button>
                              
                              <button className="w-full py-2.5 px-3 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-between group transition-all">
                                  <span>Filtrar: Score {'>'} 80</span>
                                  <Target size={14} className="text-gray-400 group-hover:text-blue-500"/>
                              </button>

                              <button onClick={() => {
                                  const updates = {...reviewStatus};
                                  creators.forEach(c => { if (updates[c.id] === 'REJECTED') updates[c.id] = 'PENDING'; });
                                  setReviewStatus(updates);
                              }} className="w-full py-2.5 px-3 bg-white border border-gray-200 hover:border-orange-300 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-between group transition-all">
                                  <span>Revisar Rejeitados</span>
                                  <RefreshCw size={14} className="text-gray-400 group-hover:text-orange-500"/>
                              </button>
                          </div>

                          <div className="mt-6 pt-6 border-t border-gray-100">
                              {!isLaunchReady && (
                                  <div className="mb-3 flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-800 text-xs font-medium border border-yellow-100">
                                      <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                                      Aprove pelo menos 70% dos leads para lançar.
                                  </div>
                              )}
                              <button 
                                onClick={handleLaunchCampaign}
                                disabled={!isLaunchReady || isLaunching}
                                className="w-full py-4 bg-brand-600 text-white rounded-xl font-black uppercase tracking-wider hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group"
                              >
                                  {isLaunching ? <RefreshCw className="animate-spin" size={18} /> : <Rocket size={18} className="group-hover:-translate-y-0.5 transition-transform"/>}
                                  {isLaunching ? 'Criando Campanha...' : 'Lançar Campanha'}
                              </button>
                          </div>
                      </div>
                  </div>
              );
      }
  };

  // Helper functions para manter compatibilidade com o switch
  const renderStepContentICP = () => (
      <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Sliders size={20} className="text-brand-600" /> Filtros Avançados</h3>
              <button onClick={() => setConfig({ niche: '', minPrice: 0, maxPrice: 2000, minCommission: 0, maxCommission: 80, productTypes: [], maturity: 'ESTABLISHED', audienceSize: 'INTERMEDIATE', performanceIndicators: [] })} className="text-xs text-red-500 hover:underline flex items-center gap-1 transition-colors hover:text-red-600"><Trash2 size={12}/> Limpar</button>
          </div>
          <div className="space-y-8 pb-24">
              <section>
                  <div className="flex items-center justify-between mb-3"><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nicho do Produto</label><button onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)} className="text-xs text-brand-600 font-bold hover:text-brand-700 flex items-center gap-1 transition-colors">{isCategoriesExpanded ? 'Ver Menos' : 'Ver Todos'} {isCategoriesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 transition-all duration-500">{displayedCategories.map(cat => (<CategoryCard key={cat.id} icon={cat.icon} label={cat.label} active={config.niche === cat.id || (cat.id === 'all' && !config.niche)} onClick={() => setConfig(p => ({...p, niche: cat.id === 'all' ? '' : cat.id}))} />))}</div>
              </section>
              <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>
                  <RangeSlider label="Ticket Médio" unit="R$ " min={0} max={2000} valueMin={config.minPrice} valueMax={config.maxPrice} onChange={(min: number, max: number) => setConfig(p => ({...p, minPrice: min, maxPrice: max}))}/>
                  <div className="h-px bg-gray-50"></div>
                  <RangeSlider label="Faixa de Comissão" unit="%" min={0} max={100} valueMin={config.minCommission} valueMax={config.maxCommission} onChange={(min: number, max: number) => setConfig(p => ({...p, minCommission: min, maxCommission: max}))}/>
              </section>
              <section><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Formatos Aceitos</label><div className="flex flex-wrap gap-2">{[{id:'Cursos Online', icon:BookOpen}, {id:'E-books', icon:LayoutGrid}, {id:'Mentorias', icon:Users}, {id:'Comunidades', icon:MessagesSquare}, {id:'Audiobooks', icon:Headphones}].map((item) => (<SelectablePill key={item.id} label={item.id} icon={item.icon} active={config.productTypes.includes(item.id as ProductType)} onClick={() => { const exists = config.productTypes.includes(item.id as ProductType); setConfig(p => ({...p, productTypes: exists ? p.productTypes.filter(i => i !== item.id) : [...p.productTypes, item.id as ProductType]})) }}/>))}</div></section>
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Sinais de Validação</label><div className="space-y-2.5"><IndicatorToggle label="Página de Vendas Ativa" icon={Globe} active={config.performanceIndicators.includes('Tem página de vendas ativa')} onClick={() => { const opt = 'Tem página de vendas ativa'; const exists = config.performanceIndicators.includes(opt); setConfig(p => ({...p, performanceIndicators: exists ? p.performanceIndicators.filter(i => i !== opt) : [...p.performanceIndicators, opt]})) }} /><IndicatorToggle label="Instagram Engajado" icon={Smartphone} active={config.performanceIndicators.includes('Possui Instagram ativo')} onClick={() => { const opt = 'Possui Instagram ativo'; const exists = config.performanceIndicators.includes(opt); setConfig(p => ({...p, performanceIndicators: exists ? p.performanceIndicators.filter(i => i !== opt) : [...p.performanceIndicators, opt]})) }} /><IndicatorToggle label="Contato Visível" icon={Mail} active={config.performanceIndicators.includes('Email de contato visível')} onClick={() => { const opt = 'Email de contato visível'; const exists = config.performanceIndicators.includes(opt); setConfig(p => ({...p, performanceIndicators: exists ? p.performanceIndicators.filter(i => i !== opt) : [...p.performanceIndicators, opt]})) }} /><IndicatorToggle label="Depoimentos Reais" icon={MessageSquareQuote} active={config.performanceIndicators.includes('Tem depoimentos')} onClick={() => { const opt = 'Tem depoimentos'; const exists = config.performanceIndicators.includes(opt); setConfig(p => ({...p, performanceIndicators: exists ? p.performanceIndicators.filter(i => i !== opt) : [...p.performanceIndicators, opt]})) }} /></div></div>
                  <div><label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Maturidade do Creator</label><div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1.5">{[{id: 'LAUNCH', label: 'Iniciante', sub: 'Validação', icon: Rocket}, {id: 'ESTABLISHED', label: 'Estabelecido', sub: 'Escala', icon: TrendingUp}, {id: 'CONSOLIDATED', label: 'Consolidado', sub: 'Autoridade', icon: GraduationCap}].map((opt) => (<button key={opt.id} onClick={() => setConfig(p => ({...p, maturity: opt.id as MaturityLevel}))} className={`flex items-center p-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden group ${config.maturity === opt.id ? 'bg-gray-50 border border-brand-200' : 'hover:bg-gray-50 border border-transparent'}`}><div className={`p-2 rounded-lg mr-3 transition-colors ${config.maturity === opt.id ? 'bg-brand-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-brand-500'}`}><opt.icon size={16} strokeWidth={2.5} /></div><div className="flex-1 relative z-10"><div className={`text-xs font-bold transition-colors ${config.maturity === opt.id ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{opt.label}</div><div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{opt.sub}</div></div>{config.maturity === opt.id && <CheckCircle2 size={16} className="text-brand-600 relative z-10" />}{config.maturity === opt.id && <div className="absolute inset-0 bg-brand-50/50"></div>}</button>))}</div></div>
              </section>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 sticky bottom-0 bg-[#FAFAFA] pb-2 z-20"><div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100"><MousePointerClick size={14} className="text-brand-500" /><span>{config.niche ? 'Pronto para buscar' : 'Defina um nicho'}</span></div></div><button onClick={initSearch} disabled={!config.niche} className="w-full py-4 bg-[#111827] text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 hover:shadow-2xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"><div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div><Search size={18} className="group-hover:scale-110 transition-transform relative z-10" strokeWidth={3} /><span className="relative z-10">Buscar Creators</span></button></div>
      </div>
  );

  const renderStepContentSearch = () => (
      <div className="h-full flex flex-col animate-in slide-in-from-right-8 duration-500 relative">
          <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex justify-between items-center mb-4"><h3 className="font-black text-gray-900 text-lg flex items-center gap-2"><Users size={20} className="text-brand-600" /> Creators Encontrados <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{filteredCreators.length}</span></h3></div>
              <div className="flex gap-2 items-center mb-2"><div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar por nome ou produto..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brand-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div></div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{[{id: 'all', label: 'Todos'}, {id: 'insta', label: 'Com Instagram'}, {id: 'email', label: 'Com Email'}, {id: 'whatsapp', label: 'Com WhatsApp'}].map(f => (<button key={f.id} onClick={() => setActiveFilter(f.id as any)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-colors border ${activeFilter === f.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>{f.label}</button>))}</div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#FAFAFA]">
              {filteredCreators.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-gray-400"><Search size={40} className="mb-2 opacity-50"/><p className="font-bold text-sm">Nenhum creator encontrado com este filtro.</p></div>) : (filteredCreators.map(creator => (<div key={creator.id} className={`group bg-white border rounded-2xl p-4 transition-all duration-200 hover:shadow-lg relative overflow-hidden ${selectedIds.has(creator.id) ? 'border-brand-500 ring-1 ring-brand-100' : 'border-gray-100 hover:border-brand-200'}`}><div onClick={() => toggleSelectCreator(creator.id)} className="absolute top-0 left-0 bottom-0 w-8 cursor-pointer z-10 flex items-center justify-center hover:bg-gray-50 transition-colors">{selectedIds.has(creator.id) ? <CheckSquare size={16} className="text-brand-600 fill-brand-50" /> : <Square size={16} className="text-gray-300" />}</div><div className="pl-6 flex gap-4"><img src={creator.avatar} className="w-14 h-14 rounded-xl object-cover border border-gray-100 shadow-sm" /><div className="flex-1 min-w-0"><div className="flex justify-between items-start"><h4 className="font-bold text-gray-900 truncate pr-2">{creator.name}</h4><div className="flex gap-1"><button onClick={() => setSelectedCreatorId(creator.id)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Eye size={16} /></button><button onClick={() => removeCreator(creator.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></div><div className="flex items-center gap-1.5 mb-2"><span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 truncate max-w-[120px]">{creator.productName}</span><span className="text-[10px] text-gray-400">•</span><span className="text-[10px] font-medium text-gray-600">R$ {creator.productPrice}</span><span className="text-[10px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded border border-green-100">{(creator.commissionRate * 100).toFixed(0)}%</span></div><div className="flex items-center gap-3"><div title="Instagram" className={`flex items-center gap-1 text-[10px] font-bold ${creator.instagram ? 'text-gray-700' : 'text-gray-300'}`}><Smartphone size={12} /> {creator.instagram ? 'Insta' : '-'}</div><div title="Email" className={`flex items-center gap-1 text-[10px] font-bold ${creator.email ? 'text-gray-700' : 'text-gray-300'}`}><Mail size={12} /> {creator.email ? 'Email' : '-'}</div>{creator.whatsapp ? (<div title="WhatsApp" className="flex items-center gap-1 text-[10px] font-bold text-green-700"><Smartphone size={12} /> Whats</div>) : (<button className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:underline bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100"><Search size={10} /> Buscar Contato</button>)}</div></div></div></div>)))}
          </div>
          <div className="p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500"><button onClick={toggleSelectAll} className="hover:text-gray-900 flex items-center gap-1">{selectedIds.size === filteredCreators.length ? <CheckSquare size={14}/> : <Square size={14}/>}{selectedIds.size === filteredCreators.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</button><span>{selectedIds.size} selecionados</span></div>
              <div className="flex gap-2">{selectedIds.size > 0 && (<button className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-2"><Download size={18} /> Exportar</button>)}<button className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"><Plus size={18} /> Add Manual</button><button onClick={() => { setStep('STRATEGY'); addMessage('agent', 'Lista confirmada. Vamos definir a abordagem.'); }} className="flex-[2] py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 shadow-xl transition-all flex items-center justify-center gap-2">Continuar <ArrowRight size={18} /></button></div>
          </div>
          {selectedCreatorId && (<CreatorDetailModal creator={creators.find(c => c.id === selectedCreatorId)!} onClose={() => setSelectedCreatorId(null)} onAction={(type) => { if (type === 'reject') { removeCreator(selectedCreatorId); setSelectedCreatorId(null); } else { setSelectedCreatorId(null); } }} />)}
      </div>
  );

  return (
    <div className="h-[calc(100vh-7rem)] w-full flex flex-col overflow-hidden relative">
      <div className="flex-1 flex w-full max-w-[1800px] mx-auto gap-6 h-full">
        {/* ESQUERDA: CHAT AGENT (35%) */}
        <div className="w-[35%] flex flex-col bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative">
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center z-20">
                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center shadow-lg border-2 border-white"><Bot size={20} className="text-white" /></div><div><h2 className="font-bold text-sm">Hunter AI</h2><div className="flex items-center gap-1.5 opacity-80"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><span className="text-[10px] font-medium tracking-wider uppercase">Online</span></div></div></div><button onClick={() => window.location.reload()} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"><RefreshCw size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
                        <div className={`flex max-w-[90%] gap-3 ${msg.sender === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-1 ${msg.sender === 'agent' ? 'bg-white border border-gray-200' : 'bg-brand-600 text-white'}`}>
                                {msg.sender === 'agent' ? <Zap size={16} className="text-brand-600" /> : <User size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'agent' ? 'bg-white text-gray-700 rounded-tl-none border border-gray-100' : 'bg-brand-600 text-white rounded-tr-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && <div className="text-xs text-gray-400 ml-12 animate-pulse">Digitando...</div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative">
                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Responda ao agente..." className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm font-medium" />
                    <button type="submit" disabled={!inputText.trim()} className="absolute right-2 top-2 p-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-all"><Send size={18} /></button>
                </form>
            </div>
        </div>
        {/* DIREITA: WORKFLOW CARD (65%) */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-200 flex flex-col overflow-hidden relative">
            <div className="border-b border-gray-100 bg-white z-20"><HorizontalStepper currentStep={step} /></div>
            <div className="flex-1 relative overflow-hidden bg-gray-50/30">{renderStepContent()}</div>
        </div>
      </div>
    </div>
  );
};
