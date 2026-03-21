import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { EvolutionService } from "../services/evolution.service";
import pLimit from "p-limit";
import { MediaService } from "../services/media.service";
import { Logger } from "../utils/logger";

export interface OutboxOptions {
    caption?: string;
    quoted?: any;
    messageId?: string; // Required for EDIT_MSG
    fileName?: string;
    mimetype?: string;
    [key: string]: any;
}

export interface OutboxMessage {
    id: string; // Firestore Doc ID
    content: string; // Text content, Media URL, or Message ID (for delete)
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'DELETE_MSG' | 'EDIT_MSG' | 'REVOKE_MSG' | 'REACTION_MSG';
    to: string; // remoteJid
    status: 'PENDING' | 'SENDING' | 'FAILED_RETRYING' | 'FAILED_PERMANENTLY';
    retryCount: number;
    lastAttempt: admin.firestore.Timestamp;
    createdAt: admin.firestore.Timestamp;
    options?: OutboxOptions;
}

/**
 * Tipos de erro para classificação
 */
enum OutboxErrorType {
    FATAL = 'FATAL',       // Não vai funcionar nunca (número inválido, instância deletada)
    TRANSIENT = 'TRANSIENT', // Pode funcionar na próxima tentativa (timeout, API indisponível)
    MEDIA = 'MEDIA',        // Erro específico de mídia
    VALIDATION = 'VALIDATION' // Erro de validação de dados
}

/**
 * Resultado do processamento de mensagem
 */
interface ProcessResult {
    success: boolean;
    errorType?: OutboxErrorType;
    errorMessage?: string;
    httpStatus?: number;
}

/**
 * Valida payload da mensagem de saída
 */
function validateOutboxMessage(data: OutboxMessage): { valid: boolean; error?: string } {
    // Validar tipo de mensagem
    const validTypes = ['text', 'image', 'video', 'audio', 'document', 'DELETE_MSG', 'EDIT_MSG', 'REVOKE_MSG', 'REACTION_MSG'];
    if (!data.type || !validTypes.includes(data.type)) {
        return { valid: false, error: `Tipo de mensagem inválido: ${data.type}` };
    }
    
    // Validar destinatário
    if (!data.to || typeof data.to !== 'string') {
        return { valid: false, error: 'Destinatário (to) é obrigatório' };
    }
    
    // Validar conteúdo para tipos que precisam
    if (['text', 'image', 'video', 'audio', 'document'].includes(data.type)) {
        if (!data.content || typeof data.content !== 'string') {
            return { valid: false, error: 'Conteúdo é obrigatório para mensagens de texto/mídia' };
        }
    }
    
    // Validações específicas por tipo
    if (data.type === 'EDIT_MSG' || data.type === 'DELETE_MSG' || data.type === 'REVOKE_MSG') {
        if (!data.content) {
            return { valid: false, error: `Message ID é obrigatório para ${data.type}` };
        }
    }
    
    if (data.type === 'REACTION_MSG') {
        const options = data.options || {};
        if (!options.messageId) {
            return { valid: false, error: 'Message ID é obrigatório para reações' };
        }
    }
    
    return { valid: true };
}

/**
 * Classifica erro baseado na resposta da API
 */
