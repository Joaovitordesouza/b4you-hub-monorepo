
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useEvolution } from '../contexts/EvolutionContext';
import { useChat } from '../hooks/useChat'; 
import { useToast } from '../contexts/ToastContext'; 
import { Lead, EvolutionChat, Producer } from '@b4you/types';
import { db, auth, fieldValue } from '@b4you/firebase';
import { ChatSidebar } from '../components/Chat/ChatSidebar';
import { ChatFeed } from '../components/Chat/ChatFeed';
import { CRMPanel } from '../components/Chat/CRMPanel';
import { MOCK_CHATS, MOCK_MESSAGES } from '../data/mockChats'; 
import { Loader2, RefreshCw, Wifi, WifiOff, Target, X, Users, Info, Shield, Hash, Lock } from 'lucide-react';
import { Avatar } from '../components/Avatar';

// Adaptador para converter Producer em Lead (para manter compatibilidade de UI)
const adapterProducerToLead = (p: any): Lead => ({
    id: p.id,
    campanha_id: 'carteira',
    ownerId: p.gerente_conta || '',
    instagram_username: p.instagram_username || '',
    nome_display: p.nome_display,
    foto_url: p.foto_url,
    seguidores: p.seguidores || 0,
    score_qualificacao: p.stats_financeiros?.health_score || 100,
    status: 'FECHADO',
    tags: [...(p.tags || []), 'Cliente'],
    posicao_kanban: 0,
    analise_ia_json: {
        resumo: `Cliente da carteira. Produto: ${p.produto_principal}`,
        pontos_fortes: [],
        sinais_monetizacao: true,
        produto_detectado: {
            nome: p.produto_principal,
            tipo: 'Curso',
            plataforma: p.plataforma_origem
        }
    },
    dados_contato: {
        whatsapp: p.whatsapp_contato,
        email: p.email_contato
    },
    // @ts-ignore
    stage: p.stage || 'ONBOARDING'
});

const useLeadContext = (chatId: string | null, instanceId: string | null) => {
    const [lead, setLead] = useState<Lead | null>(null);

    useEffect(() => {
        // CLEANUP: Limpa o estado imediatamente ao trocar de chat para evitar "Ghost Data"
        setLead(null);

        if (!chatId || !instanceId || chatId.includes('@g.us')) {
            return;
        }

        // Listener Real-time no documento do CHAT
        // Isso garante que se o CRMPanel vincular um LeadId, a UI atualiza na hora
        const chatRef = db.collection('instances').doc(instanceId).collection('chats').doc(chatId);
        
        const unsubChat = chatRef.onSnapshot(async (chatSnap) => {
            const chatData = chatSnap.data();
            
            if (chatData && chatData.leadId) {
                // Caso A: Já tem vínculo explícito
                try {
                    const leadDoc = await db.collection('leads').doc(chatData.leadId).get();
                    if (leadDoc.exists) {
                        setLead({ id: leadDoc.id, ...leadDoc.data() } as Lead);
                    } else {
                        // Tenta buscar como Producer se não achou Lead (Fallback legado)
                        const prodDoc = await db.collection('producers').doc(chatData.leadId).get();
                        if (prodDoc.exists) {
                            setLead(adapterProducerToLead({ id: prodDoc.id, ...prodDoc.data() }));
                        }
                    }
                } catch (e) { console.error(e); }
            } else {
                // Caso B: Busca por telefone (Match implícito)
                const phone = chatId.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
                // Variações para match (com e sem 55, com e sem 9)
                const variants = [
                    phone, 
                    phone.replace(/^55/, ''), 
                    phone.length === 13 ? phone.replace(/55(\d{2})9/, '55$1') : phone,
                    phone.length === 11 ? phone.replace(/^(\d{2})9/, '$1') : phone
                ];

                try {
                    // Tenta achar na Carteira primeiro (Producer)
                    const producersQuery = await db.collection('producers')
                        .where('whatsapp_contato', 'in', variants)
                        .limit(1).get();

                    if (!producersQuery.empty) {
                        setLead(adapterProducerToLead({ id: producersQuery.docs[0].id, ...producersQuery.docs[0].data() }));
                        return;
                    }

                    // Tenta achar nos Leads
                    const leadsQuery = await db.collection('leads')
                        .where('dados_contato.whatsapp', 'in', variants)
                        .limit(1).get();
                    
                    if (!leadsQuery.empty) {
                        setLead({ id: leadsQuery.docs[0].id, ...leadsQuery.docs[0].data() } as Lead);
                    } else {
                        setLead(null);
                    }
                } catch (error) {
                    console.error("Erro no match de contato:", error);
                    setLead(null);
                }
            }
        });

        return () => unsubChat();
    }, [chatId, instanceId]);

    return lead;
};

