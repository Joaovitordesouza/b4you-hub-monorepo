import React, { memo, useState, useEffect } from 'react';
import { 
    Check, CheckCheck, Clock, RefreshCw, AlertCircle, Ban, Smile, 
    ImageIcon, FileText, Download, PlayCircle, StickyNote, Edit2, Music 
} from 'lucide-react';
import { TimelineEvent } from '../../types';
import { AudioPlayer } from './AudioPlayer';

const MessageTailIncoming = () => (
    <svg viewBox="0 0 8 13" height="13" width="8" className="absolute top-0 -left-[8px] text-white fill-current z-10 filter drop-shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
      <path d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"></path>
    </svg>
);
  
const MessageTailOutgoing = () => (
    <svg viewBox="0 0 8 13" height="13" width="8" className="absolute top-0 -right-[8px] text-[#D9FDD3] fill-current z-10 filter drop-shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
      <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
    </svg>
);

const LinkPreview = ({ text }: { text: string }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <span>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[#027eb5] hover:underline cursor-pointer break-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};

interface MessageBubbleProps {
    event: TimelineEvent;
    isMe: boolean;
    isInternal: boolean;
    isFirstInGroup: boolean;
    repliedMsg: any;
    isGroupChat?: boolean; // Prop para identificar se estamos em chat de grupo
    onRightClick: (e: React.MouseEvent, event: TimelineEvent) => void;
    onRetryMessage?: (msgId: string) => void;
    onReactMessage?: (msgId: string, emoji: string) => void;
    onReloadMedia?: (msgId: string) => void;
    onMediaTimeout?: (msgId: string) => void; // Novo fallback global
    scrollToMessage: (msgId: string) => void;
    setLightboxImage: (url: string) => void;
    setHistoryModalMsg: (event: TimelineEvent) => void;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
    event, isMe, isInternal, isFirstInGroup, repliedMsg, isGroupChat,
    onRightClick, onRetryMessage, onReactMessage, onReloadMedia, onMediaTimeout, scrollToMessage, setLightboxImage, setHistoryModalMsg
}) => {
    const marginTop = isFirstInGroup ? 'mt-2' : 'mt-0.5';
    
    // Status de mídia local com timeout
    const isFirebaseUrlOnly = event.content && event.content.includes('firebasestorage.googleapis.com') && !event.content.includes(' ') && event.content.startsWith('http');
    const initialIsProcessing = (event.mediaStatus as any) === 'PENDING' || (event.mediaStatus as any) === 'PROCESSING' || isFirebaseUrlOnly;
    
    const [localMediaError, setLocalMediaError] = useState(false);
    const [mediaRetryCount, setMediaRetryCount] = useState(0);
    
    useEffect(() => {
        if (initialIsProcessing) {
            const timer = setTimeout(() => {
                setLocalMediaError(true);
                // Chama a prop de timeout para refletir de forma global (backend)
                if (onMediaTimeout) {
                    onMediaTimeout(event.id);
                }
            }, 120000); // 120 segundos para mídias cairem em timeout e virarem EXPIRED globalmente
            return () => clearTimeout(timer);
        } else {
            setLocalMediaError(false);
        }
    }, [initialIsProcessing, event.id, onMediaTimeout]);

    let roundedClass = 'rounded-lg';
    if (isMe) {
        roundedClass = isFirstInGroup ? 'rounded-tr-none rounded-tl-lg rounded-br-lg rounded-bl-lg' : 'rounded-lg';
    } else {
        roundedClass = isFirstInGroup ? 'rounded-tl-none rounded-tr-lg rounded-br-lg rounded-bl-lg' : 'rounded-lg';
    }

    const isSticker = event.media?.isAnimated || event.messageType === 'sticker';
    
    // Fallback error UI
    if (event.status === 'failed' || event.status === 'error') {
        return (
            <div className={`flex justify-end ${marginTop} animate-in fade-in`}>
                <div className="flex items-center gap-2 group">
                    <button onClick={() => onRetryMessage && onRetryMessage(event.id)} className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-sm active:scale-95" title="Tentar Novamente">
                        <RefreshCw size={14}/>
                    </button>
                    <div className="bg-red-50 border border-red-100 text-red-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2 max-w-[80%] shadow-[0_2px_10px_-3px_rgba(220,38,38,0.2)]">
                        <AlertCircle size={14} className="shrink-0"/>
                        <span>{event.content || event.errorMessage || 'Falha no envio'}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Sticker UI isolated
    if (isSticker) {
        const media = event.media;
        return (
            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${marginTop} animate-in fade-in zoom-in-95 duration-200 w-full`}>
                <div className="relative cursor-pointer group" onContextMenu={(e) => !isInternal && onRightClick(e, event)}>
                    {media?.url ? (
                        <img src={media.url} alt="Sticker" className="w-32 h-32 object-contain filter drop-shadow-md hover:scale-105 transition-transform" />
                    ) : (
                        <div className="w-32 h-32 bg-gray-100/50 backdrop-blur-sm rounded-2xl flex items-center justify-center text-gray-400 animate-pulse"><Smile size={32} /></div>
                    )}
                    <div className="absolute bottom-1 right-2 text-[10px] text-gray-500 bg-white/80 backdrop-blur-md px-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (event.isDeleted) {
            const deleteMessage = event.deletedForEveryone 
               ? "Esta mensagem foi apagada para todos"
               : "Mensagem apagada";
            
            return (
                <div className={`flex items-center gap-2 text-gray-500 italic text-[15px] py-1 select-none ${event.deletedForEveryone ? 'opacity-100' : 'opacity-70'}`}>
                    <Ban size={15} className="text-gray-400" /> <span>{deleteMessage}</span>
                </div>
            );
        }
  
        const media = event.media;
        const messageType = event.messageType || media?.type;
  
        const isMediaType = ['image', 'video', 'audio', 'document', 'sticker', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
            .includes(messageType || '');

        const getMediaState = (ev: TimelineEvent) => {
            // [FIX] Normalização de status (Firestore pode ter 'media.mediaStatus' ou raiz 'mediaStatus')
            const statusRaw = ev.mediaStatus || ev.media?.mediaStatus;
            const status = typeof statusRaw === 'string' ? statusRaw.toUpperCase() : '';
            
            // Verificação de URL válida (não vazia e não expirada)
            const url = ev.media?.url;
            const hasValidUrl = url && url !== 'EXPIRED' && url !== 'ERROR' && url.startsWith('http');

            // Se for mensagem otimista e tivermos a URL do upload, mostrar imediatamente
            if (ev.isOptimistic && hasValidUrl) return 'READY';

            // Quando estamos nós mesmos enviando uma mídia, ela fica como pending na fila Outbox.
            // Para não piscar nem ficar "Expirada" nesse meio tempo local:
            if (ev.status === 'pending' || (ev as any).status === 'sending') {
                if (isMediaType && !hasValidUrl) return 'LOADING';
                if (isMediaType && hasValidUrl) return 'READY';
            }

            // [CRITICAL] Se o status for explicitamente PROCESSING ou PENDING, sempre mostrar Loading
            if (status === 'PROCESSING' || status === 'PENDING') return 'LOADING';

            // Se for EXPIRED ou ERROR, mostrar estado de erro
            if (status === 'EXPIRED' || url === 'EXPIRED') return 'EXPIRED';
            if (status === 'ERROR' || status === 'FAILED' || url === 'ERROR') return 'ERROR';

            // Se já temos a URL válida e não é um status de erro/loading, está pronto
            if (hasValidUrl) return 'READY';
            
            // [FALLBACK] Se é mensagem de mídia (tipo definido) ou possui APENAS uma URL de firebase na content, assumir LOADING
            const hasFirebaseUrlString = ev.content && ev.content.includes('firebasestorage.googleapis.com') && !ev.content.includes(' ') && ev.content.startsWith('http');
            
            if ((isMediaType || hasFirebaseUrlString) && !hasValidUrl) {
                // Timeout local de segurança: se mensagem tem > 2 min e ainda está sem URL, considerar erro/expirado
                const msgAge = Date.now() - (typeof ev.timestamp === 'number' ? ev.timestamp : 0);
                if (msgAge > 120000) return 'EXPIRED'; 
                
                return 'LOADING';
            }
            
            return 'UNKNOWN';
        };

        const mediaState = getMediaState(event);

        if (mediaState === 'LOADING') {
             if (messageType === 'audio' || messageType === 'audioMessage') {
                 return (
                    <div className="p-3 flex items-center gap-3 bg-gray-50/80 rounded-xl min-w-[250px] border border-gray-100 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        <div className="flex-1 flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-brand-100/50 flex items-center justify-center shrink-0">
                                <div className="w-5 h-5 border-[2px] border-brand-500 border-r-transparent rounded-full animate-spin"></div>
                            </div>
                            <div className="flex-1 flex flex-col gap-1.5 justify-center">
                                <div className="flex gap-1 items-center h-4">
                                   <div className="w-1.5 h-full bg-brand-200 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                                   <div className="w-1.5 h-2/3 bg-brand-200 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                   <div className="w-1.5 h-full bg-brand-200 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
                                   <div className="w-1.5 h-1/2 bg-brand-200 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                 );
             } else if (messageType === 'document' || messageType === 'documentMessage') {
                 return (
                    <div className="flex flex-col mt-1 min-w-[250px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite] z-10"></div>
                        <div className="flex items-center gap-3 p-3 rounded-xl border bg-gray-50 border-gray-200 mb-1 relative">
                            <div className="bg-gray-200/80 p-2.5 rounded-lg w-10 h-10 shrink-0 flex items-center justify-center">
                                <FileText size={20} className="text-gray-400 opacity-50"/>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                                <div className="h-2.5 bg-gray-200/80 rounded w-3/4"></div>
                                <div className="h-2 bg-gray-200/80 rounded w-1/4"></div>
                            </div>
                            <div className="w-5 h-5 border-[2px] border-brand-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                        </div>
                    </div>
                 );
             } else {
                 return (
                    <div className="relative overflow-hidden rounded-xl mt-0.5 mb-1 bg-[#F0F2F5] min-w-[240px] sm:min-w-[280px] min-h-[200px] sm:min-h-[250px] flex flex-col items-center justify-center border border-black/5 shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        
                        <div className="bg-white/50 p-3 rounded-full mb-3 z-10 shadow-sm border border-white/60 backdrop-blur-sm">
                            <ImageIcon size={28} className="text-gray-400 opacity-70" />
                        </div>
                        
                        <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden z-10 mb-2">
                            <div className="w-full h-full bg-brand-400 origin-left animate-[scaleX_1.5s_infinite_ease-in-out] rounded-full"></div>
                        </div>
                        <span className="text-[12px] text-gray-500 font-medium z-10 drop-shadow-sm uppercase tracking-wider">Processando</span>
                    </div>
                 );
             }
        }

        if (mediaState === 'EXPIRED') {
            return (
                <div className="p-3 flex items-center gap-3 bg-red-50/80 rounded-lg border border-red-100 min-w-[240px] shadow-inner mt-1 mb-1 relative overflow-hidden group">
                    <AlertCircle size={20} className="text-red-400 shrink-0" />
                    <div className="flex flex-col flex-1">
                        <span className="text-[13px] text-red-700 font-semibold">Mídia expirada</span>
                        <span className="text-[11px] text-red-500 leading-tight mt-0.5">O arquivo não está mais disponível.</span>
                    </div>
                    {onReloadMedia && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onReloadMedia(event.id); }}
                            className="bg-white border border-red-200 text-red-600 px-2 py-1 rounded text-[11px] font-medium shadow-sm hover:bg-red-50 transition-colors z-10 whitespace-nowrap active:scale-95"
                        >
                            Tentar Baixar
                        </button>
                    )}
                </div>
            );
        }

        if (mediaState === 'ERROR') {
            return (
                <div className="p-3 flex items-center gap-3 bg-orange-50/80 rounded-lg border border-orange-100 min-w-[200px] shadow-inner mt-1 mb-1">
                    <AlertCircle size={20} className="text-orange-400 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-[13px] text-orange-700 font-semibold">Erro ao baixar mídia</span>
                        <span className="text-[11px] text-orange-500 leading-tight">Falha no processamento.</span>
                    </div>
                </div>
            );
        }

        // --- READY STATE ---
        if (messageType === 'audio' || messageType === 'audioMessage') {
            return (
                <div className="w-full max-w-[300px] overflow-hidden">
                    <AudioPlayer src={media?.url || ''} isMe={isMe} duration={media?.duration || '0:00'} />
                </div>
            );
        }
  
        if (messageType === 'document' || messageType === 'documentMessage') {
            return (
                <div className="flex flex-col mt-1">
                    <div 
                        className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} cursor-pointer hover:shadow-md transition-all mb-1 group`}
                        onClick={() => media?.url && window.open(media.url, '_blank')}
                    >
                        <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white p-2.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-gray-800 truncate leading-tight mb-0.5">{media?.fileName || 'Documento'}</p>
                            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider line-clamp-1">{media?.mimetype || 'ARQUIVO'}</p>
                        </div>
                        <div className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full shadow-sm opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                            <Download size={16} strokeWidth={2.5} />
                        </div>
                    </div>
                    {media?.caption && <p className="text-[15px] mt-1 px-1 whitespace-pre-wrap text-[#111b21]">{media.caption}</p>}
                </div>
            );
        }
  
        if (messageType === 'image' || messageType === 'imageMessage' || messageType === 'video' || messageType === 'videoMessage') {
            const isVideo = messageType === 'video' || messageType === 'videoMessage';
            return (
                <div className="relative group overflow-hidden rounded-xl mt-0.5 mb-1 bg-gray-100/50">
                    {media?.url ? (
                        isVideo ? (
                            <div className="relative cursor-pointer">
                                <video src={media.url} controls className="max-w-full max-h-[320px] object-cover rounded-xl shadow-sm border border-black/5 animate-in fade-in duration-500" />
                            </div>
                        ) : (
                            <div className="cursor-pointer overflow-hidden rounded-xl border border-black/5" onClick={(e) => { e.stopPropagation(); setLightboxImage(media.url || ''); }}>
                                <img 
                                    src={media.url} 
                                    alt="Mídia" 
                                    className="max-w-[300px] max-h-[360px] w-auto h-auto object-cover hover:scale-[1.02] transition-transform duration-300 animate-in fade-in duration-500" 
                                    loading="lazy" 
                                />
                            </div>
                        )
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 flex items-center justify-center text-gray-300 animate-pulse rounded-xl"><ImageIcon size={32} /></div>
                    )}
                    {media?.caption && <p className="text-[15px] mt-2 px-1 text-[#111b21] whitespace-pre-wrap leading-relaxed">{media.caption}</p>}
                </div>
            );
        }
  
        const textColorClass = isMe ? 'text-[#111b21]' : 'text-[#111b21]';
        
        // PREVENÇÃO DE URL VAZADA E ETERNO LOADING
        // Se a mensagem possui conteúdo mas esse conteúdo for SÓ a URL do Firebase que deveria ser mídia (E o webhook não tipou a media ainda):
        const contentStr = event.content?.trim() || '';
        const isContentOnlyFirebaseUrl = contentStr.includes('firebasestorage.googleapis.com') && !contentStr.includes(' ') && contentStr.startsWith('http');

        if (!event.content && !media) {
            return <p className="text-[13px] italic opacity-50">Mensagem sem texto</p>;
        }

        // Se ainda for pra ser enviada, mas o content cru escapou (e nós já a retemos acima com isMedia)
        // Isso cobre o caso em que não cai no loading acima.
        if (isContentOnlyFirebaseUrl || (isMediaType && contentStr && contentStr.startsWith('http'))) {
            // Em vez de mostrar a string bruta gigante do Storage, nós caímos num loading estático temporário
            return (
                <div className="relative overflow-hidden rounded-xl mt-0.5 mb-1 bg-[#F0F2F5] min-w-[200px] min-h-[60px] flex items-center justify-center border border-black/5 p-3">
                    <div className="flex gap-2 items-center">
                         <div className="w-4 h-4 border-[2px] border-brand-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                         <span className="text-[12px] text-gray-500 font-medium">Preparando envio...</span>
                    </div>
                </div>
            );
        }
  
        return (
          <p className={`whitespace-pre-wrap leading-relaxed text-[15px] ${textColorClass} selection:bg-brand-200 font-normal tracking-[-0.01em]`}>
              {event.content ? <LinkPreview text={event.content} /> : ''}
          </p>
        );
    };

    return (
        <div 
            id={`msg-${event.id}`}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group ${marginTop} relative animate-in fade-in slide-in-from-bottom-2 duration-300 w-full`}
            onContextMenu={(e) => !isInternal && onRightClick(e, event)}
        >
            <div 
                className={`relative max-w-[85%] md:max-w-[70%] lg:max-w-[65%] flex flex-col shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${roundedClass}
                    ${isInternal ? 'bg-yellow-50 border border-yellow-200' : isMe ? 'bg-[#D9FDD3]' : 'bg-white'} 
                    ${event.status === 'pending' || (event as any).status === 'sending' ? 'opacity-85 scale-[0.98]' : 'opacity-100 scale-100'}
                    transition-all duration-300 origin-bottom
                `}
            >
                {!isInternal && (
                    <button
                        onClick={(e) => onRightClick(e, event)}
                        className={`absolute top-0 right-0 z-20 p-1.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-all shadow-none bg-gradient-to-bl from-black/5 to-transparent ${
                            isMe ? 'text-[#005c4b]' : 'text-gray-500'
                        }`}
                    >
                        <svg viewBox="0 0 18 18" width="18" height="18" className="fill-current opacity-60 hover:opacity-100">
                            <path d="m3.3 5.3 5.7 5.7 5.7-5.7 1.4 1.4-7.1 7.1-7.1-7.1z"></path>
                        </svg>
                    </button>
                )}

                {isInternal && (
                    <div className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <StickyNote size={8} /> INTERNA
                    </div>
                )}

                {isFirstInGroup && !isInternal && (isMe ? <MessageTailOutgoing /> : <MessageTailIncoming />)}

                {/* Bloco de Mensagem Citada (Quoted) */}
                {event.quoted && !event.isDeleted && (
                    <div 
                        onClick={() => {
                            const targetId = event.quoted?.key?.id;
                            if (targetId) scrollToMessage(targetId);
                        }}
                        className={`
                            mx-1.5 mt-1.5 mb-0.5 rounded-lg overflow-hidden cursor-pointer relative
                            flex flex-col justify-center
                            bg-black/5 hover:bg-black/10 transition-colors
                            border-l-[4px] border-l-[#06cf9c]
                            p-2 min-w-[140px]
                        `}
                    >
                        <span className="text-[12px] font-bold text-[#06cf9c] mb-0.5 tracking-tight">{event.quoted?.authorName || 'Mensagem'}</span>
                        <span className="text-[13px] text-gray-600 line-clamp-1 opacity-90 leading-snug">{event.quoted?.content || 'Mídia'}</span>
                    </div>
                )}

                <div className={`px-2 pt-1.5 pb-1 relative min-w-[90px]`}>
                    {/* Header do Autor (Apenas em grupos para mensagens de terceiros) */}
                    {isGroupChat && !isMe && !isInternal && isFirstInGroup && (
                        <div className="mb-1 px-0.5">
                            <span 
                                className="text-[12.5px] font-bold leading-none block hover:underline cursor-default"
                                style={{ 
                                    color: (() => {
                                        // Gerador de cor determinística baseada no ID do autor
                                        const colors = [
                                            '#3498db', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', 
                                            '#1abc9c', '#f1c40f', '#d35400', '#c0392b', '#16a085'
                                        ];
                                        const id = event.authorId || '0';
                                        let hash = 0;
                                        for (let i = 0; i < id.length; i++) {
                                            hash = id.charCodeAt(i) + ((hash << 5) - hash);
                                        }
                                        return colors[Math.abs(hash) % colors.length];
                                    })()
                                }}
                            >
                                {event.authorName || 'Participante'}
                            </span>
                        </div>
                    )}

                    {renderContent()}
                    
                    {/* Metadados: Hora, Edição, Status */}
                    <div className="flex justify-end items-center gap-1 select-none float-right ml-3 -mb-0.5 relative top-1 h-4">
                        {event.isEdited && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setHistoryModalMsg(event); }}
                                className={`text-[10px] flex items-center gap-0.5 font-medium text-[#667781] hover:text-brand-600 transition-colors bg-black/5 px-1.5 rounded-full`} 
                                title="Ver histórico de edições"
                            >
                                <Edit2 size={10} /> Editado
                            </button>
                        )}
                        <span className={`text-[11px] font-normal tracking-wide ${isInternal ? 'text-yellow-700' : 'text-[#667781]'}`}>
                            {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        
                        {isMe && !event.isDeleted && !isInternal && (
                            <span className={`text-[14px] flex items-center ml-0.5`}>
                                {(event.status === 'pending') && <Clock size={12} className="text-[#9e9e9e]" />}
                                {(event.status === 'sent') && <Check size={15} strokeWidth={2.5} className="text-[#9e9e9e]" />}
                                {(event.status === 'delivered') && <CheckCheck size={15} strokeWidth={2.5} className="text-[#9e9e9e]" />} 
                                {(event.status === 'read') && <CheckCheck size={15} strokeWidth={2.5} className="text-[#2196f3]" />}
                                {(event.status === 'played') && <Music size={13} strokeWidth={2.5} className="text-[#2196f3]" />}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Reactions Badges (Interactive) */}
                {event.reactions && event.reactions.length > 0 && (
                    <div className="absolute -bottom-2.5 right-2 flex gap-1 z-20">
                        {Object.entries(
                            event.reactions.reduce((acc: Record<string, { count: number, senders: string[], hasMe: boolean }>, reaction: any) => {
                                const emoji = typeof reaction === 'string' ? reaction : reaction.emoji;
                                const sender = typeof reaction === 'string' ? '' : reaction.sender;
                                const isMyReaction = sender === 'ME' || (sender === '' && isMe);
                                
                                if (!acc[emoji]) {
                                    acc[emoji] = { count: 0, senders: [], hasMe: false };
                                }
                                acc[emoji].count += 1;
                                if (sender && sender !== 'ME') acc[emoji].senders.push(sender);
                                if (isMyReaction) acc[emoji].hasMe = true;
                                
                                return acc;
                            }, {})
                        ).map(([emoji, data], i) => {
                            const { count, senders, hasMe } = data as { count: number, senders: string[], hasMe: boolean };
                            let title = hasMe ? "Você" : "";
                            if (senders.length > 0) {
                                title += (title ? ", " : "") + senders.join(", ");
                            }
                            if (hasMe) title += " (Clique para remover)";
                            
                            return (
                                <button 
                                    key={i} 
                                    title={title}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onReactMessage && hasMe) onReactMessage(event.id, '');
                                    }}
                                    className={`bg-white border rounded-full px-1.5 py-0.5 text-[11px] shadow-sm animate-in zoom-in-95 duration-200 flex items-center gap-1 leading-none min-w-[24px] text-center transition-all hover:scale-110 hover:-translate-y-0.5
                                        ${hasMe ? 'border-brand-300 bg-brand-50 ring-2 ring-white cursor-pointer' : 'border-gray-200 ring-2 ring-white cursor-default'}
                                    `}
                                >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="text-[9px] font-bold text-gray-500">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
    return (
        prevProps.event.id === nextProps.event.id &&
        prevProps.event.status === nextProps.event.status &&
        prevProps.event.content === nextProps.event.content &&
        prevProps.event.isDeleted === nextProps.event.isDeleted &&
        prevProps.event.isEdited === nextProps.event.isEdited &&
        prevProps.event.reactions?.length === nextProps.event.reactions?.length &&
        prevProps.isFirstInGroup === nextProps.isFirstInGroup
    );
});
