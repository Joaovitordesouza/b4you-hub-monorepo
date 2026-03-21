import * as admin from "firebase-admin";
import axios from "axios";
import * as https from "https";
import pLimit from "p-limit";
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { Transform } from 'stream';
import { MediaService } from "./media.service";
import { formatMessageForFirestore, MediaInfo } from "../utils/formatter";
import { JidResolver } from "../utils/jid-resolver";
import { ContentParser } from "../utils/content-parser";
import { InstanceCache } from "../utils/instance-cache";
import { CloudTasksService, TaskPriority } from "./cloud-tasks.service";
import { Logger } from "../utils/logger";
import { getCircuitBreaker } from "../utils/circuit-breaker";
import { getPfpCircuitBreaker } from "../utils/pfp-circuit-breaker";
import { EvolutionChat } from "@b4you/types";

interface FetchMessagesOptions {
    limit?: number;
    _retry?: boolean; 
}

interface RequestOptions {
    timeout?: number;
    retries?: number;
}

interface PaginatedOptions {
    page: number;
    limit: number;
    skipMediaDownload?: boolean;
}

const keepAliveAgent = new https.Agent({ 
    keepAlive: true,
    keepAliveMsecs: 60000, // 60s (Padrão Google Cloud para evitar Socket Hangup)
    maxSockets: Infinity, // Sem limite artificial
    maxFreeSockets: 256,  // Buffer maior para reutilização
    timeout: 220000 // [PROD] Aumentado para 220s para suportar I/O lento do WhatsApp
});

export class EvolutionService {
    
    public static getChatTimestamp(chat: EvolutionChat | any): number {
        const timestampCandidates = [
            chat.lastMessage?.messageTimestamp,
            chat.lastMessageTimestamp,
            chat.conversationTimestamp,
            chat.timestamp,
            chat.updatedAt
        ];
        
        let maxTs = 0;
        for (const ts of timestampCandidates) {
            const num = Number(ts);
            if (!isNaN(num) && num > 0) {
                const finalTs = num < 10000000000 ? num * 1000 : num;
                if (finalTs > maxTs) maxTs = finalTs;
            }
        }
        return maxTs;
    }

    static extractMessageText(data: any): string {
        return ContentParser.extractContent(data);
    }

    static normalizePhone(phone: string): string[] {
        const clean = phone.replace(/\D/g, "");
        const variations = new Set<string>();
        variations.add(clean);
        if (clean.startsWith("55") && clean.length > 10) variations.add(clean.substring(2));
        if (clean.length >= 8) variations.add(clean.slice(-8));
        return Array.from(variations);
    }

    private static async requestWithRetry(
        instanceName: string, 
        endpoint: string, 
        method: 'GET' | 'POST' | 'DELETE' = 'GET', 
        data?: any, 
        requestOptions: RequestOptions = {}
    ): Promise<any> {
        // Se instanceName for inválido ou nulo, não prossegue
        if (!instanceName || typeof instanceName !== 'string') {
            Logger.warn('EvolutionService', 'Chamada requestWithRetry com instanceName inválido', { instanceName });
            throw new Error(`instanceName inválido: ${instanceName}`);
        }

        // [CIRCUIT BREAKER] Obtém ou cria o breaker para esta instância
        const breaker = getCircuitBreaker(instanceName);
        
        try {
            // Executa a requisição com proteção do circuit breaker
            return await breaker.execute(async () => {
                try {
                    return await this.doRequestWithRetry(instanceName, endpoint, method, data, requestOptions);
                } catch (doError: any) {
                    // [SRE FIX] Ignorar 404 para não punir o circuit breaker. 
                    // Se deu 404, a API está online, apenas a rota/instância falhou na aplicação.
                    if (doError.response?.status === 404 || doError.message?.includes('retornou 404')) {
                        doError.isApplicationError = true;
                    }
                    // [FIX] Erros 400 em rotas de mídia não devem abrir o Circuit Breaker
                    // A Evolution API retorna 400 quando a mídia ainda não está disponível no MongoDB.
                    if (doError.response?.status === 400 || doError.response?.status === 422) {
                        doError.isApplicationError = true;
                    }
                    throw doError;
                }
            });
        } catch (error: any) {
            // Se o circuit breaker estiver aberto, lança erro específico
            if (error.message === 'Circuit breaker is open') {
                Logger.warn('EvolutionService', `Circuit breaker ABERTO para ${instanceName}. Rejeitando requisição.`, { instanceName });
                const err: any = new Error(`Serviço temporariamente indisponível (Circuit Breaker)`);
                err.response = { status: 503, data: { message: 'Service Unavailable (Circuit Breaker Open)' } };
                throw err;
            }
            throw error;
        }
    }

