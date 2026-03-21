export class JidResolver {
  /**
   * Extrai JID normalizado, priorizando chaves alternativas para evitar o problema @lid
   * Lógica:
   * 1. data?.lastMessage?.key?.remoteJidAlt
   * 2. data?.key?.remoteJidAlt
   * 3. data?.key?.participantAlt
   * 4. Se encontrar qualquer um terminando em @s.whatsapp.net, usa.
   * 5. Fallback para data?.remoteJid ou data?.key?.remoteJid
   */
  static resolveJid(data: any): string {
    if (!data) return "";

    // 0. Prioridade Máxima: Se já for um grupo (@g.us), preserva.
    // Nunca devemos resolver um grupo para o participante (remetente) se o que queremos é o ID do Chat.
    const primaryJid = data?.remoteJid || data?.key?.remoteJid;
    if (primaryJid && typeof primaryJid === 'string' && (primaryJid.endsWith('@g.us') || primaryJid.endsWith('@broadcast'))) {
        return primaryJid;
    }

    // 1. Prioridade para Indivíduos: Campos "Alt" que já contêm o JID canônico (@s.whatsapp.net)
    const candidates = [
      data?.lastMessage?.key?.remoteJidAlt,
      data?.key?.remoteJidAlt,
      data?.key?.participantAlt,
      // Alguns payloads da Evolution v2 trazem o ID real escondido em participant
      (typeof data?.participant === 'string' && data.participant.includes(':')) ? data.participant.split(':')[0] + '@s.whatsapp.net' : null
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string' && candidate.endsWith('@s.whatsapp.net')) {
        return candidate;
      }
    }

    // 2. Busca Padrão (Pode vir @lid ou @s.whatsapp.net)
    let jid = 
      data?.remoteJid || 
      data?.key?.remoteJid || 
      data?.id?._serialized || 
      (typeof data?.id === 'string' ? data.id : null);

    // 3. Normalização de @lid para @s.whatsapp.net (Tentativa de recuperação)
    // Se o JID for um LID, não temos como converter matematicamente sem o mapa,
    // mas se tivermos o número no user ou participant, podemos reconstruir.
    if (jid && typeof jid === 'string' && jid.endsWith('@lid')) {
        // Tenta achar o número em outros lugares
        const userPart = jid.split('@')[0];
        // Se o user part parecer um número de telefone (apenas dígitos), tentamos converter
        // Porem LIDs geralmente tem formato diferente. 
        // A melhor aposta é verificar se existe um "participant" ou "user" no payload que seja numérico.
        
        // Se não conseguirmos resolver, retornamos o LID mesmo, mas o ideal é que o passo 1 tenha resolvido.
        // O prompt pede para priorizar remoteJidAlt.
    }

    if (typeof jid !== 'string') return "";

    return jid;
  }

  /**
   * Identifica o tipo de chat baseado no sufixo do JID
   */
  static getChatType(jid: string): 'group' | 'private' | 'lid' | 'broadcast' | 'unknown' {
    if (!jid) return 'unknown';
    if (jid.endsWith('@g.us')) return 'group';
    if (jid.endsWith('@s.whatsapp.net')) return 'private';
    if (jid.endsWith('@lid')) return 'lid';
    if (jid.endsWith('@broadcast')) return 'broadcast';
    return 'unknown';
  }

  /**
   * Valida se o JID tem um formato aceitável para o Firestore
   */
  static isValidJid(jid: string): boolean {
    return typeof jid === 'string' && jid.includes('@') && jid.length > 5;
  }

  /**
   * Extrai apenas os números do JID (sem sufixo e sem caracteres especiais)
   */
  static getCleanNumber(jid: string): string {
    if (!jid) return "";
    const [user] = jid.split('@');
    return user.replace(/\D/g, "");
  }
}
