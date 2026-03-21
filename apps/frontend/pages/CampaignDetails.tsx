
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Campanha, Lead, LeadStatus, Mensagem } from '../types';
import { ArrowLeft, Users, Filter, Download, ExternalLink, MessageSquare, Search, LayoutDashboard, Trello, MessageCircle, MoreHorizontal, Phone, Mail, Clock, CheckCircle2, AlertCircle, PlayCircle, StopCircle, Mic, Smile, Paperclip, Send, Bot, User, Brain, TrendingUp, DollarSign, X, Calendar, Copy, MapPin, Tag, ChevronRight, ArrowUpRight, ArrowDownRight, Activity, Target, Zap, Database, BarChart2, Star, Truck, Check } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { db } from '../firebase';
import { generateAgentReply } from '../services/prospector';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Tipos para as abas
type TabType = 'INBOX' | 'PIPELINE' | 'DASHBOARD';

// Colunas do Kanban
const PIPELINE_COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'NOVO', label: 'Primeiro Contato', color: 'bg-blue-500' },
  { id: 'RESPONDIDO', label: 'Resposta Positiva', color: 'bg-purple-500' },
  { id: 'NEGOCIACAO', label: 'Em Negociação', color: 'bg-orange-500' },
  { id: 'FECHADO', label: 'Parceria Fechada', color: 'bg-green-500' },
];

interface Props {
  campanhaId: string;
  campanhas: Campanha[];
  leads: Lead[];
}

// --- Componente Auxiliar: KPI Card para Campanha ---
const CampaignKpiCard = ({ title, value, subValue, trend, icon: Icon, colorClass, chartData }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
    <div className="flex justify-between items-start mb-3">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 text-opacity-100`}>
        <Icon size={18} className={colorClass.replace('bg-', 'text-')} strokeWidth={2.5} />
      </div>
    </div>
    
    <div className="flex items-center justify-between z-10 relative">
      <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trend === 'up' ? 'bg-green-50 text-green-700 border border-green-100' : trend === 'down' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
        {trend === 'up' ? <ArrowUpRight size={12} className="mr-0.5" /> : trend === 'down' ? <ArrowDownRight size={12} className="mr-0.5" /> : null}
        {subValue}
      </div>
      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">vs. 7 dias</span>
    </div>

    {/* Sparkline Decorativo */}
    <div className="absolute -bottom-3 -right-3 w-24 h-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
       <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area type="monotone" dataKey="value" stroke="currentColor" fill="currentColor" className={colorClass.replace('bg-', 'text-')} />
          </AreaChart>
       </ResponsiveContainer>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-xl shadow-xl border border-gray-700 text-xs">
        <p className="font-bold mb-2 text-gray-300">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="font-medium">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ... (CloseDealModal e PipelineLeadDetailModal mantidos, omitidos aqui para não repetir código, assuma que existem) ...
// Para fins de XML, vou incluir apenas as versões simplificadas ou placeholders se não forem alterados, mas como não alterei a lógica, vou manter os imports e componentes se possível.
// Na verdade, vou incluir o PipelineCard atualizado que é o foco.

// --- PIPELINE CARD ELITE ---
const PipelineCard: React.FC<{ lead: Lead, onClick: () => void }> = ({ lead, onClick }) => (
    <div 
        onClick={onClick} 
        className="group relative bg-white p-3.5 rounded-2xl border border-gray-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.08)] hover:border-brand-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
    >
        {/* Quick Action Overlay (Chat) */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 z-10">
            <button className="p-1.5 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 shadow-sm border border-brand-200">
                <MessageCircle size={14} />
            </button>
        </div>

        <div className="flex items-start gap-3 mb-3">
            <div className="relative">
                <Avatar src={lead.foto_url} name={lead.nome_display} alt={lead.nome_display} className="w-9 h-9 rounded-xl border border-gray-100 shadow-sm" />
                {lead.status === 'RESPONDIDO' && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1 pr-6">
                <h4 className="font-bold text-xs text-gray-900 truncate leading-tight group-hover:text-brand-700 transition-colors">{lead.nome_display}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-gray-400 font-medium truncate flex items-center gap-0.5">
                        {lead.instagram_username || 'Sem Insta'}
                    </span>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                <Tag size={10} className="text-gray-400"/>
                <span className="text-[10px] font-bold text-gray-600">{lead.analise_ia_json.produto_detectado?.preco || 'R$ -'}</span>
            </div>
            
            {/* Score Ring Mini */}
            <div className="flex items-center gap-1">
                <span className={`text-[10px] font-black ${lead.score_qualificacao >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                    {lead.score_qualificacao}
                </span>
                <div className="w-4 h-4 rounded-full border-2 border-gray-100 flex items-center justify-center">
                    <div 
                        className={`w-2 h-2 rounded-full ${lead.score_qualificacao >= 70 ? 'bg-green-500' : 'bg-orange-500'}`}
                    ></div>
                </div>
            </div>
        </div>
        
        {/* Progress Bar (Visual Flair) */}
        {lead.score_qualificacao >= 80 && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-green-500/20 rounded-t-full overflow-hidden">
                <div className="h-full bg-green-500 w-full animate-pulse"></div>
            </div>
        )}
    </div>
);