    /**
     * Lógica interna de requisição (executada dentro do Circuit Breaker)
     */
    private static async doRequestWithRetry(
        instanceName: string, 
        endpoint: string, 
        method: 'GET' | 'POST' | 'DELETE' = 'GET', 
        data?: any, 
        requestOptions: RequestOptions = {}
    ): Promise<any> {
        let instanceData = await InstanceCache.get(instanceName);
        
        if (!instanceData) {
            const db = admin.firestore();
            const instanceDoc = await db.collection("instances").doc(instanceName).get();
            if (!instanceDoc.exists) throw new Error(`Instância ${instanceName} não encontrada.`);
            instanceData = instanceDoc.data();
        }
        
        const token = (process.env.EVOLUTION_APIKEY || instanceData?.token || "").trim();
        const apiUrl = (instanceData?.apiUrl || process.env.EVOLUTION_API_URL || "").trim();

        if (!token || !apiUrl) throw new Error(`Configuração inválida para ${instanceName}.`);

        const url = `${apiUrl.replace(/\/+$/, "")}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        const maxRetries = requestOptions.retries ?? 3;
        const timeout = requestOptions.timeout ?? 220000; // [PROD] 220s default
        
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= (maxRetries + 1); attempt++) {
            try {
                const requestStart = Date.now();
                // [DEBUG LOG] Request Payload (apenas na primeira tentativa)
                if (attempt === 1) {
                    Logger.debug('EvolutionService', `${method} ${url}`, { instanceName });
                } else {
                    Logger.warn('EvolutionService', `Retry ${attempt}/${maxRetries} - ${method} ${url}`, { instanceName });
                }

                const response = await axios({
                    method,
                    url,
                    data,
                    headers: { "Content-Type": "application/json", "apikey": token },
                    timeout: timeout,
                    httpsAgent: keepAliveAgent,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                    // [SRE] Retenta apenas erros de servidor (5xx) e timeouts de rede.
                    // IMPORTANTE: Erros 4xx são problemas de aplicação/cliente e NUNCA devem ser retentados.
                    validateStatus: (status) => status < 400 || (status >= 500 && status <= 599)
                });

                if (response.status >= 200 && response.status < 400) {
                    Logger.info('EvolutionService', `${method} ${url} - ${response.status} (${Date.now() - requestStart}ms)`, { instanceName });
                    const body = response.data;
                    if (body === null || body === undefined) throw new Error(`Resposta vazia`);
                    if (body.error || (body.message === "Unauthorized") || (body.statusCode && body.statusCode >= 400)) {
                        const apiError = JSON.stringify(body);
                        throw new Error(`Erro na API: ${apiError}`);
                    }
                    return body;
                } else {
                    const errorDetails = JSON.stringify(response.data);
                    const err: any = new Error(`Erro HTTP ${response.status}: ${errorDetails}`);
                    err.response = { status: response.status, data: response.data };
                    throw err;
                }
            } catch (error: any) {
                lastError = error;

                // [FIX] Erros que NÃO devem ser retentados - lança imediatamente
                // 400 (Bad Request), 401 (Auth), 403 (Forbidden), 404 (Not Found)
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    const status = error.response.status;
                    if (status === 401 || status === 403) {
                        Logger.error('EvolutionService', `Falha de autenticação (${status})`, error, { instanceName });
                    } else if (status === 404) {
                        Logger.warn('EvolutionService', `Endpoint ou Instância não encontrada (404)`, { instanceName, metadata: { url } });
                    } else if (status === 400) {
                        Logger.warn('EvolutionService', `Bad Request (400) - Payload inválido ou mídia expirada`, { instanceName, metadata: { url, data } });
                    }
                    throw error;
                }

                // [CORREÇÃO] Se excedeu retries, LANÇA ERRO ao invés de retornar null
                if (attempt > maxRetries) {
                    Logger.error('EvolutionService', 
                        `Max retries (${maxRetries}) exceeded for ${method} ${url}`, 
                        error, 
                        { instanceName, metadata: { attempt: attempt - 1 } }
                    );
                    throw new Error(`Max retries exceeded after ${attempt - 1} attempts: ${error.message}`);
                }

                // Backoff Exponencial com limite máximo de 30s
                const delay = Math.min(Math.pow(2, attempt) * 1000, 30000);
                Logger.warn('EvolutionService', `Retry ${attempt}/${maxRetries} after ${delay}ms`, { instanceName, error: error.message });
                await new Promise(r => setTimeout(r, delay));
            }
        }

        // Se chegou aqui, algo muito errado aconteceu
        throw lastError || new Error('Unknown error in doRequestWithRetry');
    }

    static async fetchChats(instanceId: string, options: { offset?: number, limit?: number, page?: number } = {}): Promise<any[]> {
        const responseData = await this.requestWithRetry(instanceId, `/chat/findChats/${instanceId}`, 'POST', {});
        if (!responseData) return [];
        let chats: any[] = responseData.chats || responseData.data || responseData.records || (Array.isArray(responseData) ? responseData : []);
        if (chats.length > 0) {
            chats.sort((a, b) => this.getChatTimestamp(b) - this.getChatTimestamp(a));
        }
        return chats;
    }

    static async streamAllChats(instanceName: string, onFirstBatch?: () => void, options: any = {}): Promise<number> {
        Logger.info('EvolutionService', `[STREAM] Iniciando conexão...`, { instanceName });
        let instanceData = await InstanceCache.get(instanceName) || (await admin.firestore().collection("instances").doc(instanceName).get()).data();
        const token = (process.env.EVOLUTION_APIKEY || instanceData?.token || "").trim();
        const apiUrl = (instanceData?.apiUrl || process.env.EVOLUTION_API_URL || "").trim();
        const url = `${apiUrl.replace(/\/+$/, "")}/chat/findChats/${instanceName}`;

        const response = await axios({
            method: 'POST',
            url,
            data: {}, 
            headers: { "Content-Type": "application/json", "apikey": token },
            responseType: 'stream',
            httpsAgent: keepAliveAgent,
            timeout: 300000 // [SRE FIX] 5 minutos para listas gigantescas
        });

        let bytesLogged = 0;
        const debugStream = new Transform({
            transform(chunk, encoding, callback) {
                if (bytesLogged < 500) {
                    Logger.debug('EvolutionService', `[STREAM DEBUG] Chunk`, { instanceName, metadata: { snippet: chunk.toString().substring(0, 500) } });
                    bytesLogged += 500;
                }
                this.push(chunk);
                callback();
            }
        });

        const pipeline = chain([response.data, debugStream, parser(), streamArray()]);
        pipeline.on('error', (err) => Logger.error('EvolutionService', `[STREAM ERROR]`, err, { instanceName }));

        let processedCount = 0;
        let batch: any[] = [];
        const BATCH_SIZE = 50; 
        const INITIAL_BUFFER_SIZE = 5; // [PERF] Reduzido de 20 para 5 - Early Activation
        let initialBuffer: any[] = [];
        let initialBufferFlushed = false;

        // [SRE FIX] Try-catch externo para capturar AbortError no stream
        try {
            for await (const { value: chat } of pipeline) {
            try {
                const remoteJid = JidResolver.resolveJid(chat);
                if (JidResolver.isValidJid(remoteJid)) {
                    const lastTs = EvolutionService.getChatTimestamp(chat) || Date.now();
                    const lightweightChat = {
                        remoteJid,
                        pushName: chat.pushName || chat.name || chat.subject || null,
                        profilePictureUrl: chat.profilePictureUrl || chat.profilePicUrl || null,
                        lastMessagePreview: ContentParser.extractContent(chat.lastMessage || chat),
                        conversationTimestamp: lastTs < 10000000000 ? lastTs * 1000 : lastTs,
                        unreadCount: chat.unreadCount || 0,
                        isGroup: remoteJid.endsWith('@g.us')
                    };

                    // [OPTIMIZAÇÃO] Pular grupos no buffer inicial - apenas contatos ativam Fase 2
                    const isGroup = remoteJid.endsWith('@g.us');
                    
                    if (!initialBufferFlushed) {
                        // Grupos vão direto para o batch normal, não contam para ativar Fase 2
                        if (isGroup) {
                            batch.push(lightweightChat);
                            processedCount++;
                            if (batch.length >= BATCH_SIZE) {
                                await this.processChatsBatch(instanceName, batch, { metadataOnly: true, fetchPfpImmediately: options.fetchPfpImmediately });
                                batch = [];
                            }
                        } else {
                            // Apenas contatos (não grupos) ativam a Fase 2
                            initialBuffer.push(lightweightChat);
                            processedCount++;
                            if (initialBuffer.length >= INITIAL_BUFFER_SIZE) {
                                initialBuffer.sort((a, b) => b.conversationTimestamp - a.conversationTimestamp);
                                await this.processChatsBatch(instanceName, initialBuffer, { metadataOnly: true, fetchPfpImmediately: options.fetchPfpImmediately });
                                initialBufferFlushed = true;
                                initialBuffer = [];
                                if (onFirstBatch) {
                                    Logger.info('EvolutionService', `[STREAM] Buffer Inicial Flush (contatos)`, { instanceName });
                                    onFirstBatch();
                                    onFirstBatch = undefined;
                                }
                            }
                        }
                    } else {
                        batch.push(lightweightChat);
                        processedCount++;
                        if (batch.length >= BATCH_SIZE) {
                            await this.processChatsBatch(instanceName, batch, { metadataOnly: true });
                            batch = [];
                        }
                    }
                }
            } catch (error: any) {
                Logger.error('EvolutionService', `[STREAM ITEM ERROR]`, error, { instanceName });
            }
        }
        } catch (streamError: any) {
            if (streamError.name === 'AbortError' || streamError.message?.includes('aborted')) {
                Logger.error('EvolutionService', `[STREAM ABORTED] Conexão interrompida prematuramente. Processados até agora: ${processedCount}`, streamError, { instanceName });
            } else {
                Logger.error('EvolutionService', `[STREAM ITERATION ERROR]`, streamError, { instanceName });
            }
        }

        if (batch.length > 0) await this.processChatsBatch(instanceName, batch, { metadataOnly: true });
        Logger.info('EvolutionService', `[STREAM DONE]`, { instanceName, metadata: { total: processedCount } });
        return processedCount;
    }

    static async fetchMessagesPaginated(instanceId: string, remoteJid: string, options: PaginatedOptions): Promise<any[]> {
        const { page, limit, skipMediaDownload } = options;
        const payload = { page, limit, where: { key: { remoteJid } } };
        let responseData = null;
        try {
            responseData = await this.requestWithRetry(instanceId, `/chat/findMessages/${instanceId}`, 'POST', payload);
        } catch (error: any) {
            Logger.warn('EvolutionService', `[API SKIP] Falha ao buscar mensagens (Network/Auth): ${error.message}`, { instanceName: instanceId, metadata: { remoteJid } });
            return [];
        }
        
        // [DEBUG] Log Payload Bruto da API
        if (responseData) {
            const payloadPreview = JSON.stringify(responseData).substring(0, 1000); // Aumentado para 1KB para debug
            Logger.debug('EvolutionService', `[FETCH DEBUG] Resposta da API`, { instanceName: instanceId, metadata: { remoteJid, keys: Object.keys(responseData), sample: payloadPreview } });
        }

        // [FIX] Normalização de resposta da Evolution API
        // A API pode retornar: [msg1, msg2], { messages: [msg1, msg2] }, { messages: { records: [msg1, msg2] } } ou { records: [...] }
        let messagesCandidate: any = null;

        if (responseData) {
             if (Array.isArray(responseData)) {
                 messagesCandidate = responseData;
             } else if (Array.isArray(responseData.messages)) {
                 messagesCandidate = responseData.messages;
             } else if (responseData.messages && Array.isArray(responseData.messages.records)) {
                 messagesCandidate = responseData.messages.records;
             } else if (Array.isArray(responseData.records)) {
                 messagesCandidate = responseData.records;
             }
        }

        // Validação estrita: Se não for array, loga e retorna vazio para evitar crash
        if (!Array.isArray(messagesCandidate)) {
             if (responseData) {
                 Logger.warn('EvolutionService', `[API WARNING] fetchMessages retornou formato inválido ou desconhecido`, { instanceName: instanceId, metadata: { remoteJid, type: typeof responseData, snippet: JSON.stringify(responseData).substring(0, 100) } });
             }
             return [];
        }

        let messages: any[] = messagesCandidate;

        for (const msg of messages) {
            try {
                const msgContent = msg.message || {};
                const hasMedia = Object.keys(msgContent).some(k => k.endsWith('Message') && k !== 'conversation' && k !== 'extendedTextMessage');
                if (hasMedia) {
                     const mediaInfo = await this.processMedia(instanceId, msg, true, skipMediaDownload);
                     if (mediaInfo) (msg as any)._mediaInfo = mediaInfo;
                }
            } catch (e) {
                Logger.warn('EvolutionService', `Erro processMedia`, { instanceName: instanceId, metadata: { jid: remoteJid } });
            }
        }
        return messages;
    }

    static async processSingleChatMessages(instanceId: string, jid: string, msgLimit: number, deep: boolean): Promise<void> {
        const db = admin.firestore();
        try {
            // [PERF] Reduce limit to 20 for initial fetch to prevent timeouts
            const safeLimit = Math.min(msgLimit, 20); 
            const messages = await this.fetchMessagesPaginated(instanceId, jid, { 
                page: 1, 
                limit: safeLimit,
                skipMediaDownload: true // [PERF] Ensure media download is skipped for sync
            });
            if (!Array.isArray(messages) || messages.length === 0) return;
            const bulk = db.bulkWriter();
            for (const msg of messages) {
                const msgId = msg.key?.id;
                if (!msgId) continue;
                let mediaInfo = (msg as any)._mediaInfo || null;
                const msgDoc = formatMessageForFirestore(msg, mediaInfo);
                if (!msgDoc) continue;
                const cleanMsg = ContentParser.sanitizeForFirestore(msgDoc);
                const extendedInfo = mediaInfo as any;
                if (extendedInfo?.mediaStatus === 'PENDING') {
                    (cleanMsg as any).mediaStatus = 'PENDING';
                    (cleanMsg as any).originalMediaUrl = extendedInfo.originalUrl;
                    // [SYNC] Histórico usa baixa prioridade para não engarrafar realtime
                    CloudTasksService.enqueueProcessMedia(
                        instanceId, msgId, jid, extendedInfo.originalUrl, extendedInfo.type, extendedInfo.mimetype, TaskPriority.LOW
                    ).catch(() => {});
                }
                bulk.set(db.doc(`instances/${instanceId}/chats/${jid}/messages/${msgId}`), cleanMsg, { merge: true });
            }
            await bulk.close();
        } catch (e: any) {
            Logger.error('EvolutionService', `processSingleChatMessages error`, e, { instanceName: instanceId, metadata: { jid } });
        }
    }

    static async processChatsBatch(instanceId: string, chats: any[], options: any = {}): Promise<string[]> {
        const db = admin.firestore();
        const processedIds: string[] = [];
        const bulkMetadata = db.bulkWriter();
        const profilePicsToFix: any[] = [];

        // [PFP FIX] Se fetchPfpImmediately estiver habilitado, buscar PFP imediatamente para os primeiros chats
        // ✅ AGORA COM CIRCUIT BREAKER para resiliência
        let pfpMap: Map<string, string> = new Map();
        if (options.fetchPfpImmediately && chats.length > 0) {
            Logger.info('EvolutionService', `[PFP FIX] Iniciando fetch imediato de PFP para ${chats.length} chats (com Circuit Breaker)`, { instanceName: instanceId });
            
            // ✅ Obter circuit breaker específico para PFP
            const pfpBreaker = getPfpCircuitBreaker(instanceId);
            const circuitState = pfpBreaker.getState();
            
            // Se circuit breaker já está OPEN, pular fetch de PFP silenciosamente
            if (circuitState === 'OPEN') {
                Logger.warn('EvolutionService', `[PFP FIX] Circuit Breaker OPEN - pulando fetch de PFP para evitar sobrecarga`, { instanceName: instanceId });
            } else {
                const priorityChats = chats.slice(0, 10); // Top 10 chats prioritários
                const pfLimit = pLimit(2); // [PERF] Aumentado de 1 para 2 para paralelo
                
                const pfpPromises = priorityChats.map(chat => pfLimit(async () => {
                    try {
                        const jid = chat.remoteJid;
                        if (!jid || jid.endsWith('@g.us')) return; // Pular grupos
                        
                        // ✅ USAR CIRCUIT BREAKER para fetch PFP
                        const pfpUrl = await pfpBreaker.executePfpFetch(async () => {
                            return await this.fetchProfilePictureUrl(instanceId, jid, { timeout: 10000 });
                        });
                        
                        // Se circuit breaker rejeitou (retornou null), pular silenciosamente
                        if (!pfpUrl) {
                            Logger.debug('EvolutionService', `[PFP FIX] Circuit breaker rejeitou ou retornou null para ${jid}`, { instanceName: instanceId });
                            return;
                        }
                        
                        if (pfpUrl) {
                            // [LAZY PFP] Não baixa a imagem agora. Usa a URL temporária para renderizar rápido.
                            // O download real será feito em background pela task.
                            pfpMap.set(jid, pfpUrl);
                            Logger.debug('EvolutionService', `[PFP FIX] URL obtida (Lazy): ${jid}`, { instanceName: instanceId });
                        }
                    } catch (e: any) {
                        // ✅ Falhas são silenciadas para não bloquear o sync inteiro
                        Logger.warn('EvolutionService', `[PFP FIX] Falha ao buscar PFP (silenciado)`, { instanceName: instanceId, metadata: { jid: chat.remoteJid, error: e.message } });
                    }
                }));
                
                await Promise.all(pfpPromises);
            }
            
            Logger.info('EvolutionService', `[PFP FIX] Fetch imediato concluído. ${pfpMap.size} PFPs obtidos.`, { instanceName: instanceId, metadata: { circuitState } });
        }

        for (const chat of chats) {
            const remoteJid = JidResolver.resolveJid(chat);
            if (!JidResolver.isValidJid(remoteJid)) continue;
            const chatType = JidResolver.getChatType(remoteJid);
            const previewText = chat.lastMessagePreview || ContentParser.extractContent(chat.lastMessage || chat);
            const lastTs = EvolutionService.getChatTimestamp(chat) || Date.now();
            const timestamp = lastTs < 10000000000 ? lastTs * 1000 : lastTs;
            
            // Usar PFP do map (se foi buscado imediatamente) ou do chat original
            let rawPfp = chat.profilePictureUrl || chat.profilePicUrl || null;
            if (pfpMap.has(remoteJid)) {
                rawPfp = pfpMap.get(remoteJid);
            }
            
            if (options.forceRefetchPfp) profilePicsToFix.push({ jid: remoteJid, forceFetch: true });
            else if (rawPfp && !rawPfp.includes("storage.googleapis.com")) profilePicsToFix.push({ jid: remoteJid, url: rawPfp });

            const chatData = ContentParser.sanitizeForFirestore({
                remoteJid, chatType, type: chatType,
                pushName: chat.pushName || chat.name || chat.subject || JidResolver.getCleanNumber(remoteJid),
                profilePictureUrl: rawPfp,
                lastMessage: previewText, lastMessagePreview: previewText,
                lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(timestamp),
                lastMessageAt: timestamp,
                lastMessageTimestampMillis: timestamp,
                unreadCount: Number(chat.unreadCount || 0),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            bulkMetadata.set(db.doc(`instances/${instanceId}/chats/${remoteJid}`), chatData, { merge: true });
            processedIds.push(remoteJid);
        }
        await bulkMetadata.close();

        // [NON-BLOCKING PFP] Mover processamento de fotos para Cloud Tasks
        // Agora processamos TODOS os PFPs que não são do Storage, para salvar a URL da CDN do WhatsApp sem baixar
        for (const item of profilePicsToFix) {
            if (item.forceFetch) {
                this.fetchProfilePictureUrl(instanceId, item.jid).then(url => {
                    if (url) {
                        try {
                            db.doc(`instances/${instanceId}/chats/${item.jid}`).set({ profilePictureUrl: url }, { merge: true });
                        } catch(e) {}
                    }
                }).catch(() => {});
            } 
            // Se já tem URL, ela já foi salva nos metadados acima (profilePictureUrl: rawPfp) no db.set
        }
        return processedIds;
    }

    static async fetchProfilePictureUrl(instanceId: string, remoteJid: string, options: any = {}): Promise<string | null> {
        const data = await this.requestWithRetry(instanceId, `/chat/fetchProfilePictureUrl/${instanceId}`, 'POST', { number: remoteJid }, options);
        return data?.pictureUrl || data?.profilePicUrl || data?.profilePictureUrl || null;
    }

    static async processMedia(instanceId: string, message: any, skipUpload: boolean = false, skipDownload: boolean = false): Promise<MediaInfo | null> {
        const msgContent = message.message || message.content || {};
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        let mediaMessage = null;
        let type: any = 'unknown';
        for (const t of mediaTypes) { if (msgContent[t]) { mediaMessage = msgContent[t]; type = t.replace('Message', ''); break; } }
        if (!mediaMessage) return null;

        if (skipDownload && skipUpload) {
            const originalUrl = mediaMessage.url || mediaMessage.directPath || "";
            Logger.debug('EvolutionService', `[PENDING MEDIA] Agendando processamento assíncrono (sync histórico)`, { instanceName: instanceId, metadata: { type, hasUrl: !!originalUrl } });
            return { type, url: "", mimetype: mediaMessage.mimetype || 'application/octet-stream', filename: mediaMessage.fileName, caption: mediaMessage.caption, 
                // @ts-ignore
                originalUrl: originalUrl, mediaStatus: 'PENDING' };
        }

        try {
            let finalUrl = mediaMessage.url;
            let mediaStatus = 'UPLOADED';

            if (mediaMessage.url && !mediaMessage.url.includes("storage.googleapis.com")) {
                 const persisted = await MediaService.downloadAndPersist(instanceId, mediaMessage.url, mediaMessage.mimetype);
                 
                 if (persisted === 'EXPIRED') {
                     mediaStatus = 'EXPIRED';
                     // Mantém a URL original (mesmo quebrada) para referência, mas marca status
                 } else if (persisted) {
                     finalUrl = persisted;
                 }
            }
            // @ts-ignore
            return { type, url: finalUrl || "", mimetype: mediaMessage.mimetype, filename: mediaMessage.fileName, caption: mediaMessage.caption, mediaStatus };
        } catch (e: any) {
            const errorDetails = JSON.stringify(e, Object.getOwnPropertyNames(e));
            Logger.error('EvolutionService', `Erro ao processar mídia inline: ${errorDetails}`, e, { instanceName: instanceId });
            return { type, url: "", mimetype: mediaMessage.mimetype, filename: mediaMessage.fileName, caption: mediaMessage.caption, 
                // @ts-ignore
                error: true };
        }
    }

    static async saveDirectBatchMessages(instanceId: string, messages: any[]): Promise<void> {
        const db = admin.firestore();
        // [FIX] Substituir BulkWriter por Batch para evitar DEADLINE_EXCEEDED em lotes pequenos (<500)
        // Batch é atômico, mais rápido e menos propenso a overhead de conexão
        const batch = db.batch();

        let count = 0;
        for (const msg of messages) {
            try {
                const msgId = msg.key?.id || msg.id;
                const remoteJid = JidResolver.resolveJid(msg);
                if (!msgId || !remoteJid) continue;

                // [SAFETY] Limite hard do Firestore Batch é 500 operações
                if (count >= 495) {
                    Logger.warn('EvolutionService', `[BATCH LIMIT] Atingido limite de 500 ops por batch. Ignorando restante.`, { instanceName: instanceId });
                    break;
                }

                let mediaInfo = (msg as any)._mediaInfo || null;
                const msgDoc = formatMessageForFirestore(msg, mediaInfo);
                
                if (msgDoc) {
                    const cleanMsg = ContentParser.sanitizeForFirestore(msgDoc);
                    
                    // Injeta status PENDING se houver mediaInfo pendente
                    const extendedInfo = mediaInfo as any;
                    if (extendedInfo?.mediaStatus === 'PENDING') {
                        (cleanMsg as any).mediaStatus = 'PENDING';
                        (cleanMsg as any).originalMediaUrl = extendedInfo.originalUrl;
                        // [SYNC] Lote de histórico = Prioridade BAIXA
                        CloudTasksService.enqueueProcessMedia(
                            instanceId, msgId, remoteJid, extendedInfo.originalUrl, extendedInfo.type, extendedInfo.mimetype, TaskPriority.LOW
                        ).catch(() => {});
                    }

                    batch.set(db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${msgId}`), cleanMsg, { merge: true });
                    count++;
                }
            } catch (e: any) {
                Logger.warn('EvolutionService', `Erro ao formatar mensagem para lote`, { instanceName: instanceId, metadata: { error: e.message } });
            }
        }
        
        if (count > 0) {
            try {
                await batch.commit();
                Logger.info('EvolutionService', `saveDirectBatchMessages (Batch) done`, { instanceName: instanceId, metadata: { count } });
            } catch (error: any) {
                Logger.error('EvolutionService', `[BATCH ERROR] Falha ao commitar batch de mensagens`, error, { instanceName: instanceId });
                throw error; // Propaga erro para retentar se necessário
            }
        }
    }

    static async saveMessage(instanceId: string, messageData: any): Promise<void> {
        const db = admin.firestore();
        const remoteJid = JidResolver.resolveJid(messageData);
        if (!JidResolver.isValidJid(remoteJid)) return;
        
        const messageId = messageData.key?.id || messageData.id;
        
        // [NON-BLOCKING] skipUpload e skipDownload true para não travar o webhook realtime
        const mediaInfo = await this.processMedia(instanceId, messageData, true, true);
        const msgDoc = formatMessageForFirestore(messageData, mediaInfo);
        
        if (!msgDoc) return;
        
        const cleanMsg = ContentParser.sanitizeForFirestore(msgDoc);

        // [MEDIA QUEUE] Se for mídia pendente, agenda a task
        const extendedInfo = mediaInfo as any;
        if (extendedInfo?.mediaStatus === 'PENDING') {
            const mediaUrl = extendedInfo.originalUrl;
            
            // Validação de Mídia antes de enfileirar
            if (!mediaUrl && !messageData.base64) {
                Logger.warn('EvolutionService', `[SKIP MEDIA] Mensagem ${messageId} sem dados de mídia válidos.`);
            } else {
                (cleanMsg as any).mediaStatus = 'PENDING';
                (cleanMsg as any).originalMediaUrl = mediaUrl;
                
        // [REALTIME] Webhook = Prioridade ALTA (fura-fila) com delay de 15s para Evolution syncar no DB
        // Aumentado para 15s para garantir que o MongoDB da Evolution já tenha a mensagem disponível (evita 400)
        CloudTasksService.enqueueProcessMedia(
            instanceId, 
            messageId, 
            remoteJid, 
            mediaUrl, 
            extendedInfo.type,
            extendedInfo.mimetype,
            TaskPriority.HIGH,
            15 // delaySeconds
        ).catch(err => {
                    const errorDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
                    Logger.error('EvolutionService', `Falha ao enfileirar mídia realtime: ${errorDetails}`, err);
                });
            }
        }

        // [BATCH] Salva Mensagem e Atualiza Chat (Atomicidade Relativa)
        const batch = db.batch();
        const msgRef = db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${messageId}`);
        batch.set(msgRef, cleanMsg, { merge: true });

        // Atualiza metadados do Chat para ordenação e preview
        const chatRef = db.doc(`instances/${instanceId}/chats/${remoteJid}`);
        // [FIX] Usar Date.now() como fallback seguro se o timestamp da mensagem for inválido
        // Isso previne salvar Timestamp(0) (01/01/1970) que empurraria o chat para o fundo da lista.
        let now = Number(cleanMsg.timestamp);
        if (!now || isNaN(now) || now < 1000000000000) {
            now = Date.now();
        }
        const updateData: any = {
            lastMessage: cleanMsg.text || "Mídia",
            lastMessagePreview: cleanMsg.text || "Mídia", // [FIX] Padronização de campos para ordenação mestre - Usar fromMillis(Date.now()) para evitar bug de desaparecimento na sidebar
            lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(now),
            lastMessageTimestampMillis: now,
            lastMessageAt: now,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (!cleanMsg.fromMe) {
            updateData.unreadCount = admin.firestore.FieldValue.increment(1);
        }

        batch.set(chatRef, updateData, { merge: true });

        await batch.commit();
    }

    static async request(instanceName: string, endpoint: string, method: any = 'GET', data?: any): Promise<any> {
        return this.requestWithRetry(instanceName, endpoint, method, data);
    }

    static async sendText(instanceName: string, remoteJid: string, text: string, options: any = {}): Promise<any> {
        return this.requestWithRetry(instanceName, `/message/sendText/${instanceName}`, 'POST', { number: remoteJid, text, options });
    }

    static async sendMedia(instanceName: string, remoteJid: string, media: string, type: string, caption: string = "", options: any = {}): Promise<any> {
        console.log(`[EvolutionService] sendMedia: type=${type}, caption=${caption?.substring(0, 50)}, ptt=${options.ptt || false}, mimetype=${options.mimetype || 'none'}, fileName=${options.fileName || 'none'}`);
        console.log(`[EvolutionService] sendMedia: URL média (primeiros 100 chars): ${media.substring(0, 100)}...`);

        // Evolution API v2: Payload super simplificado para `/message/sendMedia/{instance}`
        const payload: any = {
            number: remoteJid,
            mediatype: type,      // Ex: "image", "document", "video", "audio"
            mimetype: options.mimetype || undefined,
            caption: caption || undefined,
            media: media,         // Aceita URL pública
            fileName: options.fileName || `${type}-${Date.now()}.${type === 'audio' ? 'ogg' : type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`
        };

        // Evolution v2 Voice Notes config
        if (type === 'audio' && options.ptt) {
            payload.options = { delay: options.delay || 1200, presence: 'recording', ptt: true };
        } else {
            payload.options = { delay: options.delay || 1200, presence: 'composing' };
        }

        try {
            // Tenta o endpoint padronizado da V2 para mídias
            const result = await this.requestWithRetry(instanceName, `/message/sendMedia/${instanceName}`, 'POST', payload);
            console.log(`[EvolutionService] sendMedia: Sucesso! Message ID: ${result?.key?.id || result?.id || result?.data?.key?.id}`);
            return result;
        } catch (error: any) {
            // Se o erro for de conexão, circuito, ou instância 404
            if (error.message && (error.message.includes('retornou 404') || error.message.includes('Circuit breaker'))) {
                throw error;
            }

            // Fallback (Somente se receber um 404 específico de endpoint não encontrado, e não da instância)
            if (error.response?.status === 404 && error.response?.data?.error === 'Not Found') {
                 console.log(`[EvolutionService] Fallback para /message/sendWhatsAppMedia devido a rota inexistente.`);
                 
                 const fallbackPayload = {
                     number: remoteJid,
                     options: { delay: 1200, presence: type === 'audio' ? 'recording' : 'composing' },
                     mediaMessage: {
                         mediatype: type,
                         caption,
                         media,
                         ptt: options.ptt || false
                     }
                 };
                 
                 const resultFallback = await this.requestWithRetry(instanceName, `/message/sendWhatsAppMedia/${instanceName}`, 'POST', fallbackPayload);
                 return resultFallback;
            }
             
            console.error(`[EvolutionService] sendMedia: Falha!`, {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            throw error;
        }
    }

    static async sendReaction(instanceName: string, remoteJid: string, reaction: string, messageId: string, fromMe: boolean = true): Promise<any> {
        const payload: any = {
            key: {
                remoteJid,
                fromMe,
                id: messageId
            },
            reaction
        };
        return this.requestWithRetry(instanceName, `/message/sendReaction/${instanceName}`, 'POST', payload);
    }

    /**
     * Obtém o Base64 de uma mídia via Evolution API.
     * Este método é mais resiliente que o download direto da CDN.
     * 
     * @param instanceName - Nome da instância
     * @param messageId - ID da mensagem
     * @param remoteJid - JID do remetente/destinatário (OBRIGATÓRIO para a API funcionar!)
     * @param convertToMp4 - Se true, converte áudio para MP4
     */
  static async getBase64FromMedia(instanceName: string, messageId: string, remoteJid: string, convertToMp4: boolean = false): Promise<any> {
    // [FIX] Payload alinhado com a documentação da Evolution API v2
    Logger.info('EvolutionService', `getBase64FromMedia: Buscando mídia ${messageId}`, { instanceName });
    
    return this.requestWithRetry(instanceName, `/chat/getBase64FromMediaMessage/${instanceName}`, 'POST', {
        message: {
            key: {
                id: messageId
            }
        },
        convertToMp4: !!convertToMp4
    }, { retries: 2, timeout: 45000 });
}

/**
 * Envia estado de presença (composing, recording, etc)
 * Otimizado para não gerar erro fatal se a API falhar (comum na v2)
 */
static async sendPresence(instanceName: string, remoteJid: string, status: 'composing' | 'recording' | 'paused'): Promise<any> {
    try {
        return await this.requestWithRetry(instanceName, `/chat/sendPresence/${instanceName}`, 'POST', {
            number: remoteJid,
            presence: status,
            delay: 1200
        }, { retries: 0, timeout: 5000 }); // Sem retry e timeout curto
    } catch (e) {
        // Silencia erro de presença para não afetar o envio principal
        return null;
    }
}

    static async syncInstanceHistory(instanceId: string, options: any = {}) {
        const chats = await this.fetchChats(instanceId);
        const toProcess = options.fast ? chats.slice(0, 10) : chats;
        await this.processChatsBatch(instanceId, toProcess, { msgLimit: options.fast ? 30 : 50 });
    }
}
