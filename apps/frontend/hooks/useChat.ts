import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import firebase from '@b4you/firebase';
import { db, functions, fieldValue, auth, Timestamp } from '@b4you/firebase';
import { EvolutionChat, TimelineEvent } from '@b4you/types';
import { useToast } from '../contexts/ToastContext';

// Helper para Timestamp priorizando formato numérico (Unix MS)
const parseTimestamp = (val: any): number => {
    if (typeof val === 'number') {
        return val < 100000000000 ? val * 1000 : val;
    }
    if (!val) return 0;
    
    if (typeof val === 'object') {
        if (typeof val.toMillis === 'function') return val.toMillis();
        const seconds = val.seconds !== undefined ? val.seconds : val._seconds;
        if (typeof seconds === 'number') return seconds * 1000;
    }
    
    if (typeof val === 'string') {
        if (/^\d+$/.test(val)) {
           const num = Number(val);
           return num < 100000000000 ? num * 1000 : num;
        }
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date.getTime();
    }
    
    return Date.now();
};

// Função Robusta de Extração de Texto (Alinhada ao Backend v8.0)
const extractTextContent = (data: any): string => {
    if (!data) return '';

    // --- TIER 1: Campos Oficiais do Backend (Prioridade Máxima) ---
    if (typeof data.text === 'string' && data.text.trim() !== '') return data.text;
    
    // --- TIER 2: Campos Legados/Outbox ---
    if (typeof data.content === 'string' && data.content.trim() !== '') return data.content;
    if (typeof data.body === 'string' && data.body.trim() !== '') return data.body;
    if (typeof data.caption === 'string' && data.caption.trim() !== '') return data.caption;
    if (typeof data.message === 'string' && data.message.trim() !== '') return data.message;

    // --- TIER 3: Estrutura Raw (Baileys/Evolution Deep Dive) ---
    let msgObject = data.message || data;

    if (msgObject.viewOnceMessage?.message) msgObject = msgObject.viewOnceMessage.message;
    if (msgObject.viewOnceMessageV2?.message) msgObject = msgObject.viewOnceMessageV2.message;
    if (msgObject.ephemeralMessage?.message) msgObject = msgObject.ephemeralMessage.message;
    if (msgObject.documentWithCaptionMessage?.message) msgObject = msgObject.documentWithCaptionMessage.message;
    
    if (msgObject.editedMessage?.message?.protocolMessage?.editedMessage) {
        msgObject = msgObject.editedMessage.message.protocolMessage.editedMessage;
    }
    if (msgObject.protocolMessage?.editedMessage) {
        msgObject = msgObject.protocolMessage.editedMessage;
    }

    if (typeof msgObject.conversation === 'string' && msgObject.conversation) return msgObject.conversation;
    if (msgObject.extendedTextMessage?.text) return msgObject.extendedTextMessage.text;
    if (msgObject.imageMessage?.caption) return msgObject.imageMessage.caption;
    if (msgObject.videoMessage?.caption) return msgObject.videoMessage.caption;
    if (msgObject.documentMessage?.caption) return msgObject.documentMessage.caption;
    
    return '';
};

// Função para remover campos undefined e null (Firestore não aceita nenhum dos dois)
const sanitizePayload = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(sanitizePayload);
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, sanitizePayload(v)])
        );
    }
    return obj;
};