// ... (Restante do arquivo CampaignDetails.tsx mantido, incluindo ChatInterface, Modais, e componente principal) ...
// Vou reincluir o componente principal CampaignDetails para garantir que o PipelineCard seja usado corretamente

// ... (Imports e auxiliares acima) ...

// ... (CloseDealModal Code) ...
const CloseDealModal = ({ lead, onClose, onConfirm }: { lead: Lead, onClose: () => void, onConfirm: (requiresMigration: boolean) => void }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
                        <Check size={32} className="text-white" strokeWidth={4} />
                    </div>
                    <h2 className="text-2xl font-black text-white leading-none mb-2">Parceria Fechada!</h2>
                    <p className="text-green-100 font-medium text-sm">O lead <span className="font-bold text-white">{lead.nome_display}</span> agora é um creator B4You.</p>
                </div>
                
                <div className="p-8">
                    <h3 className="text-center text-gray-900 font-bold text-lg mb-6">Qual o próximo passo?</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => onConfirm(true)}
                            className="group relative flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-left"
                        >
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                <Truck size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-brand-700">Requer Migração</h4>
                                <p className="text-xs text-gray-500 mt-1">O creator precisa transferir cursos e alunos. Enviar para o <span className="font-bold text-gray-700">Pipeline de Onboarding</span>.</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => onConfirm(false)}
                            className="group relative flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-left"
                        >
                            <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-brand-700">Acesso Imediato</h4>
                                <p className="text-xs text-gray-500 mt-1">Creator já está pronto ou não requer migração técnica. Liberar acesso ao <span className="font-bold text-gray-700">Painel do Creator</span>.</p>
                            </div>
                        </button>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs font-bold uppercase tracking-widest">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

