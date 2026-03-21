
import React, { useState } from 'react';
import { Search, Filter, MessageCircle, MoreVertical, CheckCheck, Clock, Plus, Check, User, Pin, X, Link as LinkIcon, Users, Image, Video, Mic, FileText, Smile } from 'lucide-react';
import { EvolutionChat } from '../../types';
import { Avatar } from '../Avatar';
import { NewChatModal } from './NewChatModal';

interface ChatSidebarProps {
  chats: EvolutionChat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading: boolean;
}

type ChatFilter = 'private' | 'groups' | 'unread';

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ chats, selectedChatId, onSelectChat, isLoading }) => {
  const [filter, setFilter] = useState<ChatFilter>('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const filteredChats = chats.filter(chat => {
    const chatId = chat.id || '';
    const isGroup = chat.type === 'group' || chatId.includes('@g.us');
    
    // PRIORITY: leadName (Saved CRM Name) > pushName (WhatsApp Nickname) > Phone Number
    const displayName = chat.leadName || chat.pushName || chatId.replace('@s.whatsapp.net', '');
    
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'private') return !isGroup; 
    if (filter === 'groups') return isGroup;   
    if (filter === 'unread') return chat.unreadCount > 0;

    return true;
  });

  // Ordenação Client-Side Rigorosa (lastMessageAt DESC)
  // Garante que o chat mais recente (recebido ou enviado) fique no topo
  const sortedChats = [...filteredChats].sort((a, b) => {
      // Valor padrão 0 joga chats sem data para o final
      const timeA = a.lastMessageAt || 0;
      const timeB = b.lastMessageAt || 0;
      
      // Decrescente: Mais novo (Maior Timestamp) primeiro
      return timeB - timeA;
  });

  const getSmartDate = (dateValue: string | number) => {
      if (!dateValue || dateValue === 0) return '';
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) return ''; 

      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
          return 'Ontem';
      }
      
      if (now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
          return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      }
      
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const renderLastMessagePreview = (chat: EvolutionChat) => {
      const msg = chat.lastMessage;
      
      if (!msg) {
          return <span className="text-[#667781] italic">Sem mensagens</span>;
      }
      
      // Detecção simples baseada em conteúdo de texto
      if (msg.startsWith('http')) {
          return <span className="text-[#027eb5] flex items-center gap-1"><LinkIcon size={12} strokeWidth={2.5}/> Link</span>;
      }
      
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('imagem') || lowerMsg.includes('foto') || lowerMsg.includes('image')) {
          return <span className="flex items-center gap-1"><Image size={12} strokeWidth={2.5}/> Foto</span>;
      }
      if (lowerMsg.includes('video') || lowerMsg.includes('vídeo')) {
          return <span className="flex items-center gap-1"><Video size={12} strokeWidth={2.5}/> Vídeo</span>;
      }
      if (lowerMsg.includes('audio') || lowerMsg.includes('áudio')) {
          return <span className="flex items-center gap-1"><Mic size={12} strokeWidth={2.5}/> Áudio</span>;
      }
      if (lowerMsg.includes('documento') || lowerMsg.includes('pdf') || lowerMsg.includes('arquivo')) {
          return <span className="flex items-center gap-1"><FileText size={12} strokeWidth={2.5}/> Documento</span>;
      }
      if (lowerMsg.includes('sticker') || lowerMsg.includes('figurinha')) {
          return <span className="flex items-center gap-1"><Smile size={12} strokeWidth={2.5}/> Figurinha</span>;
      }

      return (
        <p className={`text-[13px] truncate leading-snug ${chat.unreadCount > 0 ? 'text-[#111b21] font-medium' : 'text-[#667781]'}`}>
            {msg}
        </p>
      );
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white w-full z-10 overflow-hidden relative">
      {isNewChatOpen && (
          <NewChatModal 
            onClose={() => setIsNewChatOpen(false)} 
            onSelectChat={(chatId) => {
                onSelectChat(chatId);
            }} 
          />
      )}

      {/* Header */}
      <div className="px-4 pb-2 space-y-3 sticky top-0 z-20 bg-white">
        
        {/* Search Input Refinado */}
        <div className="relative group">
          <div className="absolute inset-0 bg-[#F0F2F5] rounded-lg transition-all group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-brand-500/10 group-focus-within:border-brand-200 border border-transparent"></div>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#54656F] group-focus-within:text-brand-600 transition-colors z-10" />
          <input 
            type="text" 
            placeholder="Pesquisar ou começar uma nova conversa" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-transparent relative z-10 text-sm font-normal focus:outline-none text-[#111b21] placeholder:text-[#54656F]"
          />
          {searchTerm ? (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#54656F] hover:text-[#111b21] p-0.5 rounded-full hover:bg-gray-200 transition-all z-10"
              >
                  <X size={14} />
              </button>
          ) : (
              <button 
                onClick={() => setIsNewChatOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#54656F] hover:text-brand-600 p-1.5 rounded-lg hover:bg-white transition-all z-10"
                title="Nova Conversa"
              >
                  <Plus size={18} />
              </button>
          )}
        </div>

        {/* Tabs Modernas */}
        <div className="flex items-center gap-3 pb-1 border-b border-gray-50 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setFilter('private')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${filter === 'private' ? 'bg-[#E7FCE3] text-[#008069] border-[#E7FCE3]' : 'bg-[#F0F2F5] text-[#54656F] border-[#F0F2F5] hover:bg-[#E9EDEF]'}`}
          >
            Tudo
          </button>
          <button 
            onClick={() => setFilter('groups')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${filter === 'groups' ? 'bg-[#E7FCE3] text-[#008069] border-[#E7FCE3]' : 'bg-[#F0F2F5] text-[#54656F] border-[#F0F2F5] hover:bg-[#E9EDEF]'}`}
          >
            Grupos
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${filter === 'unread' ? 'bg-[#E7FCE3] text-[#008069] border-[#E7FCE3]' : 'bg-[#F0F2F5] text-[#54656F] border-[#F0F2F5] hover:bg-[#E9EDEF]'}`}
          >
            Não lidas
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white px-2 py-1 space-y-0.5">
        {isLoading ? (
          <div className="p-2 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-white animate-pulse">
                <div className="w-12 h-12 bg-gray-100 rounded-full"></div>
                <div className="flex-1 space-y-2 py-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-6">
            <div className="w-16 h-16 bg-[#F0F2F5] rounded-full flex items-center justify-center mb-3">
                <MessageCircle size={24} className="text-[#54656F]" />
            </div>
            <p className="text-xs font-medium text-[#54656F]">
               {filter === 'groups' ? 'Nenhum grupo encontrado' : filter === 'unread' ? 'Nenhuma mensagem não lida' : 'Nenhuma conversa iniciada'}
            </p>
            <button onClick={() => setIsNewChatOpen(true)} className="mt-3 text-xs text-[#008069] font-bold hover:underline">
                Iniciar Nova Conversa
            </button>
          </div>
        ) : (
          sortedChats.map(chat => {
            const chatId = chat.id || '';
            const isActive = selectedChatId === chatId;
            // IMPORTANT: Priority to Lead Name
            const displayName = chat.leadName || chat.pushName || chatId.split('@')[0];
            const isLead = !!chat.leadId;
            const isGroup = chat.type === 'group' || chatId.includes('@g.us');
            
            // PRIORITY FIX: CRM Avatar (leadAvatar) > WhatsApp Avatar (profilePicUrl) > Fallback
            const avatarUrl = chat.leadAvatar || chat.profilePicUrl || chat.profilePictureUrl || '';

            return (
              <div 
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-all duration-100 relative ${
                    isActive 
                    ? 'bg-[#F0F2F5]' 
                    : 'hover:bg-[#F5F6F6]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {isGroup && !avatarUrl ? (
                      <div className="w-12 h-12 rounded-full bg-[#DFE5E7] flex items-center justify-center text-gray-500 border border-transparent">
                          <Users size={20} />
                      </div>
                  ) : (
                      <Avatar src={avatarUrl} name={displayName} alt={displayName} className={`w-12 h-12 rounded-full object-cover border border-transparent ${isActive ? 'border-gray-200' : ''}`} />
                  )}
                  
                  {isLead && !isGroup && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-[#008069] text-white p-[2px] rounded-full shadow-sm z-10 border border-white" title="Lead CRM">
                          <User size={8} strokeWidth={3} />
                      </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-1 border-b border-[#F0F2F5] pb-3 group-last:border-0 h-full flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`text-[15px] truncate flex items-center gap-1.5 ${chat.unreadCount > 0 ? 'font-semibold text-[#111b21]' : 'font-normal text-[#111b21]'}`}>
                        {displayName}
                        {chat.leadName && !chat.unreadCount && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                        {chat.tags && chat.tags.includes('pinned') && <Pin size={12} className="text-[#54656F] fill-current"/>}
                    </h4>
                    <span className={`text-[11px] ${chat.unreadCount > 0 ? 'text-[#25D366] font-bold' : 'text-[#667781]'}`}>
                      {getSmartDate(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-hidden min-w-0">
                        {renderLastMessagePreview(chat)}
                    </div>
                    {chat.unreadCount > 0 && (
                        <div className="bg-[#25D366] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm animate-in zoom-in scale-100 flex-shrink-0">
                          {chat.unreadCount}
                        </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