function classifyError(error: any, httpStatus?: number): { type: OutboxErrorType; message: string; isFatal: boolean } {
    const errorMsg = (error.message || '').toLowerCase();
    const responseData = error.response?.data || {};
    const responseMsg = JSON.stringify(responseData).toLowerCase();
    
    // Erros HTTP específicos
    if (httpStatus) {
        // 4xx Client Errors - geralmente fatais
        if (httpStatus === 400) {
            return { 
                type: OutboxErrorType.VALIDATION, 
                message: `Bad Request: ${responseMsg || errorMsg}`,
                isFatal: true 
            };
        }
        if (httpStatus === 401 || httpStatus === 403) {
            return { 
                type: OutboxErrorType.FATAL, 
                message: `Erro de autenticação (${httpStatus}): Token inválido ou expirado`,
                isFatal: true 
            };
        }
        if (httpStatus === 404) {
            // 404 pode ser transient (instância temporariamente indisponível) ou fatal
            if (errorMsg.includes('instance') || errorMsg.includes('not found')) {
                return { 
                    type: OutboxErrorType.FATAL, 
                    message: `Instância não encontrada (404)`,
                    isFatal: true 
                };
            }
            return { 
                type: OutboxErrorType.TRANSIENT, 
                message: `Recurso não encontrado (404): ${responseMsg}`,
                isFatal: false 
            };
        }
        if (httpStatus === 422) {
            return { 
                type: OutboxErrorType.VALIDATION, 
                message: `Dados inválidos (422): ${responseMsg}`,
                isFatal: true 
            };
        }
        // 5xx Server Errors - transient
        if (httpStatus >= 500 && httpStatus < 600) {
            return { 
                type: OutboxErrorType.TRANSIENT, 
                message: `Erro servidor Evolution API (${httpStatus}): ${responseMsg}`,
                isFatal: false 
            };
        }
    }
    
    // Erros por mensagem
    if (errorMsg.includes('number is not registered') || errorMsg.includes('invalid number')) {
        return { 
            type: OutboxErrorType.FATAL, 
            message: 'Número não está registrado no WhatsApp',
            isFatal: true 
        };
    }
    if (errorMsg.includes('invalid jid') || errorMsg.includes('invalid remote')) {
        return { 
            type: OutboxErrorType.VALIDATION, 
            message: 'JID inválido',
            isFatal: true 
        };
    }
    if (errorMsg.includes('media url unreachable') || errorMsg.includes('media not found')) {
        return { 
            type: OutboxErrorType.MEDIA, 
            message: 'URL de mídia inacessível ou expirada',
            isFatal: false 
        };
    }
    if (errorMsg.includes('socket') || errorMsg.includes('timeout') || errorMsg.includes('econn')) {
        return { 
            type: OutboxErrorType.TRANSIENT, 
            message: `Erro de conexão: ${errorMsg}`,
            isFatal: false 
        };
    }
    if (errorMsg.includes('etimedout') || errorMsg.includes('deadline')) {
        return { 
            type: OutboxErrorType.TRANSIENT, 
            message: 'Timeout de requisição',
            isFatal: false 
        };
    }
    
    // Default: transient
    return { 
        type: OutboxErrorType.TRANSIENT, 
        message: `Erro desconhecido: ${errorMsg}`,
        isFatal: false 
    };
}

export class OutboxController {


    /**
     * Helper para sanitização de JID "Bulletproof"
     */
    private static sanitizeJid(jid: string): string {
        if (!jid) return "";

        // 0. Se já for um JID completo e válido (@g.us ou @s.whatsapp.net), preserva.
        if (jid.endsWith('@g.us') || jid.endsWith('@s.whatsapp.net') || jid.endsWith('@broadcast')) {
            return jid;
        }
        
        // 1. Remove tudo que não é número (para números de telefone puros)
        let clean = jid.replace(/\D/g, '');
        
        // 2. Se for vazio após limpar
        if (!clean) return "";

        // 3. Regras de Formatação (Brasil)
        // Se tiver 10 ou 11 dígitos (DDD + Número), assume BR (55)
        if (clean.length >= 10 && clean.length <= 11) {
            clean = '55' + clean;
        }
        
        // Se tiver 12 ou 13 dígitos e começar com 0, remove o zero
        if (clean.startsWith('0') && (clean.length === 12 || clean.length === 13)) {
            clean = clean.substring(1);
        }

        // 4. Retorna formato JID padrão da Evolution
        return `${clean}@s.whatsapp.net`;
    }