// ... (PipelineLeadDetailModal Code) ...
const PipelineLeadDetailModal = ({ lead, onClose, onChatOpen, onMoveToClosed }: { lead: Lead, onClose: () => void, onChatOpen: () => void, onMoveToClosed: () => void }) => {
    if (!lead) return null;

    const produto = lead.analise_ia_json.produto_detectado;
    const stats = {
        score: lead.score_qualificacao,
        statusLabel: PIPELINE_COLUMNS.find(c => c.id === lead.status)?.label || lead.status,
        statusColor: PIPELINE_COLUMNS.find(c => c.id === lead.status)?.color.replace('bg-', 'text-') || 'text-gray-500'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200 border border-white/20 custom-scrollbar">
                
                {/* Header com Capa/Avatar */}
                <div className="relative h-32 bg-gradient-to-r from-gray-900 to-gray-800 rounded-t-[2rem]">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 rounded-t-[2rem]"></div>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm z-10"><X size={18}/></button>
                    
                    <div className="absolute -bottom-10 left-8 flex items-end gap-4 z-10">
                        <div className="relative">
                            <Avatar src={lead.foto_url} name={lead.nome_display} alt="" className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-white" />
                            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white ${lead.status === 'RESPONDIDO' || lead.status === 'NEGOCIACAO' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        </div>
                        <div className="mb-12 text-white">
                            <h2 className="text-2xl font-black leading-tight">{lead.nome_display}</h2>
                            <div className="flex items-center gap-2 opacity-90">
                                <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded backdrop-blur-md">{lead.instagram_username}</span>
                                <span className="text-xs font-medium flex items-center gap-1"><Users size={12}/> {lead.seguidores.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-14 px-8 pb-8 space-y-8">
                    
                    {/* Status Bar */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status no Funil</p>
                            <p className={`text-lg font-bold ${stats.statusColor} flex items-center gap-2`}>
                                {stats.statusLabel}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score B4You</p>
                            <div className="flex items-end justify-end gap-1">
                                <span className={`text-2xl font-black ${stats.score > 70 ? 'text-green-600' : 'text-yellow-600'}`}>{stats.score}</span>
                                <span className="text-xs text-gray-400 font-bold mb-1">/100</span>
                            </div>
                        </div>
                    </div>

                    {/* Detalhes do Produto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2"><Tag size={14} className="text-brand-600"/> Produto Detectado</h3>
                            {produto ? (
                                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-brand-100 uppercase">{produto.tipo}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm mb-1">{produto.nome}</h4>
                                        <p className="text-xs text-gray-500 line-clamp-2">{produto.descricao || 'Sem descrição detectada.'}</p>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <span className="text-sm font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">{produto.preco || 'R$ -'}</span>
                                        {produto.url_origem && (
                                            <a href={produto.url_origem} target="_blank" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                                Ver Página <ExternalLink size={10}/>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                                    Nenhum produto identificado automaticamente.
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2"><Bot size={14} className="text-purple-600"/> Análise IA</h3>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-purple-900 text-sm leading-relaxed relative">
                                <Brain size={64} className="absolute -right-4 -bottom-4 text-purple-200 opacity-50 rotate-12"/>
                                <p className="relative z-10">{lead.analise_ia_json.resumo}</p>
                                <div className="mt-3 flex flex-wrap gap-2 relative z-10">
                                    {lead.analise_ia_json.pontos_fortes.slice(0, 3).map((p, i) => (
                                        <span key={i} className="text-[10px] bg-white/60 px-2 py-1 rounded-md font-bold border border-purple-200/50">{p}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button onClick={onChatOpen} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                            <MessageCircle size={18} />
                            Abrir Conversa
                        </button>
                        {lead.status !== 'FECHADO' && (
                            <button onClick={onMoveToClosed} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center justify-center gap-2 group">
                                <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform"/>
                                Fechar Parceria
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-componente: Chat Interface (Inbox)
const ChatInterface = ({ lead, onSendMessage }: { lead: Lead, onSendMessage: (text: string) => void }) => {
    // ... (Chat logic same as before) ...
    const [msgText, setMsgText] = useState('');
    const [history, setHistory] = useState<Mensagem[]>([]);
    const [isManual, setIsManual] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mock initial load
    useEffect(() => {
        if(!lead) return;
        // Simular histórico se vazio
        const initial: Mensagem[] = [
            { id: '1', conversa_id: 'c1', remetente: 'AGENT_B4YOU', conteudo: lead.analise_ia_json.mensagem_personalizada || 'Olá!', timestamp: new Date().toISOString(), tipo: 'text' }
        ];
        if (lead.status !== 'NOVO') {
            initial.push({ id: '2', conversa_id: 'c1', remetente: 'USER_CREATOR', conteudo: 'Oi! Tenho interesse sim. Como funciona?', timestamp: new Date().toISOString(), tipo: 'text' });
        }
        setHistory(initial);
    }, [lead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    const handleSend = () => {
        if(!msgText.trim()) return;
        const newMsg: Mensagem = { id: Date.now().toString(), conversa_id: 'c1', remetente: 'AGENT_B4YOU', conteudo: msgText, timestamp: new Date().toISOString(), tipo: 'text' };
        setHistory(p => [...p, newMsg]);
        onSendMessage(msgText);
        setMsgText('');
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <Avatar src={lead.foto_url} name={lead.nome_display} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">{lead.nome_display}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            {lead.analise_ia_json.produto_detectado?.nome}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsManual(!isManual)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${isManual ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        {isManual ? <StopCircle size={14}/> : <PlayCircle size={14}/>}
                        {isManual ? 'Modo Manual' : 'Piloto Automático'}
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><MoreHorizontal size={18} /></button>
                </div>
            </div>

            {/* Manual Mode Warning */}
            {isManual && (
                <div className="bg-gray-900 text-white p-3 text-xs flex justify-between items-center animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="text-yellow-400"/>
                        <span><strong>Modo Manual Ativado.</strong> O agente não enviará respostas automáticas.</span>
                    </div>
                    <button onClick={() => setIsManual(false)} className="text-gray-400 hover:text-white underline">Desativar</button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FDFDFD]">
                {history.map(msg => {
                    const isMe = msg.remetente === 'AGENT_B4YOU';
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                                {msg.conteudo}
                                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>14:30</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <button className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 hover:bg-purple-100 transition-colors flex items-center gap-1">
                        <Brain size={12}/> Sugestão IA: Tentar agendar call
                    </button>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
                            placeholder="Digite sua mensagem..."
                            value={msgText}
                            onChange={e => setMsgText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button className="p-1.5 text-gray-400 hover:text-gray-600"><Paperclip size={16}/></button>
                            <button className="p-1.5 text-gray-400 hover:text-gray-600"><Smile size={16}/></button>
                        </div>
                    </div>
                    <button onClick={handleSend} className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl transition-all shadow-md">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export const CampaignDetails: React.FC<Props> = ({ campanhaId, campanhas, leads }) => {
  const [activeTab, setActiveTab] = useState<TabType>('INBOX');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null); 
  const [leadToClose, setLeadToClose] = useState<Lead | null>(null); // State para o modal de decisão
  const [searchTerm, setSearchTerm] = useState('');

  const campanha = campanhas?.find(c => c.id === campanhaId);
  const campaignLeads = leads?.filter(l => l.campanha_id === campanhaId) || [];
  
  // Set first lead as selected initially for INBOX
  useEffect(() => {
      if (!selectedLeadId && campaignLeads.length > 0 && activeTab === 'INBOX') {
          setSelectedLeadId(campaignLeads[0].id);
      }
  }, [campaignLeads, selectedLeadId, activeTab]);

  // --- MOCK DATA GENERATOR PARA GRÁFICOS (FOCADO EM PROSPECÇÃO) ---
  const { timelineData, qualificationData, totalLeads, contactedLeads, repliedLeads, qualifiedLeads, responseRate } = useMemo(() => {
      // ... (Same mock logic as before) ...
      const total = campaignLeads.length;
      const contacted = campaignLeads.filter(l => l.status !== 'NOVO').length;
      const replied = campaignLeads.filter(l => ['RESPONDIDO', 'NEGOCIACAO', 'FECHADO'].includes(l.status)).length;
      const qualified = campaignLeads.filter(l => l.score_qualificacao >= 70).length;
      
      const rate = contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : '0';

      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dailySent = Math.floor(Math.random() * (total * 0.15)) + 1;
          const dailyReplies = Math.floor(dailySent * 0.4);
          days.push({
              name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
              enviados: dailySent,
              respostas: dailyReplies,
              value: dailySent 
          });
      }
      const qualData = [
          { name: 'Qualificados (>70)', value: qualified, color: '#10B981' }, 
          { name: 'Em Análise', value: total - qualified, color: '#F59E0B' } 
      ];
      return { timelineData: days, qualificationData: qualData, totalLeads: total, contactedLeads: contacted, repliedLeads: replied, qualifiedLeads: qualified, responseRate: rate };
  }, [campaignLeads]);

  const selectedLead = campaignLeads.find(l => l.id === selectedLeadId);

  const handleCloseDeal = async (requiresMigration: boolean) => {
      if (!leadToClose) return;
      try {
          const updateData: Partial<Lead> = {
              status: 'FECHADO',
              isOnboarding: requiresMigration,
              onboardingStatus: requiresMigration ? 'HANDOVER' : undefined,
              migrationProgress: 0
          };
          
          await db.collection("leads").doc(leadToClose.id).update(updateData);
          
          setLeadToClose(null);
          setViewingLead(null);
          
          // Opcional: Feedback visual ou redirecionamento
          if (requiresMigration) {
              window.location.hash = '#/onboarding';
          } else {
              window.location.hash = '#/creators';
          }
      } catch (err) {
          console.error("Erro ao fechar parceria:", err);
      }
  };

  if (!campanha) return <div>Campanha não encontrada</div>;

  // Render Functions
  const renderDashboard = () => {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* KPI ROW - Focado em Prospecção */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CampaignKpiCard title="Base de Leads" value={totalLeads} subValue="Novos" trend="up" icon={Database} colorClass="bg-blue-500" chartData={timelineData.map(d => ({ value: d.enviados }))}/>
                <CampaignKpiCard title="Contactados" value={contactedLeads} subValue="Disparos" trend="up" icon={Send} colorClass="bg-indigo-500" chartData={timelineData.map(d => ({ value: d.enviados }))}/>
                <CampaignKpiCard title="Taxa de Resposta" value={`${responseRate}%`} subValue="Engajamento" trend="up" icon={MessageCircle} colorClass="bg-green-500" chartData={timelineData.map(d => ({ value: d.respostas }))}/>
                <CampaignKpiCard title="Leads Qualificados" value={qualifiedLeads} subValue="Score Alto" trend="neutral" icon={Star} colorClass="bg-orange-500" chartData={timelineData.map(d => ({ value: d.respostas }))} />
            </div>
            {/* MAIN CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6"><div><h3 className="text-lg font-bold text-gray-900">Cadência de Prospecção</h3><p className="text-xs text-gray-500">Volume de mensagens enviadas e respostas recebidas nos últimos 7 dias.</p></div><div className="flex gap-4"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span><span className="text-xs font-bold text-gray-600">Disparos</span></div><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-xs font-bold text-gray-600">Respostas</span></div></div></div>
                    <div className="flex-1 min-h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={timelineData}><defs><linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366F1" stopOpacity={0}/></linearGradient><linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22C55E" stopOpacity={0.1}/><stop offset="95%" stopColor="#22C55E" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10, fontWeight: 600}} /><Tooltip content={<CustomTooltip />} /><Area type="monotone" dataKey="enviados" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorEnviados)" /><Area type="monotone" dataKey="respostas" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorResp)" /></AreaChart></ResponsiveContainer></div>
                </div>
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex-1 min-h-[200px]"><h3 className="text-sm font-bold text-gray-900 mb-4">Qualidade da Base</h3><div className="h-40 flex items-center"><ResponsiveContainer width="50%" height="100%"><PieChart><Pie data={qualificationData} innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{qualificationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />))}</Pie></PieChart></ResponsiveContainer><div className="w-[50%] space-y-2">{qualificationData.map((d, i) => (<div key={i} className="flex justify-between items-center text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span><span className="font-medium text-gray-600">{d.name}</span></div><span className="font-bold text-gray-900">{d.value}</span></div>))}</div></div></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex-1"><h3 className="text-sm font-bold text-gray-900 mb-4">Eficiência do Funil</h3><div className="space-y-4"><div><div className="flex justify-between text-xs mb-1"><span className="font-bold text-gray-500">Taxa de Abertura (Est.)</span><span className="font-bold text-gray-900">~85%</span></div><div className="h-1.5 w-full bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{width: '85%'}}></div></div></div><div><div className="flex justify-between text-xs mb-1"><span className="font-bold text-gray-500">Taxa de Resposta</span><span className="font-bold text-gray-900">{responseRate}%</span></div><div className="h-1.5 w-full bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{width: `${Math.min(100, parseFloat(responseRate))}%`}}></div></div></div></div></div>
                </div>
            </div>
            {/* RECENT ACTIVITY TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"><div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-gray-900 text-lg">Últimas Interações</h3><button className="text-xs font-bold text-brand-600 hover:text-brand-700">Ver Todas</button></div><div className="divide-y divide-gray-50">{campaignLeads.slice(0, 5).map(lead => (<div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"><div className="flex items-center gap-4"><Avatar src={lead.foto_url} name={lead.nome_display} alt="" className="w-10 h-10 rounded-full border border-gray-100" /><div><p className="text-sm font-bold text-gray-900">{lead.nome_display}</p><p className="text-xs text-gray-500 flex items-center gap-1">{lead.status === 'NOVO' ? 'Lead capturado via Hunter' : lead.status === 'RESPONDIDO' ? 'Respondeu à abordagem' : 'Em negociação'}</p></div></div><div className="text-right"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${lead.status === 'NOVO' ? 'bg-blue-50 text-blue-700 border-blue-100' : lead.status === 'RESPONDIDO' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{lead.status === 'RESPONDIDO' ? 'Resposta Ativa' : lead.status}</span><p className="text-[10px] text-gray-400 font-bold mt-1">Há 15 min</p></div></div>))}</div></div>
        </div>
      );
  };

  const renderPipeline = () => (
      <div className="h-full overflow-x-auto pb-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex gap-4 min-w-[1000px] h-full">
              {PIPELINE_COLUMNS.map(col => (
                  <div key={col.id} className="w-80 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200 h-full">
                      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                              <h4 className="font-bold text-gray-700 text-sm">{col.label}</h4>
                          </div>
                          <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">
                              {campaignLeads.filter(l => l.status === col.id).length}
                          </span>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3">
                          {campaignLeads.filter(l => l.status === col.id).map(lead => (
                              <PipelineCard 
                                key={lead.id} 
                                lead={lead} 
                                onClick={() => setViewingLead(lead)} 
                              />
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderInbox = () => (
      <div className="flex h-full gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* List - 25% */}
          <div className="w-80 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input 
                        type="text" 
                        placeholder="Buscar creator..." 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-300"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
                      {['Todos', 'Não lidos', 'Negociação'].map(filter => (
                          <button key={filter} className="whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700">{filter}</button>
                      ))}
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                  {campaignLeads.filter(l => l.nome_display.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                      <div 
                        key={lead.id} 
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedLeadId === lead.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <h4 className={`font-bold text-sm ${selectedLeadId === lead.id ? 'text-blue-700' : 'text-gray-900'}`}>{lead.nome_display}</h4>
                              <span className="text-[10px] text-gray-400">14:30</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">Oi! Obrigada 😊 Que legal. Conte mais sobre...</p>
                          <div className="flex items-center gap-2 mt-2">
                              <span className={`w-2 h-2 rounded-full ${lead.status === 'RESPONDIDO' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                              <span className="text-[10px] font-medium text-gray-400">{lead.status}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Chat - 50% */}
          <div className="flex-1">
              {selectedLead ? (
                  <ChatInterface lead={selectedLead} onSendMessage={(txt) => console.log(txt)} />
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <MessageCircle size={48} className="mb-4 stroke-1"/>
                      <p className="text-sm font-bold">Selecione uma conversa</p>
                  </div>
              )}
          </div>

          {/* Details - 25% */}
          {selectedLead && (
              <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-y-auto hidden xl:block">
                  <div className="text-center mb-6">
                      <Avatar src={selectedLead.foto_url} name={selectedLead.nome_display} alt="" className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-gray-50" />
                      <h3 className="font-bold text-gray-900">{selectedLead.nome_display}</h3>
                      <a href={`https://instagram.com/${selectedLead.instagram_username.replace('@','')}`} target="_blank" className="text-xs text-blue-600 hover:underline">{selectedLead.instagram_username}</a>
                  </div>

                  <div className="space-y-6">
                      <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Produto</h4>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <div className="font-bold text-sm text-gray-900 mb-1">{selectedLead.analise_ia_json.produto_detectado?.nome}</div>
                              <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-gray-500">{selectedLead.analise_ia_json.produto_detectado?.preco}</span>
                                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">50% Com.</span>
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Dados de Contato</h4>
                          <div className="space-y-2">
                              <div className="flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-100 p-2 rounded-lg">
                                  <Phone size={14} className="text-gray-400"/>
                                  <span className="truncate">{selectedLead.dados_contato?.whatsapp || '-'}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-100 p-2 rounded-lg">
                                  <Mail size={14} className="text-gray-400"/>
                                  <span className="truncate">{selectedLead.dados_contato?.email || '-'}</span>
                              </div>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Próximos Passos</h4>
                          <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                              <div className="flex items-start gap-2">
                                  <Clock size={14} className="text-yellow-600 mt-0.5"/>
                                  <div>
                                      <p className="text-xs font-bold text-yellow-800">Aguardando Resposta</p>
                                      <p className="text-[10px] text-yellow-700 mt-1">Lead visualizou há 2h. Follow-up sugerido para amanhã.</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => setLeadToClose(selectedLead)}
                        className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-black transition-all"
                      >
                          Fechar Parceria
                      </button>
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6 overflow-hidden relative">
      {/* Modal de Lead */}
      {viewingLead && (
          <PipelineLeadDetailModal 
              lead={viewingLead} 
              onClose={() => setViewingLead(null)}
              onChatOpen={() => {
                  setViewingLead(null);
                  setActiveTab('INBOX');
                  setSelectedLeadId(viewingLead.id);
              }} 
              onMoveToClosed={() => setLeadToClose(viewingLead)}
          />
      )}

      {/* Modal de Fechamento */}
      {leadToClose && (
          <CloseDealModal 
              lead={leadToClose}
              onClose={() => setLeadToClose(null)}
              onConfirm={handleCloseDeal}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <button 
            onClick={() => window.location.hash = '#/campanhas'}
            className="flex items-center text-gray-400 hover:text-gray-900 transition-colors mb-2 text-xs font-bold uppercase tracking-wider group"
          >
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar
          </button>
          <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{campanha.nome}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${campanha.status === 'RODANDO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {campanha.status}
              </span>
          </div>
        </div>
        
        {/* Tab Switcher (Elite UI) */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
            {[
                { id: 'INBOX', label: 'Conversas', icon: MessageSquare },
                { id: 'PIPELINE', label: 'Pipeline', icon: Trello },
                { id: 'DASHBOARD', label: 'Analytics', icon: LayoutDashboard }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeTab === tab.id 
                        ? 'bg-gray-900 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    <tab.icon size={16} className="mr-2" strokeWidth={2.5}/>
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
          {activeTab === 'DASHBOARD' && renderDashboard()}
          {activeTab === 'PIPELINE' && renderPipeline()}
          {activeTab === 'INBOX' && renderInbox()}
      </div>
    </div>
  );
};