export const useChat = (instanceId: string | null, selectedChatId: string | null) => {
  const [chats, setChats] = useState<EvolutionChat[]>([]);
  const [messages, setMessages] = useState<TimelineEvent[]>([]);
  const [localMessages, setLocalMessages] = useState<TimelineEvent[]>([]); 
  
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [limitCount, setLimitCount] = useState(50);
  const [chatLimitCount, setChatLimitCount] = useState(100); 
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [isOffline, setIsOffline] = useState(false); 
  
  const { addToast } = useToast();
  const prevUnreadCountsRef = useRef<Record<string, number>>({});

  const mapMessageDoc = useCallback((doc: any): TimelineEvent => {
      const data = doc.data();
      const msgId = doc.id;
      
      const mediaInfo = data.media || {}; 
      const mediaUrl = mediaInfo.url || data.mediaUrl || data.url;

      const isMediaMessage = !!(data.message?.imageMessage || data.message?.videoMessage || data.message?.audioMessage || data.message?.documentMessage || data.message?.stickerMessage);
      const mediaStatus = mediaInfo.mediaStatus || data.mediaStatus || (mediaUrl ? 'UPLOADED' : (isMediaMessage ? 'PENDING' : undefined));
      
      let mediaType = data.type; 
      
      if (!mediaType || mediaType === 'unknown' || mediaType === 'conversation') {
          const msgData = data.message || data;
          if (msgData.imageMessage) mediaType = 'image';
          else if (msgData.videoMessage) mediaType = 'video';
          else if (msgData.audioMessage) mediaType = 'audio';
          else if (msgData.documentMessage) mediaType = 'document';
          else if (msgData.stickerMessage) mediaType = 'sticker';
          else if (mediaUrl) mediaType = 'image'; 
          else mediaType = 'text';
      }

      const isMe = data.fromMe === true || data.key?.fromMe === true;
      
      let mediaObj = undefined;
      const hasMedia = mediaUrl || (mediaType !== 'text' && mediaType !== undefined);
      
      let resolvedContent = extractTextContent(data);

      if (hasMedia) {
          mediaObj = {
              url: mediaStatus === 'EXPIRED' ? '' : mediaUrl,
              mimetype: data.mimetype || 'application/octet-stream',
              fileName: data.fileName || 'Arquivo',
              caption: resolvedContent,
              duration: data.duration,
              isAnimated: data.isAnimated,
              type: mediaType as any
          };
      }

      let status: any = data.status;
      if (status === 1 || status === 'PENDING') status = 'pending';
      else if (status === 2 || status === 'SENT') status = 'sent';
      else if (status === 3 || status === 'DELIVERED' || status === 'RECEIVED') status = 'delivered';
      else if (status === 4 || status === 'READ') status = 'read';
      else if (status === 5 || status === 'PLAYED') status = 'played';
      else if (!status && isMe) status = 'sent';
      else if (!status && !isMe) status = 'read';

      const timestamp = data.timestamp ? parseTimestamp(data.timestamp) : parseTimestamp(data.messageTimestamp || data.createdAt);

      let quoted = undefined;
      if (data.quotedMessage || data.quotedId || data.contextInfo?.quotedMessage) {
          quoted = {
              key: {
                  id: data.quotedMessage?.id || data.quotedId || data.contextInfo?.stanzaId,
                  remoteJid: data.quotedMessage?.sender || data.quotedRemoteJid || data.contextInfo?.participant,
                  fromMe: (data.quotedMessage?.fromMe || data.quotedParticipant === 'ME')
              },
              content: data.quotedMessage?.preview || data.quotedContent,
              authorName: data.quotedMessage?.sender || data.quotedAuthor
          };
      }

      const participantJid = data.key?.participant || data.participant || data.sender || '';
      let authorName = data.pushName || data.senderName;
      if (!authorName && participantJid) {
          const numberPart = participantJid.split('@')[0];
          authorName = `+${numberPart.substring(0,2)} ${numberPart.substring(2,4)} ${numberPart.substring(4,8)}-${numberPart.substring(8)}`;
      } else if (!authorName) {
          authorName = 'Desconhecido';
      }

      return {
        id: msgId,
        tempId: data.tempId,
        type: 'WHATSAPP_MSG', 
        timestamp: timestamp, 
        authorId: isMe ? 'ME' : (participantJid || 'CLIENT'), 
        authorName: authorName,
        content: (mediaObj?.url && (resolvedContent === mediaObj.url)) ? '' : resolvedContent, 
        status: status,
        
        key: {
            id: msgId,
            remoteJid: data.key?.remoteJid || data.remoteJid,
            fromMe: isMe,
            participant: participantJid
        },
        pushName: data.pushName,
        messageType: mediaType,
        media: mediaObj,
        quoted: quoted,
        
        isDeleted: data.isDeleted === true,
        deletedForEveryone: data.deletedForEveryone === true,
        deletedAt: data.deletedAt,
        isEdited: data.isEdited === true,
        editedAt: data.editedAt,
        reactions: Array.isArray(data.reactions) ? data.reactions : [], 
        oldMessages: data.oldMessages || []
      } as TimelineEvent;
  }, []);

  // [RESILIÊNCIA] Conjunto de IDs de chats que foram interagidos nesta sessão
  // Isso garante que eles nunca sumam da sidebar mesmo que saiam do Top 50 da query principal
  const sessionActiveChatIds = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (selectedChatId) {
      sessionActiveChatIds.current.add(selectedChatId);
    }
  }, [selectedChatId]);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  useEffect(() => {
      const unsubscribeAuth = auth.onAuthStateChanged(user => {
          setCurrentUser(user);
      });
      return () => unsubscribeAuth();
  }, []);

  // Listar Chats
  useEffect(() => {
    if (!instanceId || typeof instanceId !== 'string' || instanceId === 'undefined' || !currentUser) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    if (chatLimitCount === 50) setLoadingChats(true);

    const unsubscribe = db.collection('instances')
      .doc(instanceId)
      .collection('chats')
      .orderBy('lastMessageTimestamp', 'desc')
      .limit(chatLimitCount) 
      .onSnapshot((snapshot) => {
        setIsOffline(snapshot.metadata.fromCache);
        
        const loadedChats = snapshot.docs.map(doc => {
            const data = doc.data();
            const resolvedLastMessageAt = 
                data.lastMessageTimestampMillis || 
                parseTimestamp(data.lastMessageAt) || 
                parseTimestamp(data.lastMessageTimestamp) || 
                parseTimestamp(data.timestamp) || 
                parseTimestamp(data.updatedAt) || 
                parseTimestamp(data.createdAt) || 0;

            return {
              id: doc.id,
              ...data,
              remoteJid: data.remoteJid || doc.id,
              pushName: data.pushName || data.leadName || doc.id.split('@')[0],
              lastMessageAt: resolvedLastMessageAt,
              profilePicUrl: data.profilePictureUrl || data.profilePicUrl || data.photoUrl || data.image
            };
        }) as EvolutionChat[];

        loadedChats.forEach(chat => {
            const prevCount = prevUnreadCountsRef.current[chat.id] || 0;
            const currentCount = chat.unreadCount || 0;
            
            if (currentCount > prevCount && chat.id !== selectedChatId) {
                try {
                    const audio = new Audio('/notification.mp3'); 
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                } catch (e) {}

                addToast({
                    type: 'message',
                    title: chat.pushName || 'Nova Mensagem',
                    message: chat.lastMessagePreview || chat.lastMessage || 'Você recebeu uma nova mensagem',
                    avatarUrl: chat.profilePicUrl,
                    duration: 4000
                });
            }
            prevUnreadCountsRef.current[chat.id] = currentCount;
        });

        // [SAFETY NET] Se o chat selecionado ou chats interagidos ficaram fora do limite da query 
        // (ex: pending serverTimestamp ou fora das Top 50), injeta-os de volta.
        setChats(prev => {
            const loadedIds = new Set(loadedChats.map(c => c.id));
            const extraChats: EvolutionChat[] = [];
            
            sessionActiveChatIds.current.forEach(id => {
               if (!loadedIds.has(id)) {
                   const ghost = prev.find(c => c.id === id);
                   if (ghost) {
                       console.log('[CHAT LIST] Chat interagido fora da query, reinjetando:', id);
                       extraChats.push({ ...ghost, lastMessageAt: (ghost.lastMessageAt || 0) });
                   }
               }
            });

            if (extraChats.length > 0) {
                return [...loadedChats, ...extraChats];
            }
            return loadedChats;
        });
        setLoadingChats(false);
        setLoadingMoreChats(false);
        
        if (snapshot.size < chatLimitCount) setHasMoreChats(false);
        else setHasMoreChats(true);
      }, (error) => {
        if (error.code !== 'permission-denied') {
            console.error("Erro ao carregar chats:", error);
        } else {
            console.warn("Snapshot Chats bloqueado por permissão.");
        }
        setLoadingChats(false);
        setLoadingMoreChats(false);
      });
    return () => unsubscribe();
  }, [instanceId, chatLimitCount, currentUser, selectedChatId, addToast]);

  const loadMoreChats = useCallback(() => {
      if (!instanceId || !hasMoreChats || loadingMoreChats || chats.length === 0) return;
      setLoadingMoreChats(true);
      setChatLimitCount(prev => prev + 50);
  }, [instanceId, hasMoreChats, loadingMoreChats, chats.length]);

  useEffect(() => {
      setLimitCount(50);
      setMessages([]);
      setLocalMessages([]); 
      setHasMore(true);
  }, [selectedChatId]);

  // Listar Mensagens
  useEffect(() => {
    if (!instanceId || !selectedChatId || typeof instanceId !== 'string' || instanceId === 'undefined' || !currentUser) {
      setMessages([]);
      return;
    }

    if (limitCount === 50) setLoadingMessages(true);
    
    const unsubscribe = db.collection('instances')
      .doc(instanceId)
      .collection('chats')
      .doc(selectedChatId)
      .collection('messages')
      .orderBy('timestamp', 'desc') 
      .limit(limitCount) 
      .onSnapshot((snapshot) => {
        setMessages((prev: TimelineEvent[]) => {
            const mapped = snapshot.docs.map(mapMessageDoc).reverse();
            
            const serverIds = new Set(mapped.map((m: any) => m.id));
            const serverTempIds = new Set(mapped.map((m: any) => m.tempId).filter(Boolean));

            setLocalMessages(currentLocal => {
                const filtered = currentLocal.filter((localMsg: any) => 
                    !serverIds.has(localMsg.id) && !serverTempIds.has(localMsg.id)
                );
                return filtered.length !== currentLocal.length ? filtered : currentLocal;
            });

            if (prev.length !== mapped.length) return mapped;
            
            let hasChanges = false;
            for(let i=0; i < prev.length; i++) {
                const p = prev[i] as TimelineEvent;
                const m = mapped[i] as TimelineEvent;
                if (
                    p.id !== m.id || 
                    p.status !== m.status ||
                    p.isEdited !== m.isEdited ||
                    p.isDeleted !== m.isDeleted ||
                    p.reactions?.length !== m.reactions?.length ||
                    p.tempId !== m.tempId ||
                    p.media?.url !== m.media?.url ||
                    (p.media as any)?.mediaStatus !== (m.media as any)?.mediaStatus ||
                    p.content !== m.content
                ) {
                    hasChanges = true;
                    break;
                }
            }
            return hasChanges ? mapped : prev;
        });

        setLoadingMessages(false);
        setLoadingMore(false);
        if (snapshot.size < limitCount) setHasMore(false);
        else setHasMore(true);
      }, (error) => {
        if (error.code !== 'permission-denied') {
            console.error("Erro ao carregar mensagens:", error);
        } else {
            console.warn("Snapshot Mensagens bloqueado por permissão.");
        }
        setLoadingMessages(false);
        setLoadingMore(false);
      });
    return () => unsubscribe();
  }, [instanceId, selectedChatId, mapMessageDoc, limitCount, currentUser]);

  const loadPreviousMessages = async () => {
      if (!instanceId || !selectedChatId || !hasMore || loadingMore || messages.length === 0) return;
      setLoadingMore(true);
      setLimitCount(prev => prev + 50);
  };

  // --- SEND MESSAGE (via OUTBOX — Resiliente com Retry automático do Worker) ---
  const sendMessage = async (
      text: string, 
      type: string = 'text', 
      mediaUrl?: string, 
      quotedMsg?: { id: string, author: string, content: string, senderJid?: string },
      mediaOptions?: { fileName?: string, mimetype?: string }
  ) => {
    if (!instanceId || !selectedChatId) {
        console.warn("Tentativa de envio sem instância ou chat selecionado.");
        return;
    }

    if (type !== 'text' && !mediaUrl) {
        throw new Error(`É obrigatório fornecer a mídia para enviar um ${type}.`);
    }

    let finalType = type;
    if (mediaUrl && (type === 'text' || !type)) {
        finalType = 'image';
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: TimelineEvent = {
        id: tempId,
        tempId: tempId,
        type: 'WHATSAPP_MSG',
        authorId: 'ME', 
        content: text || '',
        timestamp: Date.now(),
        status: 'pending', 
        isOptimistic: true,
        messageType: finalType, 
        media: mediaUrl ? {
            url: mediaUrl,
            mediaStatus: 'UPLOADED', 
            mimetype: mediaOptions?.mimetype || (finalType === 'audio' ? 'audio/ogg' : 'application/octet-stream'),
            type: finalType as any,
            caption: text,
            isLoading: false,
            isExpired: false
        } : undefined,
        metadata: mediaUrl ? {
            mediaType: finalType as any,
            mediaUrl: mediaUrl,
            caption: text,
            fileName: mediaOptions?.fileName
        } : undefined, 
        replyTo: quotedMsg ? { 
            id: quotedMsg.id, 
            authorName: quotedMsg.author, 
            content: quotedMsg.content 
        } : undefined
    };

    setLocalMessages(prev => [optimisticMessage, ...prev]);

    // [FIX] Preservar JID de grupo (@g.us) e normalizar apenas JIDs privados
    let recipientJid = selectedChatId;
    if (!selectedChatId.includes('@g.us') && !selectedChatId.includes('@s.whatsapp.net')) {
        recipientJid = `${selectedChatId.replace(/\D/g, '')}@s.whatsapp.net`;
    }

    // [OUTBOX] Payload do documento na collection outbox — Worker processa com retry
    const outboxPayload: any = {
        to: recipientJid,
        type: finalType,
        content: mediaUrl || text || '',
        caption: mediaUrl ? (text || '') : undefined,
        tempId: tempId,
        status: 'PENDING',
        createdAt: fieldValue.serverTimestamp()
    };

    // [QUOTE/REPLY] Propaga informação de citação para o Worker
    if (quotedMsg) {
        outboxPayload.options = {
            quoted: {
                id: quotedMsg.id,
                text: quotedMsg.content || '',
                sender: (quotedMsg as any).senderJid || (quotedMsg as any).authorJid || ''
            }
        };
    }

    // [MEDIA] Metadados extras de mídia (fileName, mimetype, ptt flag)
    if (mediaUrl && mediaOptions) {
        outboxPayload.mediaOptions = {
            fileName: mediaOptions.fileName,
            mimetype: mediaOptions.mimetype
        };
    }
    if (finalType === 'audio') {
        outboxPayload.options = {
            ...(outboxPayload.options || {}),
            ptt: true
        };
    }

    try {
        // [SLA] Cálculo de tempo de resposta (mantido da versão anterior)
        const lastMsgQuery = await db.collection('instances').doc(instanceId)
            .collection('chats').doc(selectedChatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        
        const lastMsg = lastMsgQuery.empty ? null : lastMsgQuery.docs[0].data();
        const isResponseToClient = lastMsg && !lastMsg.fromMe && !lastMsg.key?.fromMe;

        if (isResponseToClient) {
            const lastClientMsgAt = parseTimestamp(lastMsg.timestamp || lastMsg.messageTimestamp);
            if (lastClientMsgAt > 0) {
                const responseTimeMs = Date.now() - lastClientMsgAt;
                const responseTimeMin = Math.max(1, Math.floor(responseTimeMs / 60000));
                
                const userRef = db.collection('users').doc(auth.currentUser!.uid);
                await db.runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists) return;

                    const userData = userDoc.data();
                    const perf = userData?.performance || { totalResponseTime: 0, responsesCount: 0, avgResponseTime: 0, slaScore: 100 };
                    
                    const newTotalTime = (perf.totalResponseTime || 0) + responseTimeMin;
                    const newCount = (perf.responsesCount || 0) + 1;
                    const newAvg = Math.floor(newTotalTime / newCount);
                    
                    let newSla = 100;
                    if (newAvg > 30) newSla = 90;
                    if (newAvg > 60) newSla = 75;
                    if (newAvg > 120) newSla = 50;
                    if (newAvg > 240) newSla = 20;

                    transaction.update(userRef, {
                        'performance.totalResponseTime': newTotalTime,
                        'performance.responsesCount': newCount,
                        'performance.avgResponseTime': newAvg,
                        'performance.slaScore': newSla,
                        'performance.lastUpdated': new Date().toISOString()
                    });
                });
            }
        }

        // [OTIMISTA] Atualiza chat metadata imediatamente para UX
        const nowMs = Date.now();
        const chatRef = db.collection('instances').doc(instanceId).collection('chats').doc(selectedChatId);
        // [FIX CRÍTICO] NÃO usar serverTimestamp() para lastMessageTimestamp aqui!
        // serverTimestamp() fica como null no cache local enquanto o servidor não confirma.
        // Isso faz o chat cair para o fundo do orderBy('lastMessageTimestamp', 'desc'),
        // excluindo-o do limit(50) e sumindo da sidebar.
        // Solução: usar Timestamp do cliente (sem depender de confirmação do servidor).
        const nowTimestamp = firebase.firestore.Timestamp.fromMillis(nowMs);
        const optimisticUpdate: any = {
            lastMessageTimestamp: nowTimestamp,
            lastMessageAt: nowMs,
            lastMessageTimestampMillis: nowMs,
            lastMessage: text ? text.substring(0, 100) : (finalType === 'audio' ? '🎤 Áudio' : '📎 Mídia'),
            lastMessagePreview: text ? text.substring(0, 50) : (finalType === 'audio' ? '🎤 Áudio' : '📎 Mídia'),
            updatedAt: fieldValue.serverTimestamp()
        };

        // Associa o chat ao usuário atual otimistamente se não tiver dono
        if (currentUser && currentUser.uid) {
            optimisticUpdate.ownerId = currentUser.uid;
        }

        chatRef.set(optimisticUpdate, { merge: true }).catch(err => console.warn('Erro ao atualizar chat otimista:', err));

        // [OUTBOX] Grava na collection outbox — o onOutboxCreate trigger acorda o Worker
        const outboxRef = await db.collection('instances').doc(instanceId)
            .collection('outbox')
            .add(sanitizePayload(outboxPayload));

        console.log(`[SEND] Mensagem ${tempId} enfileirada na outbox: ${outboxRef.id}`);

        // Remove a mensagem otimista local após um tempo (o Firestore listener vai trazer a real)
        // Tempo de 8s para dar ao Worker tempo de processar e o Firestore snapshot substituir
        setTimeout(() => {
            setLocalMessages(prev => prev.filter(m => m.id !== tempId));
        }, 8000);

    } catch (error: any) {
        console.error("Erro ao enviar mensagem:", error);
        setLocalMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
        throw error;
    }
  };

  const forceSyncChat = useCallback(async () => {
      if (!instanceId || !selectedChatId) return;
      try {
          addToast({ type: 'info', message: 'Sincronizando histórico do WhatsApp...' });
          const syncChatMessagesFn = functions.httpsCallable('syncChatMessages');
          const result = await syncChatMessagesFn({
              instanceName: instanceId,
              remoteJid: selectedChatId,
              limit: 50,
              force: true
          });
          
          if (result && result.data && (result.data as any).count > 0) {
               addToast({ type: 'success', message: `${(result.data as any).count} mensagens carregadas.` });
          }
       } catch (error: any) {
          console.error('[FORCE SYNC] Falha ao sincronizar chat:', error.message);
          const detail = error?.details || error?.message || '';
          if (detail.includes('WORKER_URL') || detail.includes('configuração')) {
              addToast({ type: 'error', message: 'Servidor de sync indisponível. Tente novamente.' });
          } else if (detail.includes('not found') || detail.includes('404')) {
              addToast({ type: 'info', message: 'Instância não encontrada na Evolution API.' });
          } else {
              addToast({ type: 'info', message: 'Não foi possível sincronizar agora. Tente novamente em instantes.' });
          }
       }
  }, [instanceId, selectedChatId, addToast]);

  const retryMessage = async (messageId: string) => {
      if (!instanceId) return;
      console.log("[RETRY] Retentando mensagem:", messageId);

      // [FIX] Atualiza UI imediatamente
      setLocalMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'pending' } : m));
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'pending' } : m));

      try {
          // [FIX] Busca na outbox mensagens com status de falha para esta instância
          const outboxQuery = await db.collection('instances').doc(instanceId)
              .collection('outbox')
              .where('status', 'in', ['FAILED', 'FAILED_RETRYING', 'FAILED_PERMANENTLY'])
              .get();

          // Procura na outbox pelo ID original ou tempId
          const matchingDoc = outboxQuery.docs.find(doc => {
              const data = doc.data();
              return doc.id === messageId || data.tempId === messageId;
          });

          if (matchingDoc) {
              // [RETRY REAL] Reseta o status para PENDING — o OutboxTrigger (onOutboxRetry) vai detectar e acionar o Worker
              await matchingDoc.ref.update({
                  status: 'PENDING',
                  retryCount: 0,
                  lastError: null,
                  errorType: null,
                  lastAttempt: fieldValue.serverTimestamp()
              });
              addToast({ type: 'success', message: 'Mensagem reenfileirada com sucesso!' });
              console.log(`[RETRY] Mensagem ${messageId} resetada na outbox: ${matchingDoc.id}`);
          } else {
              // Se não encontrou na outbox (pode ter sido eliminada), tenta localizar no messages
              // e re-criar na outbox a partir dos dados originais
              const chatId = selectedChatId;
              if (!chatId) {
                  addToast({ type: 'error', message: 'Chat não selecionado.' });
                  return;
              }

              const msgDoc = await db.doc(`instances/${instanceId}/chats/${chatId}/messages/${messageId}`).get();
              if (msgDoc.exists) {
                  const msgData = msgDoc.data() as any;
                  const isMedia = msgData?.media?.url || msgData?.metadata?.mediaUrl;
                  const reEnqueuePayload: any = {
                      to: msgData?.key?.remoteJid || chatId,
                      type: msgData?.messageType || (isMedia ? 'image' : 'text'),
                      content: isMedia ? (msgData.media?.url || msgData.metadata?.mediaUrl) : (msgData.text || msgData.content?.message?.conversation || ''),
                      caption: isMedia ? (msgData.text || msgData.media?.caption || '') : undefined,
                      tempId: messageId,
                      status: 'PENDING',
                      createdAt: fieldValue.serverTimestamp()
                  };

                  await db.collection('instances').doc(instanceId)
                      .collection('outbox')
                      .add(sanitizePayload(reEnqueuePayload));

                  addToast({ type: 'success', message: 'Mensagem reenviada!' });
              } else {
                  addToast({ type: 'info', message: 'Não foi possível localizar a mensagem para reenvio.' });
              }
          }
      } catch (err: any) {
          console.error('[RETRY] Erro ao retentar:', err);
          setLocalMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'error' } : m));
          addToast({ type: 'error', message: `Erro ao retentar: ${err.message}` });
      }
  };

  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
      if (!instanceId || !selectedChatId) return;
      
      setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) return { ...msg, isDeleted: true };
          return msg;
      }));

      let recipientJid = selectedChatId;
      if (!selectedChatId.includes('@g.us') && !selectedChatId.includes('@s.whatsapp.net')) {
          recipientJid = `${selectedChatId.replace(/\D/g, '')}@s.whatsapp.net`;
      }

      const payload = {
          to: recipientJid,
          type: forEveryone ? 'REVOKE_MSG' : 'DELETE_MSG',
          content: messageId,
          status: 'PENDING',
          createdAt: fieldValue.serverTimestamp()
      };
      await db.collection('instances').doc(instanceId).collection('outbox').add(sanitizePayload(payload));
  };

  const editMessage = async (id: string, text: string) => {
      if (!instanceId || !selectedChatId) return;
      
      // [FIX] Atualização otimista no frontend
      setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content: text, isEdited: true } : msg));
      setLocalMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content: text, isEdited: true } : msg));

      let recipientJid = selectedChatId;
      if (!selectedChatId.includes('@g.us') && !selectedChatId.includes('@s.whatsapp.net')) {
          recipientJid = `${selectedChatId.replace(/\D/g, '')}@s.whatsapp.net`;
      }

      const payload = {
          to: recipientJid,
          type: 'EDIT_MSG',
          content: text || ' ', 
          options: { messageId: id },
          status: 'PENDING',
          createdAt: fieldValue.serverTimestamp()
      };
      await db.collection('instances').doc(instanceId).collection('outbox').add(sanitizePayload(payload));
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
      if (!instanceId || !selectedChatId) return;
      
      setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
              const currentReactions = msg.reactions || [];
              if (!emoji) return { ...msg, reactions: [] };
              return { ...msg, reactions: [...currentReactions, emoji] };
          }
          return msg;
      }));

      let recipientJid = selectedChatId;
      if (!selectedChatId.includes('@g.us') && !selectedChatId.includes('@s.whatsapp.net')) {
          recipientJid = `${selectedChatId.replace(/\D/g, '')}@s.whatsapp.net`;
      }

      const payload = {
          to: recipientJid,
          type: 'REACTION_MSG',
          content: emoji || ' ', 
          options: { 
              messageId: messageId,
              reaction: emoji || ''
          },
          status: 'PENDING',
          createdAt: fieldValue.serverTimestamp()
      };
      await db.collection('instances').doc(instanceId).collection('outbox').add(sanitizePayload(payload));
  };

  const markChatAsRead = async (chatId: string) => {
      if (!instanceId || !auth.currentUser) return;
      try {
          await db.collection('instances').doc(instanceId).collection('chats').doc(chatId).set({ 
              unreadCount: 0,
              updatedAt: fieldValue.serverTimestamp() 
          }, { merge: true });
      } catch (error: any) { 
          if (error.code !== 'permission-denied' && error.code !== 'not-found') {
              console.error("Erro ao marcar como lida:", error);
          }
      }
  };

  const displayMessages = useMemo(() => {
      if (localMessages.length === 0) {
          return [...messages].sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
      }

      const serverMessageIds = new Set(messages.map(m => m.id));
      const serverMessageTempIds = new Set(messages.map(m => m.tempId).filter(Boolean));
        
      const filteredLocalMessages = localMessages.filter(localMsg => {
            if (serverMessageIds.has(localMsg.id) || (localMsg.tempId && serverMessageIds.has(localMsg.tempId))) {
                return false;
            }
            if (serverMessageTempIds.has(localMsg.id) || (localMsg.tempId && serverMessageTempIds.has(localMsg.tempId))) {
                return false;
            }
            
            const isDuplicate = messages.some(serverMsg => {
               if (!serverMsg.key?.fromMe) return false;                const timeDiff = Math.abs(Number(localMsg.timestamp || 0) - Number(serverMsg.timestamp || 0));
               const sameContent = (localMsg.content || '').trim() === (serverMsg.content || '').trim();
               return timeDiff < 5000 && sameContent;
            });
            
            return !isDuplicate;
      });

      const combined = [...messages, ...filteredLocalMessages];
      const uniqueCombined = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      return uniqueCombined.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
  }, [messages, localMessages]);

  return { 
      chats, 
      messages: displayMessages, 
      loadingChats, 
      loadingMessages, 
      loadingMore,
      hasMore,
      hasMoreChats,
      loadingMoreChats,
      isOffline,
      forceSyncChat,
      loadPreviousMessages,
      loadMoreChats,
      sendMessage, 
      retryMessage, 
      deleteMessage, 
      editMessage,
      reactToMessage, 
      markChatAsRead,
      sendMessageTo: async (targetChatId: string, text: string, type: string = 'text', mediaUrl?: string, mediaOptions?: { fileName?: string, mimetype?: string }, quotedMsg?: { id: string, author: string, content: string, senderJid?: string }) => {
          if (!instanceId) return;
          
          let finalType = type;
          if (mediaUrl && (type === 'text' || !type)) {
              finalType = 'image';
          }

          let recipientJid = targetChatId;
          if (!targetChatId.includes('@g.us') && !targetChatId.includes('@s.whatsapp.net')) {
              recipientJid = `${targetChatId.replace(/\D/g, '')}@s.whatsapp.net`;
          }

          const resolvedContent = mediaUrl || text || '';
          if (!resolvedContent) throw new Error("Tentativa de enviar mensagem vazia abortada.");

          const payload: any = {
              to: recipientJid,
              type: finalType,
              content: resolvedContent,
              status: 'PENDING',
              createdAt: fieldValue.serverTimestamp()
          };

          const options: any = {};
          if (mediaOptions?.fileName) options.fileName = mediaOptions.fileName;
          if (mediaOptions?.mimetype) options.mimetype = mediaOptions.mimetype;
          if (mediaUrl && text) options.caption = text;
          if (finalType === 'audio') options.ptt = true;
          
          if (quotedMsg) {
              options.quoted = {
                  id: quotedMsg.id || '',
                  preview: (quotedMsg.content || '').substring(0, 100),
                  sender: quotedMsg.senderJid || quotedMsg.author || ''
              };
          }
          
          if (Object.keys(options).length > 0) payload.options = sanitizePayload(options);
          
          const nowMs = Date.now();
          const chatRef = db.collection('instances').doc(instanceId).collection('chats').doc(targetChatId);
          // [FIX CRÍTICO] Usar Timestamp do cliente ao invés de serverTimestamp() para lastMessageTimestamp
          // serverTimestamp() = null no cache local (pending write) → chat cai do orderBy → some da sidebar
          const nowTimestamp = firebase.firestore.Timestamp.fromMillis(nowMs);
          chatRef.set({
              lastMessageTimestamp: nowTimestamp,
              lastMessageAt: nowMs,
              lastMessageTimestampMillis: nowMs,
              lastMessage: text ? text.substring(0, 100) : (finalType === 'audio' ? '🎤 Áudio' : '📎 Mídia'),
              lastMessagePreview: text ? text.substring(0, 50) : (finalType === 'audio' ? '🎤 Áudio' : '📎 Mídia'),
              updatedAt: fieldValue.serverTimestamp()
          }, { merge: true }).catch(err => console.warn('Erro ao atualizar chat otimista:', err));

          await db.collection('instances').doc(instanceId).collection('outbox').add(sanitizePayload(payload));
      }
  };
};
