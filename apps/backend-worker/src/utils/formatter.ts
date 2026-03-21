import * as admin from "firebase-admin";
import { ContentParser } from "./content-parser";

// --- INTERFACES OBRIGATÓRIAS (STRICT) ---

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'button_response' | 'list_response' | 'contact' | 'location' | 'unknown';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'played' | 'pending';

export interface MediaInfo {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  url: string;
  mimetype: string;
  filename?: string;
  caption?: string;
  size?: number;
  mediaStatus?: string; // 'PENDING', 'UPLOADED', 'EXPIRED'
  thumbnail?: string; // [NEW] Base64 Blurhash/Thumbnail
}

export interface QuotedInfo {
  id: string;
  participant: string;
}

export interface InteractionInfo {
  selectedId: string;
  selectedText: string;
}

export interface MessageDocument {
  id: string;
  text: string;
  type: MessageType;
  timestamp: number;
  fromMe: boolean;
  status: MessageStatus;
  media?: MediaInfo | null;
  quoted?: QuotedInfo | null;
  interaction?: InteractionInfo | null;
  createdAt: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  // Campos auxiliares para queries
  remoteJid: string;
  sender?: string;
}

// --- HELPERS DE EXTRAÇÃO ---

export const getMessageType = (message: any): MessageType => {
  if (!message) return 'unknown';

  if (message.conversation) return 'text';
  if (message.extendedTextMessage) return 'text';
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  
  // Interações
  if (message.buttonsResponseMessage || message.templateButtonReplyMessage) return 'button_response';
  if (message.listResponseMessage) return 'list_response';
  
  // Outros
  if (message.contactMessage || message.contactsArrayMessage) return 'contact';
  if (message.locationMessage || message.liveLocationMessage) return 'location';

  return 'unknown';
};

export const extractMessageText = (data: any): string => {
  return ContentParser.extractContent(data);
};

export const extractQuotedInfo = (message: any): QuotedInfo | null => {
  const contextInfo = 
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo;

  if (contextInfo && contextInfo.stanzaId) {
    return {
      id: contextInfo.stanzaId,
      participant: contextInfo.participant || ""
    };
  }
  return null;
};

/**
 * Extrai informações completas de quoting/reply para o Frontend renderizar o card de resposta
 */
export const extractQuotedMessageFull = (message: any): { id: string; preview: string; sender: string } | null => {
  const contextInfo = 
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo;

  if (contextInfo && contextInfo.stanzaId) {
    // Tenta extrair o texto da mensagem quotada
    let preview = "";
    const quotedMsg = contextInfo.quotedMessage;
    if (quotedMsg) {
      if (quotedMsg.conversation) preview = quotedMsg.conversation;
      else if (quotedMsg.extendedTextMessage?.text) preview = quotedMsg.extendedTextMessage.text;
      else if (quotedMsg.imageMessage?.caption) preview = `📷 ${quotedMsg.imageMessage.caption}`;
      else if (quotedMsg.videoMessage?.caption) preview = `🎥 ${quotedMsg.videoMessage.caption}`;
      else if (quotedMsg.audioMessage) preview = "🎵 Áudio";
      else if (quotedMsg.stickerMessage) preview = "💟 Figurinha";
      else if (quotedMsg.documentMessage) preview = "📄 Documento";
      else preview = "Mensagem";
    }
    
    return {
      id: contextInfo.stanzaId,
      preview: preview.substring(0, 100), // Limita para evitar documentos grandes
      sender: contextInfo.participant || ""
    };
  }
  return null;
};

export const extractInteractionInfo = (message: any): InteractionInfo | null => {
  if (message.buttonsResponseMessage) {
    return {
      selectedId: message.buttonsResponseMessage.selectedButtonId,
      selectedText: message.buttonsResponseMessage.selectedDisplayText
    };
  }
  if (message.templateButtonReplyMessage) {
    return {
      selectedId: message.templateButtonReplyMessage.selectedId,
      selectedText: message.templateButtonReplyMessage.selectedDisplayText
    };
  }
  if (message.listResponseMessage) {
    return {
      selectedId: message.listResponseMessage.singleSelectReply?.selectedRowId,
      selectedText: message.listResponseMessage.title
    };
  }
  return null;
};

