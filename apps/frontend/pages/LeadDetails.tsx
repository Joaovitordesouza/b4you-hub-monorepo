
import React, { useState, useEffect, useRef } from 'react';
import { Lead, Conversa, Mensagem } from '../types';
import { ArrowLeft, Send, Bot, AlertCircle, ExternalLink, Check, DollarSign, Sparkles, Tag, Loader2, CheckCheck } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { generateAgentReply } from '../services/prospector';
import { useAuth } from '../AuthContext';

interface Props {
  lead: Lead;
}

export const LeadDetails: React.FC<Props> = ({ lead }) => {
  const { currentUser } = useAuth();
  const [conversa, setConversa] = useState<Conversa>({
    id: `conv-${lead.id}`,
    lead_id: lead.id,
    agente_atual: 'nutricao',
    mensagens: []
  });
  
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversa.mensagens, isTyping]);

  useEffect(() => {
      if (!initialized.current && conversa.mensagens.length === 0) {
          initialized.current = true;
          const initialText = lead.analise_ia_json.mensagem_personalizada || 
              `Olá ${lead.nome_display.split(' ')[0]}! Vi seu perfil e achei seu trabalho incrível. A B4You ajuda creators a escalar. Vamos conversar?`;

          // A primeira mensagem é do sistema (Hunter Automático), não necessariamente do usuário logado
          const initialMsg: Mensagem = {
              id: 'm-init',
              conversa_id: conversa.id,
              remetente: 'AGENT_B4YOU',
              conteudo: initialText,
              timestamp: new Date().toISOString(),
              tipo: 'text',
              autor: {
                  id: 'system_bot',
                  nome: 'Hunter AI',
                  role: 'prospector',
                  avatar: 'https://ui-avatars.com/api/?name=Hunter+AI&background=000&color=fff'
              }
          };
          setConversa(prev => ({ ...prev, mensagens: [initialMsg] }));
      }
  }, [lead, conversa.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isTyping || !currentUser) return;

    // Mensagem do Agente (Usuário Logado)
    // NOTE: Invertemos a lógica aqui para o simulador. 
    // Como é um SIMULADOR de prospecção, 'USER_CREATOR' é quem responde (simulado pela IA)
    // e 'AGENT_B4YOU' é o usuário logado enviando a mensagem.
    
    const myMsg: Mensagem = {
      id: Date.now().toString(),
      conversa_id: conversa.id,
      remetente: 'AGENT_B4YOU',
      conteudo: newMessage,
      timestamp: new Date().toISOString(),
      tipo: 'text',
      autor: {
          id: currentUser.id,
          nome: currentUser.nome,
          avatar: currentUser.avatar,
          role: currentUser.role
      }
    };

    const newHistory = [...conversa.mensagens, myMsg];
    setConversa(prev => ({ ...prev, mensagens: newHistory }));
    setNewMessage('');
    setIsTyping(true);

    try {
        const reply = await generateAgentReply(newHistory, lead);
        const aiMsg: Mensagem = {
            id: (Date.now() + 1).toString(),
            conversa_id: conversa.id,
            remetente: 'USER_CREATOR',
            conteudo: reply,
            timestamp: new Date().toISOString(),
            tipo: 'text'
        };
        setConversa(prev => ({
            ...prev,
            mensagens: [...prev.mensagens, aiMsg]
        }));
    } catch (err) {
        console.error("Erro no chat:", err);
    } finally {
        setIsTyping(false);
    }
  };

  const produto = lead.analise_ia_json.produto_detectado;
  const analise = lead.analise_ia_json;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* Left Column: Lead Info & Analysis */}
      <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
        <button onClick={() => window.location.hash = '#/kanban'} className="flex items-center text-[#6B7280] hover:text-[#111827] transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Voltar ao Kanban
        </button>

        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar 
              src={lead.foto_url} 
              name={lead.nome_display} 
              alt={lead.nome_display}
              className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
            />
            <div>
              <h1 className="text-xl font-bold text-[#111827]">{lead.nome_display}</h1>
              <a 
                href={`https://instagram.com/${lead.instagram_username.replace('@','')}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-medium hover:underline flex items-center"
              >
                {lead.instagram_username} <ExternalLink size={12} className="ml-1" />
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280] font-medium">Seguidores</p>
                <p className="font-bold text-[#111827]">{lead.seguidores.toLocaleString()}</p>
             </div>
             <div className="bg-[#F9FAFB] p-3 rounded-lg border border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280] font-medium">Score</p>
                <div className={`font-bold ${lead.score_qualificacao > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {lead.score_qualificacao}/100
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#374151]">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-[#F9FAFB] text-[#6B7280] text-xs rounded border border-[#E5E7EB]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card Unificado de Análise IA */}
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#111827] flex items-center">
              <Bot size={20} className="mr-2 text-purple-600" /> 
              Análise B4You
            </h2>
            {analise.sinais_monetizacao && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wide border border-green-200">
                    Monetizado
                </span>
            )}
          </div>
          
          <div className="space-y-6">
            {analise.resumo && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 relative">
                <Sparkles size={14} className="absolute top-3 left-3 text-purple-500" />
                <p className="text-sm text-purple-800 pl-6 leading-relaxed">
                  {analise.resumo}
                </p>
              </div>
            )}

            {produto ? (
                <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-4 relative overflow-hidden">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase border border-blue-200">
                            {produto.tipo}
                        </span>
                        {analise.plataforma_detectada && (
                            <span className="text-[10px] text-[#6B7280] flex items-center">
                                via {analise.plataforma_detectada}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="font-bold text-[#111827] mb-1">{produto.nome}</h3>
                    <p className="text-xs text-[#4B5563] mb-2 line-clamp-3">{produto.descricao}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-blue-100">
                        {produto.preco && (
                            <span className="text-green-700 font-bold text-sm bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center">
                                <DollarSign size={12} className="mr-0.5" /> {produto.preco}
                            </span>
                        )}
                        <a 
                            href={produto.url_origem} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-blue-600 hover:underline flex items-center ml-auto"
                        >
                            Ver Página <ExternalLink size={10} className="ml-1" />
                        </a>
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 border-2 border-dashed border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
                    <Tag size={20} className="mx-auto text-[#9CA3AF] mb-2" />
                    <p className="text-xs text-[#6B7280]">Nenhuma oferta principal detectada.</p>
                </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">Destaques do Perfil</h4>
              <ul className="space-y-2">
                {analise.pontos_fortes?.length > 0 ? analise.pontos_fortes.map((ponto, idx) => (
                  <li key={idx} className="text-sm text-[#374151] flex items-start bg-[#F9FAFB] border border-[#E5E7EB] p-2 rounded">
                    <Check size={14} className="mt-0.5 mr-2 text-green-500 flex-shrink-0" /> 
                    {ponto}
                  </li>
                )) : (
                  <li className="text-sm text-[#9CA3AF] italic pl-2">Aguardando análise mais profunda...</li>
                )}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Chat Simulator */}
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between flex-shrink-0">
           <div>
              <h2 className="font-bold text-[#111827]">Simulador de Prospecção</h2>
              <p className="text-xs text-[#6B7280]">
                Simule a abordagem com: <span className="font-semibold text-blue-600">{lead.nome_display}</span>
              </p>
           </div>
           <div className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200 flex items-center">
             <Bot size={14} className="mr-1" /> Resposta IA Ativa
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F5]">
           {conversa.mensagens.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF] space-y-2">
                   <Loader2 className="animate-spin text-brand-500" />
                   <p className="text-sm">Gerando abordagem personalizada...</p>
               </div>
           ) : (
               conversa.mensagens.map(msg => {
                 const isInternal = msg.remetente === 'AGENT_B4YOU';
                 return (
                   <div key={msg.id} className={`flex ${isInternal ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[80%] gap-2 ${isInternal ? 'flex-row-reverse' : 'flex-row'}`}>
                         <div className="flex-shrink-0 mt-auto">
                            {isInternal ? (
                                // Mostra avatar do usuário logado se disponível, senão fallback
                                msg.autor?.avatar ? (
                                    <img src={msg.autor.avatar} className="w-8 h-8 rounded-full border-2 border-white" alt="Me" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xs">Eu</div>
                                )
                            ) : (
                              <Avatar 
                                 src={lead.foto_url} 
                                 name={lead.nome_display} 
                                 alt={lead.nome_display}
                                 className="w-8 h-8 rounded-full border-2 border-white"
                              />
                            )}
                         </div>
                         <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                           isInternal 
                            ? 'bg-brand-600 text-white rounded-tr-none' 
                            : 'bg-white text-[#374151] rounded-tl-none border border-[#E5E7EB]'
                         }`}>
                            {msg.conteudo}
                            <div className={`text-[9px] mt-1 text-right flex justify-end items-center gap-1 opacity-70`}>
                                14:30 {isInternal && <CheckCheck size={12}/>}
                            </div>
                         </div>
                      </div>
                   </div>
                 );
               })
           )}
           
           {isTyping && (
             <div className="flex justify-start">
               <div className="flex max-w-[80%] flex-row gap-2">
                 <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden mt-auto">
                    <Avatar 
                        src={lead.foto_url} 
                        name={lead.nome_display} 
                        alt={lead.nome_display}
                        className="w-full h-full"
                    />
                 </div>
                 <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-[#E5E7EB] shadow-sm flex items-center space-x-1">
                   <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                   <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                 </div>
               </div>
             </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-[#E5E7EB] bg-white flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem de abordagem..."
              className="flex-1 px-4 py-2 bg-white border border-[#E5E7EB] text-[#111827] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-[#9CA3AF]"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!newMessage.trim() || isTyping}
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-xs text-center text-[#9CA3AF] mt-2">
            <AlertCircle size={10} className="inline mr-1" />
            Esta é uma simulação. O sistema gerará uma resposta como se fosse o Lead.
          </p>
        </div>
      </div>
    </div>
  );
};