// ... GroupInfoPanel code (kept as is) ...
// (Omitting GroupInfoPanel for brevity as it is unchanged from input)
const GroupInfoPanel = ({ chat, onClose }: { chat: EvolutionChat | null, onClose: () => void }) => {
    if (!chat) return null;

    return (
        <div className="w-full h-full flex flex-col bg-[#FAFAFA] border-l border-gray-200 font-sans animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <Users size={20} className="text-gray-400"/> Dados do Grupo
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={18}/>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col items-center pb-6 border-b border-gray-100">
                    <div className="relative mb-4 group">
                        {chat.profilePicUrl ? (
                            <Avatar src={chat.profilePicUrl} name={chat.pushName} alt="" className="w-24 h-24 rounded-[2rem] shadow-xl object-cover border-4 border-white" />
                        ) : (
                            <div className="w-24 h-24 rounded-[2rem] bg-gray-200 flex items-center justify-center border-4 border-white shadow-xl text-gray-400">
                                <Users size={32} />
                            </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                            <Lock size={14} className="text-gray-400"/>
                        </div>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 text-center leading-tight mb-1">{chat.pushName || 'Grupo Desconhecido'}</h2>
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-200 mt-2">
                        Grupo de WhatsApp
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-1">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <Hash size={12}/> ID do Grupo
                        </h4>
                        <p className="text-xs font-mono text-gray-600 break-all select-all bg-gray-50 p-2 rounded border border-gray-100">
                            {chat.remoteJid || chat.id}
                        </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm flex gap-3">
                        <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-blue-800 mb-1">Informação</h4>
                            <p className="text-xs text-blue-600/80 leading-relaxed">
                                As mensagens enviadas neste chat são visíveis para todos os participantes. 
                                O CRM não rastreia leitura individual em grupos.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm opacity-60">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Participantes</h4>
                            <span className="text-xs font-medium text-gray-400">Info indisponível</span>
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                                    <div className="h-2 bg-gray-100 rounded w-24"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Inbox: React.FC = () => {
  const { instances, loading: instancesLoading } = useEvolution();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentUser?.role === 'admin') {
        const unsub = db.collection('users').onSnapshot(snap => {
            const userMap: Record<string, string> = {};
            snap.docs.forEach(doc => {
                const data = doc.data();
                userMap[doc.id] = data.nome || data.email || doc.id;
            });
            setUsers(userMap);
        });
        return () => unsub();
    }
  }, [currentUser]);
  
  const { 
      chats, 
      messages, 
      loadingChats, 
      loadingMessages, 
      sendMessage, 
      retryMessage, 
      deleteMessage, 
      editMessage, // RESTAURADO
      reactToMessage,
      markChatAsRead,
      loadPreviousMessages,
      hasMore,
      loadingMore,
      forceSyncChat // [NEW] Lazy Load do histórico
  } = useChat(selectedInstanceId, selectedChatId);
  
  const leadContext = useLeadContext(selectedChatId, selectedInstanceId);

  const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');
  const [showInfoPanel, setShowInfoPanel] = useState(true); // Default open desktop
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [draftMessage, setDraftMessage] = useState(''); // NEW STATE
  
  // Refs para rastrear estado anterior e evitar renders/toasts excessivos
  const prevChatsRef = useRef<Record<string, number>>({});

  const myChats = useMemo(() => {
      if (!currentUser) return chats;
      return chats.filter(chat => {
          if (currentUser.role === 'admin') return true; 
          // @ts-ignore
          if (chat.ownerId && chat.ownerId !== currentUser.uid) return false;
          return true;
      });
  }, [chats, currentUser]);

  // --- CRITICAL FIX: Merge LeadContext into Chats List with strict matching ---
  const enrichedChats = useMemo(() => {
      return myChats.map(chat => {
          // Só faz o merge se o chatID bater E se o leadContext existir
          // E também se o whatsapp bater (mais seguro)
          const leadWhatsapp = leadContext?.dados_contato?.whatsapp;
          const isMatch = chat.id === selectedChatId && leadContext && (
              leadContext.id === chat.leadId || 
              (leadWhatsapp && chat.id?.includes(leadWhatsapp))
          );

          if (isMatch) {
              return {
                  ...chat,
                  leadName: leadContext.nome_display || chat.pushName, 
                  pushName: leadContext.nome_display || chat.pushName, 
                  profilePicUrl: leadContext.foto_url || chat.profilePicUrl,
                  leadId: leadContext.id,
                  // @ts-ignore
                  leadAvatar: leadContext.foto_url
              };
          }
          return chat;
      });
  }, [myChats, selectedChatId, leadContext]);

  const selectedChat = useMemo(() => {
      const found = enrichedChats.find(c => c.id === selectedChatId) || MOCK_CHATS.find(c => c.id === selectedChatId);
      
      if (found) return found;

      if (selectedChatId) {
          // Fallback construction
          return {
              id: selectedChatId,
              remoteJid: selectedChatId,
              pushName: leadContext?.nome_display || selectedChatId.split('@')[0], 
              leadName: leadContext?.nome_display,
              profilePicUrl: leadContext?.foto_url || '',
              lastMessage: '',
              lastMessageAt: Date.now(),
              unreadCount: 0,
              type: selectedChatId.includes('@g.us') ? 'group' : 'private'
          } as EvolutionChat;
      }
      return null;
  }, [enrichedChats, selectedChatId, leadContext]);

  // Determina se o chat atual é um grupo
  const isSelectedChatGroup = useMemo(() => {
      if (!selectedChatId) return false;
      return selectedChatId.includes('@g.us') || selectedChat?.type === 'group';
  }, [selectedChatId, selectedChat]);

  useEffect(() => {
      const hash = window.location.hash;
      if (hash.includes('?')) {
          const params = new URLSearchParams(hash.split('?')[1]);
          const targetChatId = params.get('chatId');
          const textParam = params.get('text'); // CAPTURA O TEXTO
          
          if (targetChatId) {
              setSelectedChatId(targetChatId);
              setMobileView('CHAT');
          }
          
          if (textParam) {
              setDraftMessage(decodeURIComponent(textParam));
          }
      }
  }, []); 

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      const active = instances.find(i => i.connectionStatus === 'ONLINE') || instances[0];
      if (active) setSelectedInstanceId(active.id);
    }
  }, [instances]);

  useEffect(() => {
      if (loadingChats) return;

      if (isInitialLoad && chats.length > 0) {
          const initialMap: Record<string, number> = {};
          chats.forEach(c => initialMap[c.id] = c.lastMessageAt);
          prevChatsRef.current = initialMap;
          setIsInitialLoad(false);
          return;
      }

      chats.forEach(chat => {
          const prevTimestamp = prevChatsRef.current[chat.id] || 0;
          const currentTimestamp = chat.lastMessageAt;

          if (currentTimestamp === 0) return;

          const isNewer = currentTimestamp > prevTimestamp;
          
          if (isNewer && chat.id === selectedChatId) {
             markChatAsRead(chat.id);
          }
          prevChatsRef.current[chat.id] = currentTimestamp;
      });

  }, [chats, selectedChatId, isInitialLoad, loadingChats]);

  useEffect(() => {
      if (selectedChatId) {
          markChatAsRead(selectedChatId);
      }
  }, [selectedChatId]);

  const currentInstance = instances.find(i => i.id === selectedInstanceId);
  const isSyncing = currentInstance?.connectionStatus === 'ONLINE' && chats.length === 0 && !loadingChats;

  const syncAttemptedRef = React.useRef<string | null>(null);
  useEffect(() => {
      if (selectedChatId !== syncAttemptedRef.current) {
          syncAttemptedRef.current = null;
      }
  }, [selectedChatId]);

  useEffect(() => {
      if (!selectedChatId || !currentInstance || currentInstance.connectionStatus !== 'ONLINE') return;
      if (syncAttemptedRef.current === selectedChatId) return; 
      
      if (messages.length === 0 && !loadingMessages) {
          const timer = setTimeout(() => {
              if (syncAttemptedRef.current === selectedChatId) return; 
              syncAttemptedRef.current = selectedChatId;
              console.log('[LAZY LOAD] Chat vazio no frontend. Disparando Deep Sync pontual...');
              forceSyncChat();
          }, 3000); 
          return () => clearTimeout(timer);
      }
  }, [selectedChatId, messages.length, loadingMessages, currentInstance?.connectionStatus, forceSyncChat]);  
  
  const handleSendMessage = (
      text: string, 
      type: 'text' | 'audio' | 'image' | 'video' | 'document' = 'text', 
      mediaUrl?: string, 
      quotedMsg?: { id: string, author: string, content: string, senderJid?: string }, 
      mediaOptions?: { fileName?: string, mimetype?: string }
  ) => {
      sendMessage(text, type, mediaUrl, quotedMsg, mediaOptions);
  };

  const handleCreateTask = async (task: { title: string; dueDate: string; priority: string }) => {
      const user = auth.currentUser;
      if (!user || !leadContext) return;

      try {
          await db.collection('tasks').add({
              title: task.title,
              description: `Tarefa criada via Inbox para ${leadContext.nome_display || 'um lead'}`,
              dueDate: task.dueDate,
              priority: task.priority,
              status: 'PENDING',
              leadId: leadContext.id,
              userId: user.uid,
              assignedTo: [user.uid],
              responsibility: 'B4YOU',
              createdAt: fieldValue.serverTimestamp(),
              creatorName: leadContext.nome_display || 'Desconhecido',
              creatorAvatar: leadContext.foto_url || '',
              type: 'MANUAL'
          });
          addToast({ type: 'success', message: 'Tarefa criada com sucesso!' });
      } catch (error) {
          console.error("Erro ao criar tarefa:", error);
      }
  };

  const handleLinkChat = async (leadId: string) => {
      if (!selectedInstanceId || !selectedChatId) return;
      
      try {
          let leadData: any = null;
          
          const leadDoc = await db.collection('leads').doc(leadId).get();
          if (leadDoc.exists) {
              leadData = leadDoc.data();
          } else {
              const prodDoc = await db.collection('producers').doc(leadId).get();
              if (prodDoc.exists) {
                  leadData = prodDoc.data();
              }
          }

          if (!leadData) {
              throw new Error("Lead não encontrado.");
          }

          const leadScore = leadData.score_qualificacao || leadData.stats_financeiros?.health_score || 0;

          const updatePayload: any = {
              leadId: leadId,
              leadName: leadData.nome_display || 'Sem nome', 
              pushName: leadData.nome_display || 'Sem nome', 
              tags: leadData.tags || [],
              leadScore: leadScore
          };

          if (leadData.foto_url) {
              updatePayload.profilePicUrl = leadData.foto_url;
          }

          await db.collection('instances').doc(selectedInstanceId).collection('chats').doc(selectedChatId).set(updatePayload, { merge: true });

          addToast({ type: 'success', message: 'Chat vinculado e nome atualizado.' });

      } catch (e) {
          console.error("Erro ao vincular chat:", e);
          addToast({ type: 'error', message: 'Erro ao vincular chat.' });
      }
  };

  const handleSelectChat = (chatId: string) => {
      setSelectedChatId(chatId);
      setMobileView('CHAT');
      setDraftMessage(''); // Clear draft on change
  };

  const handleBackToList = () => {
      setMobileView('LIST');
      setSelectedChatId(null);
  };

  const displayChats = (instances.length === 0 && chats.length === 0) ? MOCK_CHATS : enrichedChats;
  const displayMessages = (instances.length === 0 && messages.length === 0 && MOCK_CHATS.some(c => c.id === selectedChatId)) 
      ? (MOCK_MESSAGES[selectedChatId!] || []) 
      : messages;

  return (
    <div className="flex h-[calc(100vh-2rem)] m-4 bg-white rounded-[1.5rem] border border-gray-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden animate-in fade-in duration-500 relative ring-1 ring-black/5">
      
      {/* Coluna 1: Sidebar (Chat List) */}
      <div className={`w-full md:w-[360px] border-r border-gray-100 flex-shrink-0 flex-col bg-white overflow-hidden z-10 ${mobileView === 'CHAT' ? 'hidden md:flex' : 'flex'}`}>
          {/* Seletor de Instância */}
          <div className="pt-4 pb-2 px-4 flex flex-col gap-3 border-b border-transparent">
              {instances.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                      {instances.map(inst => {
                          const isActive = selectedInstanceId === inst.id;
                          const isOnline = inst.connectionStatus === 'ONLINE';
                          return (
                            <button 
                                key={inst.id}
                                onClick={() => setSelectedInstanceId(inst.id)}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border
                                    ${isActive 
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    }
                                `}
                            >
                                {isOnline ? <Wifi size={10} className={isActive ? 'text-green-400' : 'text-green-600'}/> : <WifiOff size={10} className="text-red-500"/>}
                                {inst.name}
                                {currentUser?.role === 'admin' && users[inst.ownerId] && (
                                    <span className="opacity-50 font-normal ml-1">({users[inst.ownerId]})</span>
                                )}
                            </button>
                          );
                      })}
                  </div>
              )}

              {isSyncing && (
                  <div className="w-full bg-[#E1F5FE] text-[#0277BD] rounded-lg p-2 flex items-center justify-center gap-2 text-[10px] font-bold animate-pulse">
                      <RefreshCw size={10} className="animate-spin" />
                      Sincronizando histórico recente...
                  </div>
              )}
          </div>

          <ChatSidebar 
            chats={displayChats} 
            selectedChatId={selectedChatId} 
            onSelectChat={handleSelectChat} 
            isLoading={loadingChats || instancesLoading}
          />
      </div>

      {/* Coluna 2: Chat Feed */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#EFEAE2] relative z-0 ${mobileView === 'LIST' ? 'hidden md:flex' : 'flex'}`}>
          {/* Journey Status Bar (Hide for Groups) */}
          {leadContext && !isSelectedChatGroup && (
              <div className="h-1 bg-gray-200 w-full relative z-30">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                        (leadContext as any).stage === 'RISCO' ? 'bg-red-500' : 'bg-brand-500'
                    }`}
                    style={{ 
                        width: (leadContext as any).stage === 'AQUISICAO' ? '25%' : 
                               (leadContext as any).stage === 'ONBOARDING' ? '50%' : 
                               (leadContext as any).stage === 'GROWTH' ? '75%' : '100%' 
                    }}
                  ></div>
              </div>
          )}

          <ChatFeed 
            chat={selectedChat || null}
            messages={displayMessages}
            instanceStatus={currentInstance?.connectionStatus || 'OFFLINE'} 
            initialText={draftMessage} // PASSANDO O RASCUNHO
            onSendMessage={handleSendMessage}
            onRetryMessage={retryMessage}
            onDeleteMessage={deleteMessage}
            onEditMessage={editMessage} 
            onReactMessage={reactToMessage}
            isLoading={loadingMessages && instances.length > 0}
            onBack={handleBackToList}
            onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
            onLoadMore={loadPreviousMessages}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
      </div>

      {/* Coluna 3: ClientOS OR GroupInfo (Right Panel) */}
      <div className={`
          fixed inset-y-0 right-0 z-50 w-full md:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-out border-l border-gray-200
          ${showInfoPanel ? 'translate-x-0' : 'translate-x-full'}
          xl:static xl:translate-x-0 xl:block xl:w-[400px] xl:border-l xl:shadow-none
          ${!selectedChatId ? 'hidden xl:flex' : ''}
      `}>
          {isSelectedChatGroup ? (
              <GroupInfoPanel 
                  chat={selectedChat} 
                  onClose={() => setShowInfoPanel(false)} 
              />
          ) : (
              <CRMPanel 
                lead={leadContext}
                chat={selectedChat}
                onUpdateStage={(stage) => console.log('Stage updated locally')}
                onAddTask={handleCreateTask}
                onLinkChat={handleLinkChat} 
                onClose={() => setShowInfoPanel(false)}
              />
          )}
      </div>

      {/* Overlay para fechar drawer no mobile */}
      {showInfoPanel && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden" onClick={() => setShowInfoPanel(false)}></div>
      )}

    </div>
  );
};