// --- HELPER DE TIMESTAMP SEGURO (CRÍTICO) ---
export const getSafeMillis = (timestamp: any): number => {
    if (!timestamp) return 0;
    // Se já for número (Legacy)
    if (typeof timestamp === 'number') return timestamp;
    // Se for Timestamp do Firestore (Novo)
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    // Se for Date do JS
    if (timestamp instanceof Date) return timestamp.getTime();
    // Fallback de segurança
    return 0;
};

// --- HELPER DE BOOLEAN ---
export const parseBoolean = (value: any): boolean => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    return false;
};

// --- FORMATADOR PRINCIPAL ---

export const formatMessageForFirestore = (msgData: any, mediaInfo: MediaInfo | null = null): MessageDocument | null => {
  try {
    const key = msgData.key || msgData;
    if (!key || !key.id || !key.remoteJid) {
        console.warn("[FORMATTER] Mensagem inválida ignorada (Key/ID/JID ausente):", JSON.stringify(key));
        return null;
    }

    const content = msgData.message || msgData.content || {};
    
    // Tratamento de Timestamp (Garante number em milliseconds)
    let timestamp = Date.now();
    if (msgData.messageTimestamp) {
        let tsValue = msgData.messageTimestamp;
        if (typeof tsValue === 'object' && tsValue !== null) {
            if (tsValue.low !== undefined) {
                tsValue = tsValue.low; // Tratamento de Long object do Baileys
            } else if (typeof tsValue.toNumber === 'function') {
                tsValue = tsValue.toNumber();
            }
        }
        const ts = Number(tsValue);
        if (!isNaN(ts) && ts > 0) {
            // Se for timestamp unix (seconds), converte para ms
            timestamp = ts < 10000000000 ? ts * 1000 : ts;
        }
    }

    const type = getMessageType(content);
    const text = extractMessageText(content);
    const quoted = extractQuotedInfo(content);
    const quotedMessage = extractQuotedMessageFull(content); // Novo: informações completas para o Frontend renderizar
    const interaction = extractInteractionInfo(content);

    // Proteção contra campos nulos no Firestore
    const doc: any = {
      id: String(key.id),
      remoteJid: String(key.remoteJid),
      fromMe: parseBoolean(key.fromMe !== undefined ? key.fromMe : msgData.fromMe),
      type: type || 'unknown',
      status: (msgData.status || "delivered") as MessageStatus,
      text: text || "", 
      timestamp: timestamp,
      quoted: quoted || null,
      quotedMessage: quotedMessage || null, // Campo completo para Frontend renderizar card de resposta
      interaction: interaction || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      sender: String(key.participant || key.remoteJid),
      pushName: msgData.pushName || null
    };

    // [FIX] Padronização de Legenda: Se não tem texto, usa a legenda da mídia
    if (!doc.text && mediaInfo?.caption) {
        doc.text = mediaInfo.caption;
    }

    if (mediaInfo) {
        // Tenta extrair thumbnail se disponível no payload original
        let thumbnail = mediaInfo.thumbnail;
        if (!thumbnail) {
            const msgType = type === 'image' ? 'imageMessage' : type === 'video' ? 'videoMessage' : null;
            if (msgType && content[msgType]) {
                thumbnail = content[msgType].jpegThumbnail;
            }
        }

        doc.media = {
            type: mediaInfo.type,
            url: mediaInfo.url || "",
            mimetype: mediaInfo.mimetype || 'application/octet-stream',
            filename: mediaInfo.filename || null,
            caption: mediaInfo.caption || null,
            mediaStatus: mediaInfo.mediaStatus || 'UPLOADED',
            thumbnail: thumbnail || null
        };
    } else {
        doc.media = null;
    }

    return doc as MessageDocument;
  } catch (error: any) {
      console.error("[FORMATTER] Erro fatal ao formatar mensagem:", error.message, msgData);
      return null;
  }
};
