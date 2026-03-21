export class ContentParser {
  /**
   * Extrai o texto de preview da mensagem de forma segura
   * Trata Stickers, Reações e mensagens de mídia sem caption
   */
  static extractContent(msg: any): string {
    try {
      if (!msg) return "";

      // 1. Adaptação para estruturas aninhadas
      const content = msg.message || msg.content || msg;

    // 2. Texto Simples
    if (typeof content === 'string') return content;
    if (content.conversation) return content.conversation;
    if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;

    // 3. Mídias com Caption
    if (content.imageMessage?.caption) return `📷 ${content.imageMessage.caption}`;
    if (content.videoMessage?.caption) return `🎥 ${content.videoMessage.caption}`;
    if (content.documentMessage?.caption) return `📄 ${content.documentMessage.caption}`;

    // 4. Tratamento de Tipos Especiais (Sem Caption)
    if (msg.messageType === 'stickerMessage' || content.stickerMessage) return '💟 Figurinha';
    if (msg.messageType === 'reactionMessage' || content.reactionMessage) {
        const reaction = content.reactionMessage?.text || '';
        return `[Reação${reaction ? ': ' + reaction : ''}]`;
    }
    
    // 5. Mídias sem Caption
    if (content.imageMessage) return "📷 Imagem";
    if (content.videoMessage) return "🎥 Vídeo";
    if (content.audioMessage) return "🎵 Áudio";
    if (content.documentMessage) return "📄 Documento";
    if (content.contactMessage) return "👤 Contato";
    if (content.locationMessage) return "📍 Localização";

    // 6. Interações
    if (content.buttonsResponseMessage) {
        return content.buttonsResponseMessage.selectedDisplayText || "Botão selecionado";
    }
    if (content.listResponseMessage) {
        return content.listResponseMessage.title || "Opção selecionada";
    }

      return "Mensagem";
    } catch (error) {
      console.error("[CONTENT PARSER ERROR]", error);
      return "[Erro ao ler mensagem]";
    }
  }

  /**
   * Remove recursivamente valores undefined, funções e símbolos
   * O Firestore rejeita objetos com valores undefined.
   */
  static sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj
        .map(item => ContentParser.sanitizeForFirestore(item))
        .filter(item => item !== undefined); // Remove undefineds de arrays
    }

    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value !== undefined) {
             const cleanValue = ContentParser.sanitizeForFirestore(value);
             // Se for objeto vazio, também removemos? Depende. 
             // O Firestore aceita {}, mas undefined quebra.
             if (cleanValue !== undefined) {
                 newObj[key] = cleanValue;
             }
          }
        }
      }
      return newObj;
    }

    // 3. String Truncation (Anti-Crash 1MB)
    if (typeof obj === 'string') {
        // Limite de segurança: 900KB (Firestore permite 1MB, mas deixamos margem)
        const MAX_SIZE = 900 * 1024;
        if (obj.length > MAX_SIZE) {
            console.warn(`[CONTENT PARSER] Truncating large string (${obj.length} bytes) to avoid Firestore OOM.`);
            return obj.substring(0, MAX_SIZE) + '...[TRUNCATED_BY_SAFETY_GUARD]';
        }
    }

    return obj;
  }
}