    /**
     * Helper para validação de URL
     */
    private static isValidUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Lógica isolada de processamento de uma única mensagem
     */
    private static async processMessage(
        db: admin.firestore.Firestore, 
        instanceName: string, 
        messageId: string, 
        data: OutboxMessage, 
        docRef: admin.firestore.DocumentReference
    ) {
        console.log(`[WORKER OUTBOX] Iniciando processamento da mensagem: ${messageId} para ${data.to}, tipo: ${data.type}`);
        
        // [VALIDAÇÃO] Validar payload da mensagem
        const validation = validateOutboxMessage(data);
        if (!validation.valid) {
            console.error(`[WORKER OUTBOX] Validação falhou para ${messageId}: ${validation.error}`);
            await docRef.update({
                status: 'FAILED_PERMANENTLY',
                retryCount: admin.firestore.FieldValue.increment(1),
                lastError: validation.error,
                errorType: OutboxErrorType.VALIDATION,
                lastAttempt: admin.firestore.FieldValue.serverTimestamp()
            });
            return; // Não tenta novamente - erro de validação
        }
        
        try {
            // [SANEAMENTO] Garante formato JID válido "Bulletproof"
            const targetJid = OutboxController.sanitizeJid(data.to);
            // [FIX] Aceita tanto JIDs privados (@s.whatsapp.net) quanto grupos (@g.us) e broadcast
            if (!targetJid || (!targetJid.includes('@s.whatsapp.net') && !targetJid.includes('@g.us') && !targetJid.includes('@broadcast'))) {
                throw new Error(`Invalid JID: ${data.to} -> ${targetJid}`);
            }

            const options: OutboxOptions = data.options || {};
            let result;
            const batch = db.batch();

            // [VALIDAÇÃO] Mídia Rigorosa (V2 não aceita Base64 facilmente, prefira URL)
            if (['image', 'video', 'audio', 'document'].includes(data.type) && typeof data.content === 'string') {
                const mediaUrl = data.content;
                
                // Rejeita Base64 explícito se não for tratado internamente (Feature flag ou regra de negócio)
                // O usuário pediu para garantir URL Pública/Assinada
                if (!OutboxController.isValidUrl(mediaUrl)) {
                    // Se for Base64 (starts with data:), podemos tentar upload ou falhar
                    if (mediaUrl.startsWith('data:')) {
                        throw new Error("Base64 not allowed in Outbox. Please upload to storage first.");
                    }
                    // Se for caminho local ou inválido
                    throw new Error(`Invalid Media URL: ${mediaUrl.substring(0, 50)}...`);
                }

                // [OTIMIZAÇÃO] Validação de Mídia mais permissiva
                // O Firebase Storage pode retornar 403 para requisições HEAD.
                // Confiamos no erro do sendMedia da Evolution API para reportar falhas de download.
                console.log(`[WORKER OUTBOX] Mídia detectada: ${mediaUrl}`);
            }

            // Lógica de Envio (Service)
            if (data.type === 'DELETE_MSG') {
                // Delete for Me - apaga apenas para quem enviou (Rota V2)
                await EvolutionService.request(instanceName, `/chat/deleteMessage/${instanceName}`, 'DELETE', {
                    remoteJid: targetJid,
                    id: data.content,
                    fromMe: true
                });
                // Marca original como deletada
                const msgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${data.content}`);
                batch.set(msgRef, { isDeleted: true, deletedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

            } else if (data.type === 'REVOKE_MSG') {
                // [NOVA FUNCIONALIDADE] Delete for Everyone - apaga para todos os participantes
                // Usa o endpoint /chat/deleteMessageForEveryone (V2)
                if (!data.content) throw new Error("Message ID obrigatório para revoke");
                
                await EvolutionService.request(instanceName, `/chat/deleteMessageForEveryone/${instanceName}`, 'DELETE', {
                    remoteJid: targetJid,
                    id: data.content,
                    fromMe: true
                });
                
                // Marca como deletada para todos
                const msgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${data.content}`);
                batch.set(msgRef, { 
                    isDeleted: true, 
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    deletedForEveryone: true  // Campo para distinguir delete for me vs delete for everyone
                }, { merge: true });

            } else if (data.type === 'REACTION_MSG') {
                if (!options.messageId) throw new Error("ID da mensagem obrigatório para reação");
                
                // [API] Envia reação via Evolution
                await EvolutionService.sendReaction(instanceName, targetJid, data.content, options.messageId);

                // [DB] Atualiza array de reações
                const msgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${options.messageId}`);
                
                if (data.content) {
                    // Transaction para ler e substituir corretamente a reação do remetente
                    await db.runTransaction(async (transaction) => {
                        const doc = await transaction.get(msgRef);
                        if (!doc.exists) return;
                        
                        const msgData = doc.data();
                        let currentReactions = msgData?.reactions || [];
                        
                        // Filtra a reação antiga do usuário 'ME'
                        currentReactions = currentReactions.filter((r: any) => r.sender !== 'ME');
                        
                        // Adiciona a nova reação
                        currentReactions.push({
                            emoji: data.content,
                            sender: 'ME',
                            timestamp: Date.now()
                        });
                        
                        transaction.set(msgRef, { reactions: currentReactions }, { merge: true });
                    });
                } else {
                    // Remover reação se vazio
                    await db.runTransaction(async (transaction) => {
                        const doc = await transaction.get(msgRef);
                        if (!doc.exists) return;
                        
                        const msgData = doc.data();
                        let currentReactions = msgData?.reactions || [];
                        
                        // Filtra a reação antiga do usuário 'ME'
                        currentReactions = currentReactions.filter((r: any) => r.sender !== 'ME');
                        
                        transaction.set(msgRef, { reactions: currentReactions }, { merge: true });
                    });
                }

            } else if (data.type === 'EDIT_MSG') {
                if (!options.messageId) throw new Error("ID da mensagem obrigatório para edição");
                
                // [API] Tenta editar no WhatsApp via Evolution (Rota V2)
                await EvolutionService.request(instanceName, `/chat/updateMessage/${instanceName}`, 'POST', {
                    number: targetJid,
                    key: {
                        remoteJid: targetJid,
                        fromMe: true,
                        id: options.messageId
                    },
                    text: data.content
                });

                // [DB] Atualiza original com versionamento (oldMessages)
                const msgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${options.messageId}`);
                const oldDoc = await msgRef.get();
                
                const oldText = oldDoc.exists ? (
                    oldDoc.data()?.text || 
                    oldDoc.data()?.content?.message?.conversation || 
                    oldDoc.data()?.content?.text || 
                    ""
                ) : "";

                batch.set(msgRef, { 
                    content: { message: { conversation: data.content }, text: data.content },
                    text: data.content, // Campo flat para facilitar queries e leitura no frontend
                    isEdited: true,
                    oldMessages: admin.firestore.FieldValue.arrayUnion({
                        text: oldText,
                        editedAt: admin.firestore.FieldValue.serverTimestamp()
                    }),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp() 
                }, { merge: true });

            } else if (data.type === 'text') {
                // [PRESENCE] Simulação humana antes de texto (Non-blocking)
                EvolutionService.sendPresence(instanceName, targetJid, 'composing').catch(() => {});
                
                // [REPLY] Adicionar contextInfo se for resposta
                const sendOptions = { ...options };
                if (options.quoted) {
                    sendOptions.contextInfo = {
                        stanzaId: options.quoted.id || options.quoted.key?.id,
                        participant: options.quoted.sender || options.quoted.key?.remoteJid || ""
                    };
                }
                
                result = await EvolutionService.sendText(instanceName, targetJid, data.content, sendOptions);
            } else {
                // Mídia (Audio, Image, Video, Document)
                let mediaUrl = data.content;

                // [PRESENCE] Simulação humana antes de mídia (Non-blocking)
                const presenceType = data.type === 'audio' ? 'recording' : 'composing';
                EvolutionService.sendPresence(instanceName, targetJid, presenceType).catch(() => {});
                
                // [SIMPLIFICADO] Confia na URL do Frontend
                if (data.type === 'audio') {
                    options.ptt = true; // Força flag de Nota de Voz se for tipo audio
                }

                // [MÍDIA] Mesclar metadados específicos de mídia no sendOptions
                const mediaOptionsPayload = (data as any).mediaOptions || {};
                const sendOptions: any = { 
                    ...options,
                    mimetype: options.mimetype || mediaOptionsPayload.mimetype,
                    fileName: options.fileName || mediaOptionsPayload.fileName
                };

                // [PTT FIX] Para áudios (Voice Notes), converter localmente no Worker para OGG Opus
                if (data.type === 'audio') {
                    sendOptions.ptt = true;
                    // Conversão nativa local do worker para garantir entrega em todos os whatsapps
                    if (mediaUrl.includes('.webm') || data.type === 'audio') {
                        try {
                           console.log(`[WORKER OUTBOX] Terceirizando ffmpeg para o proprio Worker...`);
                           mediaUrl = await MediaService.convertWebmToOggOpusUrl(instanceName, mediaUrl);
                           sendOptions.mimetype = 'audio/ogg; codecs=opus';
                           sendOptions.fileName = `voice_message_${Date.now()}.ogg`;
                        } catch(e) {
                           console.error(`[WORKER OUTBOX] Falha ao converter audo para Ogg localmente, caindo em fallback mp4`, e);
                           // Se a conversão local falhar, tenta enganar o backend com mp4
                           if (!sendOptions.mimetype || sendOptions.mimetype.includes('webm')) sendOptions.mimetype = 'audio/mp4';
                           if (!sendOptions.fileName || sendOptions.fileName.endsWith('.webm')) sendOptions.fileName = 'voice_message.mp4';
                        }
                    }
                }

                if (options.quoted) {
                    sendOptions.contextInfo = {
                        stanzaId: options.quoted.id || options.quoted.key?.id,
                        participant: options.quoted.sender || options.quoted.key?.remoteJid || ""
                    };
                }

                result = await EvolutionService.sendMedia(
                    instanceName, 
                    targetJid, 
                    mediaUrl, 
                    data.type, 
                    (data as any).caption || options.caption || "", 
                    sendOptions
                ).catch(err => {
                    console.error(`[WORKER OUTBOX] Falha detalhada da Evolution API: ${JSON.stringify(err.response?.data || err.message)}`);
                    throw err;
                });
            }

            // 4. Sucesso: Persistência no Histórico
            if (['text', 'image', 'video', 'audio', 'document'].includes(data.type)) {
                const waId = result?.key?.id || result?.id || result?.data?.key?.id;
                if (!waId) throw new Error("Evolution API did not return a Message ID (waId)");

                // [MENSAGEM] Cria registro definitivo no histórico com ID real
                const msgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${waId}`);

                // Respeita o tempId vindo do frontend (quando existir) para alinhar deduplicação
                const frontendTempId = (data as any).tempId && typeof (data as any).tempId === 'string'
                    ? (data as any).tempId
                    : undefined;

                const isMediaType = ['image', 'video', 'audio', 'document'].includes(data.type);
                const mediaUrl = isMediaType ? data.content : undefined;
                const captionText = (data as any).caption || options.caption || '';
                
                const messageData: any = {
                    key: { remoteJid: targetJid, id: waId, fromMe: true },
                    messageType: data.type === 'text' ? 'conversation' : `${data.type}Message`,
                    content: { text: isMediaType ? captionText : data.content, ...options },
                    text: isMediaType ? captionText : data.content, // Caption para mídia, texto para texto
                    type: data.type, // 'text', 'image', 'audio', etc.
                    timestamp: Date.now(),
                    status: 'sent', // Status imediato: SENT (não espera webhook)
                    fromMe: true,
                    sender: targetJid,
                    pushName: 'Você',
                    // Garante que o doc final conheça o tempId original usado pelo frontend
                    ...(frontendTempId ? { tempId: frontendTempId } : {}),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };

                // [FIX CRÍTICO] Salvar campo `media` completo para que o frontend renderize imediatamente
                if (isMediaType && mediaUrl) {
                    messageData.media = {
                        type: data.type,
                        url: mediaUrl,
                        mimetype: options.mimetype || (data as any).mediaOptions?.mimetype || 'application/octet-stream',
                        fileName: options.fileName || (data as any).mediaOptions?.fileName || null,
                        caption: captionText || null,
                        mediaStatus: 'UPLOADED'
                    };
                }

                // [MAPEAMENTO] Se o front usou um ID temporário, opcionalmente mantém um doc auxiliar
                // com o mesmo tempId como ID, apontando para o waId real. Isso preserva compatibilidade
                // com qualquer lógica que ainda leia por realId/tempId antigos, mas sem quebrar o contrato
                // de que tempId == tempId do frontend.
                if (frontendTempId && frontendTempId !== waId) {
                    const tempMsgRef = db.doc(`instances/${instanceName}/chats/${targetJid}/messages/${frontendTempId}`);
                    
                    batch.set(tempMsgRef, {
                        key: { remoteJid: targetJid, id: waId, fromMe: true },
                        status: 'sent',
                        realId: waId,
                        tempId: frontendTempId,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Log estruturado para monitorar alinhamento de tempId entre Outbox e mensagens finais
                console.log(JSON.stringify({
                    severity: 'INFO',
                    message: '[WORKER OUTBOX] Mensagem enviada e persistida',
                    instanceName,
                    outboxMessageId: messageId,
                    waId,
                    frontendTempId: frontendTempId || null
                }));

                // [QUOTE/REPLY] Se a mensagem é resposta, garante que quotedMessage está estruturado
                if (options.quoted) {
                    messageData.quotedMessage = {
                        id: options.quoted.id || options.quoted.key?.id,
                        preview: options.quoted.preview || options.quoted.text || "",
                        sender: options.quoted.sender || options.quoted.key?.remoteJid
                    };
                }

                batch.set(msgRef, messageData, { merge: true });

                // [CHAT] Atualiza metadados do chat para refletir a última mensagem enviada
                const chatRef = db.doc(`instances/${instanceName}/chats/${targetJid}`);
                batch.set(chatRef, {
                    lastMessage: data.type === 'text' ? (data.content as string).substring(0, 100) : `📷 ${data.type}`,
                    lastMessagePreview: data.type === 'text' ? (data.content as string).substring(0, 100) : `📷 ${data.type}`,
                    // [FIX] Padronização de campos para ordenação mestre - Usar fromMillis(Date.now()) para evitar bug de desaparecimento na sidebar
                    lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(Date.now()),
                    lastMessageAt: Date.now(),
                    lastMessageTimestampMillis: Date.now(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    remoteJid: targetJid
                }, { merge: true });
            }

            // Remove da Outbox após sucesso total
            batch.delete(docRef);
            await batch.commit();

        } catch (error: any) {
            console.error(JSON.stringify({ severity: 'ERROR', message: `[WORKER OUTBOX] Erro envio`, messageId, error: error.message, stack: error.stack }));
            
            // [RESILIÊNCIA] Classificação de Erro usando a nova função
            const httpStatus = error.response?.status;
            const classified = classifyError(error, httpStatus);
            
            console.log(`[WORKER OUTBOX] Erro classificado:`, {
                type: classified.type,
                message: classified.message,
                isFatal: classified.isFatal,
                httpStatus,
                retryCount: data.retryCount || 0
            });
            
            // [RETRY INTELIGENTE] - Limite de retries baseado no tipo de erro
            const maxRetries = 3;
            const currentRetry = data.retryCount || 0;
            
            // Se excedeu retries, marca como permanente
            let finalStatus: 'FAILED_PERMANENTLY' | 'FAILED_RETRYING';
            if (classified.isFatal || currentRetry >= maxRetries) {
                finalStatus = 'FAILED_PERMANENTLY';
            } else {
                finalStatus = 'FAILED_RETRYING';
            }

            // [LOG DETALHADO] para debugging
            const errorLog = {
                messageId,
                type: data.type,
                to: data.to,
                errorType: classified.type,
                errorMessage: classified.message,
                httpStatus,
                retryCount: currentRetry + 1,
                maxRetries,
                finalStatus,
                timestamp: new Date().toISOString()
            };
            
            console.log(`[WORKER OUTBOX] Atualizando status:`, JSON.stringify(errorLog));

            await docRef.update({
                status: finalStatus,
                retryCount: admin.firestore.FieldValue.increment(1),
                lastError: classified.message,
                errorType: classified.type,
                lastErrorRaw: error.message?.substring(0, 500), // Salva erro original truncado
                lastAttempt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Não throw para não travar o processamento das outras mensagens
            // O retry será feito na próxima vez que o worker processar a fila
        }
    }

    /**
     * Processa a fila de saída (Outbox) para uma instância específica.
     * Versão Otimizada: Batching + Paralelismo Controlado.
     */
    static async handleProcessOutbox(req: Request, res: Response) {
        const { instanceName, triggerMessageId } = req.body;
        
        // A Autenticação (apikey, OIDC token) é gerenciada no authMiddleware do server.ts
        // Não é necessário validar tokens manualmente aqui novamente.
        
        if (!instanceName) {
            res.status(400).send("instanceName required");
            return;
        }

        console.log(JSON.stringify({ severity: 'INFO', message: `[WORKER OUTBOX] Processing`, instanceName, trigger: triggerMessageId }));
        const db = admin.firestore();
        const BATCH_LIMIT = 20;

        try {
            // 0.5 Zombie Rescue (Unlock stuck messages > 5min)
            // Isso previne que crashes do worker travem a fila para sempre
            const zombieThreshold = new Date(Date.now() - 5 * 60 * 1000);
            const zombies = await db.collection(`instances/${instanceName}/outbox`)
                .where('status', '==', 'SENDING')
                .where('lastAttempt', '<', admin.firestore.Timestamp.fromDate(zombieThreshold))
                .limit(50)
                .get();
            
            if (!zombies.empty) {
                console.warn(`[WORKER OUTBOX] Resgatando ${zombies.size} mensagens zumbis (travadas em SENDING)`);
                const zombieBatch = db.batch();
                zombies.docs.forEach(doc => {
                    zombieBatch.update(doc.ref, { 
                        status: 'PENDING', 
                        retryCount: admin.firestore.FieldValue.increment(1),
                        lastError: 'System Recovery: Stuck in SENDING'
                    });
                });
                await zombieBatch.commit();
            }

            // 1. Fetch Batch (Up to 20 messages)
            const snapshot = await db.collection(`instances/${instanceName}/outbox`)
                .where('status', 'in', ['PENDING', 'FAILED_RETRYING'])
                .orderBy('createdAt', 'asc')
                .limit(BATCH_LIMIT)
                .get();

            if (snapshot.empty) {
                res.status(200).json({ success: true, processed: 0 });
                return;
            }

            // 2. Lock (Optimistic Update) & Group by Recipient
            const messages = snapshot.docs.map(doc => ({ 
                ref: doc.ref, 
                data: doc.data() as OutboxMessage, 
                id: doc.id 
            }));

            const lockedGroups: { [to: string]: typeof messages } = {};
            let lockCount = 0;

            // Tentativa de lock em paralelo
            await Promise.all(messages.map(async (msg) => {
                try {
                    await msg.ref.update({ 
                        status: 'SENDING', 
                        lastAttempt: admin.firestore.FieldValue.serverTimestamp() 
                    });
                    
                    const recipient = msg.data.to || 'unknown';
                    if (!lockedGroups[recipient]) lockedGroups[recipient] = [];
                    lockedGroups[recipient].push(msg);
                    lockCount++;
                } catch (e) {
                    // Lock failed (concorrência), ignora
                }
            }));

            if (lockCount === 0) {
                 res.status(200).json({ success: true, processed: 0, reason: "Lock contention" });
                 return;
            }

            // 3. Process Groups in Parallel (Round-Robin logic implicitly)
            // [OTIMIZAÇÃO] Limita a 5 chats simultâneos para evitar rate limit da Evolution
            const limit = pLimit(5);
            let processedCount = 0;
            
            const groupPromises = Object.values(lockedGroups).map((groupMsgs) => limit(async () => {
                // Process sequentially within group to maintain order for same chat
                for (const msg of groupMsgs) {
                    try {
                        await OutboxController.processMessage(db, instanceName, msg.id, msg.data, msg.ref);
                        processedCount++;
                        
                        // [ANTI-SPAM] Delay randômico entre mensagens para humanização (3 a 6 segundos)
                        const randomDelay = Math.floor(Math.random() * (6000 - 3000 + 1) + 3000);
                        await new Promise(r => setTimeout(r, randomDelay)); 
                    } catch (e) {
                        // Erro já tratado no processMessage (Retry scheduled)
                        // Continua para próxima msg do grupo (ou aborta grupo? Geralmente continua)
                    }
                }
            }));

            await Promise.all(groupPromises);

            res.status(200).json({ success: true, processed: processedCount });

        } catch (error: any) {
            console.error(`[WORKER OUTBOX] Erro geral:`, error);
            res.status(500).json({ error: error.message });
        }
    }
}
