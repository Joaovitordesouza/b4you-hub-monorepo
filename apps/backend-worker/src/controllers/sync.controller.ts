import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { EvolutionService } from "../services/evolution.service";
import { MediaService } from "../services/media.service";
import { formatMessageForFirestore, MediaInfo, getSafeMillis } from "../utils/formatter";
import { JidResolver } from "../utils/jid-resolver";
import { ContentParser } from "../utils/content-parser";
import { CloudTasksService } from "../services/cloud-tasks.service";
import { DirectDbService } from "../services/direct-db.service";
import { Logger } from "../utils/logger";
import * as crypto from 'crypto';
import pLimit from "p-limit";

/**
 * Controller responsável pela orquestração do Smart Sync (Fast + Drip).
 * Garante que o banco de dados seja aguardado e limita a concorrência para evitar Race Conditions.
 */
export class SyncController {

    /**
     * Teste de Sanidade de Banco (Permissões de Escrita)
     */
    public static async checkDbPermissions() {
        try {
            const db = admin.firestore();
            const debugRef = db.collection('debug_logs').doc('worker_startup');
            await debugRef.set({
                log: 'Worker iniciou e tem permissão de escrita',
                time: admin.firestore.FieldValue.serverTimestamp(),
                workerId: process.env.HOSTNAME || 'unknown'
            });
            Logger.info('SyncController', '[DB SANITY] ✅ Teste de escrita aprovado');
        } catch (error: any) {
            Logger.error('SyncController', '[DB SANITY] Falha de permissão no Firestore', error);
        }
    }

    /**
     * Ponto de entrada para o Smart Sync Refatorado (Stream + Paginação).
     * FLUXO CORRIGIDO: Mapeamento -> Prioridade (aguarda) -> Deep Sync (Background)
     * 
     * 🎯 Objetivo: Garantir que a Fase 2 (Priority) termine ANTES da Fase 3 (Deep Sync)
     * para evitar race conditions e duplicação de trabalho.
     */
    static async executeSmartSync(instanceName: string) {
        Logger.info('SyncController', `[SMART SYNC] Pipeline iniciado`, { instanceName });
        
        try {
            const db = admin.firestore();
            const instanceRef = db.collection("instances").doc(instanceName);

            // [FIX] Debounce: Evita Race Condition de Webhooks (connection.update) duplicados
            const docSnap = await instanceRef.get();
            const lastSyncStart = getSafeMillis(docSnap.data()?.lastSyncStart);
            
            if (lastSyncStart > 0 && (Date.now() - lastSyncStart < 10000)) {
                Logger.info('SyncController', `[SMART SYNC] Debounce: Ignorado ( < 10s)`, { instanceName });
                return;
            }

            // Lock imediato
            await instanceRef.set({ 
                lastSyncStart: admin.firestore.FieldValue.serverTimestamp(),
                systemStatus: "SYNCING",
                isSyncing: true
            }, { merge: true });

            // --- FASE 1: MAPEAMENTO (Stream de Chats) ---
            Logger.info('SyncController', `[SMART SYNC] → Fase 1: Mapeamento (Stream)`, { instanceName });
            
            // Controle de execução única para a fase de prioridade
            let priorityRan = false;
            const priorityPromise: Promise<void> = new Promise((resolve) => {
                const runPriority = async () => {
                    if (!priorityRan) {
                        priorityRan = true;
                        Logger.info('SyncController', `[SMART SYNC] → Fase 2: Hidratação Prioritária iniciada...`, { instanceName });
                        try {
                            await SyncController.executePriorityPhase(instanceName);
                            Logger.info('SyncController', `[SMART SYNC] → Fase 2: Hidratação Prioritária CONCLUÍDA`, { instanceName });
                        } catch (e: any) {
                            Logger.error('SyncController', `[SMART SYNC] Erro na Fase 2`, e, { instanceName });
                        }
                        resolve();
                    }
                };
                
                // Passa o callback para a Fase 1
                SyncController.executeMappingPhase(instanceName, runPriority).then(() => {
                    // Se o stream acabou e o callback não rodou (ex: poucos chats), roda agora
                    if (!priorityRan) {
                        Logger.info('SyncController', `[SMART SYNC] Stream finalizado sem acionar Fase 2. Executando agora.`, { instanceName });
                        runPriority();
                    }
                });
            });

            // ✅ AGUARDA a Fase 2 terminar completamente antes de prosseguir
            await priorityPromise;
            Logger.info('SyncController', `[SMART SYNC] → Fases 1 e 2 CONCLUÍDAS. Iniciando Fase 3...`, { instanceName });

            // --- FASE 3: DEEP SYNC (Background) ---
            // ✅ SÓ inicia após a Fase 2 garantir que os Top 10 estão hidratados
            await SyncController.executeDeepSync(instanceName, 0, false);
            
            Logger.info('SyncController', `[SMART SYNC] Pipeline FINALIZADO (Fases 1, 2 e 3 iniciadas)`, { instanceName });
        } catch (e: any) {
            Logger.error('SyncController', `[SMART SYNC] Erro fatal no pipeline`, e, { instanceName });
            const db = admin.firestore();
            await db.collection("instances").doc(instanceName).update({
                systemStatus: "ERROR",
                isSyncing: false,
                "syncStatus.message": `Erro no Sync: ${e.message}`
            });
        }
    }

    /**
     * FASE 1: MAPEAMENTO
     * Chama streamAllChats para popular a lista lateral.
     * Implementa Smart Retry para aguardar a Evolution popular o banco.
     */
    static async executeMappingPhase(instanceName: string, onFirstBatch?: () => void) {
        Logger.info('SyncController', `[PHASE 1] Iniciando Mapeamento (Stream)...`, { instanceName });
        const db = admin.firestore();
        const instanceRef = db.collection("instances").doc(instanceName);

        await instanceRef.update({ 
            "syncStatus.status": "MAPPING",
            "syncStatus.message": "Mapeando conversas (Stream)..."
        });

        // [FIX CRÍTICO] Backoff Progressivo: máximo ~4 minutos para aguardar WhatsApp pesado popular.
        // Sequência: 5s, 5s, 5s, 5s, 10s, 10s, 10s, 10s, 20s, 20s, 20s, 20s, 30s, 30s, 30s, 30s, 30s...
        // Isso evita que o Sync aborte precocemente em contas com histórico volumoso.
        const RETRY_DELAYS_MS = [
             5000,  5000,  5000,  5000,  // 20s
            10000, 10000, 10000, 10000,  // +40s = 60s total
            15000, 15000, 15000, 15000,  // +60s = 120s total
            20000, 20000, 20000, 20000,  // +80s = 200s total
            30000, 30000, 30000, 30000,  // +120s = 320s total (~5 min)
        ];
        const MAX_RETRIES = RETRY_DELAYS_MS.length;
        let count = 0;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Usa o novo método de Stream do Service com Callback
                // ✅ [REABILITADO] fetchPfpImmediately com Circuit Breaker para resiliência
                count = await EvolutionService.streamAllChats(instanceName, onFirstBatch, { fetchPfpImmediately: true });
                
                if (count > 0) {
                    await instanceRef.update({ 
                        "syncStatus.totalChats": count,
                        "syncStatus.message": `Mapeamento concluído (${count} chats).` 
                    });
                    Logger.info('SyncController', `[PHASE 1] Mapeamento concluído.`, { instanceName, metadata: { count, attempt } });
                    break;
                } else {
                    const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 30000;
                    const elapsedEstimate = RETRY_DELAYS_MS.slice(0, attempt - 1).reduce((a, b) => a + b, 0) / 1000;
                    Logger.info('SyncController', `[FAST SYNC] Base vazia (Tentativa ${attempt}/${MAX_RETRIES}, ~${elapsedEstimate}s decorridos). Aguardando WhatsApp popular...`, { instanceName });
                    await instanceRef.update({ 
                        "syncStatus.message": `Aguardando WhatsApp popular chats (Tentativa ${attempt}/${MAX_RETRIES})...` 
                    });
                    if (attempt < MAX_RETRIES) await SyncController.sleep(delayMs);
                }
            } catch (error: any) {
                const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
                Logger.error('SyncController', `[PHASE 1] Erro no Stream: ${errorDetails}`, error, { instanceName, metadata: { attempt } });
                
                // [CIRCUIT BREAKER] Abortar em caso de erro de Autenticação (Chave inválida)
                if (error.response?.status === 401 || error.response?.status === 403 || error.message?.includes("Unauthorized")) {
                    Logger.error('SyncController', `[PHASE 1] FATAL: Erro de Autenticação. Abortando retry.`, undefined, { instanceName });
                    await instanceRef.update({ 
                        systemStatus: "ERROR",
                        "syncStatus.status": "ERROR",
                        "syncStatus.message": "Falha de Autenticação na API (Verifique API Key)."
                    });
                    return; // Aborta a função, não tenta mais
                }

                const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 30000;
                if (attempt < MAX_RETRIES) await SyncController.sleep(delayMs);
            }
        }

        if (count === 0) {
             Logger.warn('SyncController', `[PHASE 1] Nenhum chat encontrado após todas as tentativas (~5min). Assumindo conta nova ou API com problema.`, { instanceName });
             await instanceRef.update({ 
                "syncStatus.message": "Nenhuma conversa encontrada (WhatsApp sem histórico ou API lenta)." 
            });
        }
    }

    /**
     * FASE 2 & 3: PRIORIDADE E HIDRATAÇÃO
     * Pega os 10 chats mais recentes do banco (já populados pela fase 1) e hidrata.
     */
    static async executePriorityPhase(instanceName: string) {
        Logger.info('SyncController', `[PHASE 2/3] Iniciando Hidratação Prioritária...`, { instanceName });
        const db = admin.firestore();
        const instanceRef = db.collection("instances").doc(instanceName);

        await instanceRef.update({ 
            "syncStatus.status": "HYDRATING_PRIORITY",
            "syncStatus.message": "Hidratando conversas recentes..." 
        });

        try {
            // Fase 2: Consulta Firestore
            Logger.info('SyncController', `[PHASE 2/3] Querying Firestore for recent chats...`, { instanceName });
            const queryStart = Date.now();
            // [PERF] Usar lastMessageTimestampMillis (número) para ordenação mais rápida
            const chatsSnapshot = await db.collection("instances").doc(instanceName).collection("chats")
                .orderBy("lastMessageTimestampMillis", "desc") // Campo numérico = query mais rápida
                .limit(10)
                .get();
            Logger.info('SyncController', `[PHASE 2/3] Firestore Query done in ${Date.now() - queryStart}ms`, { instanceName });

            if (chatsSnapshot.empty) {
                Logger.info('SyncController', `[PHASE 2/3] Nenhum chat encontrado para hidratar.`, { instanceName });
                return;
            }

            Logger.info('SyncController', `[PHASE 2/3] Hidratando ${chatsSnapshot.size} chats prioritários...`, { instanceName });

            // Fase 3: Hidratação (Limit 100) - AUMENTADO para buscar mais mensagens nos chats prioritários
            const limit = pLimit(1); // [PERF] Reduzido de 2 para 1 - Garantir estabilidade absoluta e evitar DEADLINE_EXCEEDED
            const hydrationTasks = chatsSnapshot.docs.map(doc => limit(async () => {
                const jid = doc.id;
                const chatData = doc.data();

                try {
                    Logger.info('SyncController', `[HYDRATION] Starting hydration for ${jid}`, { instanceName });
                    
                    // 1. Fetch Messages (Promise) - AGORA COM skipMediaDownload PARA NON-BLOCKING
                    // [PERF] Reduzido de 100 para 30 para evitar timeout na Railway
                    const messagesPromise = EvolutionService.fetchMessagesPaginated(instanceName, jid, { 
                        page: 1, 
                        limit: 30, // REDUZIDO: 100 → 30
                        skipMediaDownload: true  // ✅ CRÍTICO: Texto instantâneo, mídia em background
                    })
                        .catch((err: any): any[] => {
                            Logger.warn('SyncController', `[HYDRATION] Falha ao baixar mensagens`, { instanceName, metadata: { jid, error: err.message } });
                            return [];
                        });

                    // 2. Fetch PFP (Fire-and-Forget) - MOVIDO para task separada para não bloquear o sync
                    // [OTIMIZAÇÃO] Não chamamos fetchProfilePictureUrl aqui para evitar gargalo na Evolution API
                    // Se a URL já veio no metadado do chat (Fase 1), ela será atualizada eventualmente.
                    // Se for crítico, podemos agendar uma task de "update profile" separada.
                    
                    // Executa apenas o fetch de mensagens (Crítico)
                    const messages = await messagesPromise;
                    
                    Logger.debug('SyncController', `[HYDRATION] Mensagens baixadas`, { instanceName: instanceName, metadata: { jid, count: messages?.length || 0 } });

                    if (messages && messages.length > 0) {
                        await EvolutionService.saveDirectBatchMessages(instanceName, messages);
                    } else {
                        Logger.debug('SyncController', `[HYDRATION] Nenhum mensagem retornada pela API`, { instanceName: instanceName, metadata: { jid } });
                    }
                } catch (e: any) {
                    Logger.error('SyncController', `[PHASE 3] Falha crítica ao hidratar chat`, e, { instanceName, metadata: { jid } });
                    // Continua para o próximo
                }
            }));

            await Promise.all(hydrationTasks);

            await instanceRef.update({ 
                "syncStatus.message": "Conversas recentes atualizadas." 
            });
            Logger.info('SyncController', `[PHASE 2/3] Hidratação prioritária concluída.`, { instanceName });

        } catch (error: any) {
            Logger.error('SyncController', `[PHASE 2/3] Erro na hidratação`, error, { instanceName });
        }
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static async waitForHistoryReady(instanceName: string, maxAttempts = 5): Promise<boolean> {
        // Método mantido para compatibilidade, mas Phase 1 agora garante histórico básico
        return true; 
    }

    /**
     * FASE 4: DEEP SYNC (BACKGROUND)
     * Inicia a task para hidratar o resto lentamente.
     */
    static async executeDeepSync(instanceName: string, initialOffset = 0, force = false) {
        Logger.info('SyncController', `[PHASE 4] Iniciando Deep Sync (Background)...`, { instanceName });
        const db = admin.firestore();
        const instanceRef = db.collection("instances").doc(instanceName);

        const docSnap = await instanceRef.get();
        const data = docSnap.data();
        const lastStart = getSafeMillis(data?.syncStatus?.lastStart);
        
        // Lock simples para background
        if (data?.isSyncing && data?.syncStatus?.status === "PROCESSING" && 
            (Date.now() - lastStart < 5 * 60 * 1000) && !force) {
            return;
        }

        await instanceRef.update({ 
            "syncStatus.status": "PROCESSING", // Mantém status para UI saber que está trabalhando
            "syncStatus.message": "Sincronizando histórico antigo (Background)...",
            "syncStatus.lastStart": admin.firestore.FieldValue.serverTimestamp()
        });

        try {
            // [FIX] Loopless Architecture
            // Inicia com cursor NULL para pegar os primeiros do banco
            await CloudTasksService.enqueueSyncPage(instanceName, 1, null);
            
            Logger.info('SyncController', `[PHASE 4] Task de background iniciada.`, { instanceName });
            return 0;

        } catch (error: any) {
            const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
            Logger.error('SyncController', `[DEEP SYNC] Erro ao agendar task: ${errorDetails}`, error, { instanceName });
            // Não falha o sync principal, apenas loga
        }
    }

    /**
     * Processa UMA página de sincronização e agenda a próxima se necessário.
     * [FIX] Agora usa iteração de cursor sobre o Firestore, eliminando o loop na API.
     */
    static async processSyncPage(instanceName: string, page: number, cursor: string | null = null) {
        const db = admin.firestore();
        const instanceRef = db.collection("instances").doc(instanceName);
        const syncStateRef = instanceRef.collection("metadata").doc("syncState");

        Logger.info('SyncController', `[TASK WORKER] Processando página`, { instanceName, metadata: { page, cursor: cursor || 'Inicio' } });

        try {
            // Lock Otimista
            await syncStateRef.set({
                currentPage: page,
                currentCursor: cursor,
                status: 'RUNNING',
                lastUpdate: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // 1. Consulta Firestore (Iteração Local)
            let query = instanceRef.collection("chats")
                .orderBy("lastMessageTimestampMillis", "desc") // [PERF] Campo numérico para query rápida
                .limit(10); // [OTIMIZAÇÃO] Reduzido para 10 para evitar sobrecarga e timeouts

            if (cursor) {
                const cursorDoc = await instanceRef.collection("chats").doc(cursor).get();
                if (cursorDoc.exists) {
                    query = query.startAfter(cursorDoc);
                } else {
                    Logger.warn('SyncController', `[TASK WORKER] Cursor não encontrado. Abortando.`, { instanceName, metadata: { cursor } });
                    // Em tese não deve acontecer, mas se acontecer, melhor parar.
                    await SyncController.finishSync(instanceName, "Sincronização interrompida (Cursor inválido).");
                    return;
                }
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                Logger.info('SyncController', `[TASK WORKER] Fim da iteração (Snapshot vazio).`, { instanceName });
                await SyncController.finishSync(instanceName, "Sincronização completa.");
                return;
            }

            Logger.info('SyncController', `[TASK WORKER] Encontrados ${snapshot.size} chats para hidratar.`, { instanceName });

            // 2. Hidratação (Fetch Messages) - CORREÇÃO: Paginação Completa + Isolamento por Chat
            // [FIX CRÍTICO] Usar Promise.allSettled para garantir que a falha de 1 chat não aborte o lote inteiro.
            const limit = pLimit(1); // [PERF] 1 chat por vez - evita sobrecarga na Evolution API
            const hydrationTasks = snapshot.docs.map(doc => limit(async () => {
                const jid = doc.id;
                const chatData = doc.data();
                
                // [OTIMIZAÇÃO DEEP SYNC] Evita reprocessar chats tocados recentemente pelo Fast Sync
                // ✅ AUMENTADO de 5 para 10 minutos para garantir que a Fase 2 (Priority) já Hydratou
                const lastUpdate = getSafeMillis(chatData.updatedAt);
                if (lastUpdate > (Date.now() - 10 * 60 * 1000)) {
                    Logger.debug('SyncController', `[TASK WORKER] Pulando chat (Atualizado nos últimos 10min).`, { instanceName, metadata: { jid } });
                    return { jid, status: 'skipped' };
                }

                // [FIX CRÍTICO] Encapsula cada chat em bloco de erro individual (isolamento)
                // Timeout de 120s por chat para evitar que 1 chat pesado congele o lote
                try {
                    // Busca todas as páginas de mensagens (até 10 páginas = 300 mensagens por chat)
                    const MAX_PAGES = 10;
                    const MESSAGES_PER_PAGE = 30;
                    let totalMessagesSaved = 0;
                    
                    for (let page = 1; page <= MAX_PAGES; page++) {
                        let messages: any[] = [];
                        try {
                            messages = await EvolutionService.fetchMessagesPaginated(instanceName, jid, {
                                page,
                                limit: MESSAGES_PER_PAGE,
                                skipMediaDownload: true  // ✅ CRÍTICO: Texto instantâneo, mídia em background
                            });
                        } catch (pageError: any) {
                            // [ISOLAMENTO DE PÁGINA] Erro em 1 página não cancela as outras
                            Logger.warn('SyncController', `[TASK WORKER] Falha na página ${page} do chat ${jid}. Abortando páginas deste chat.`, {
                                instanceName,
                                metadata: { jid, page, error: pageError.message }
                            });
                            break; // Para este chat, mas o lote continua
                        }
                        
                        if (Array.isArray(messages) && messages.length > 0) {
                            await EvolutionService.saveDirectBatchMessages(instanceName, messages);
                            totalMessagesSaved += messages.length;
                            
                            if (messages.length < MESSAGES_PER_PAGE) break; // Fim do histórico
                        } else {
                            break; // Sem mensagens nesta página
                        }
                    }
                    
                    Logger.info('SyncController', `[TASK WORKER] Chat hidratado: ${jid}`, { 
                        instanceName, 
                        metadata: { jid, totalMessages: totalMessagesSaved } 
                    });
                    return { jid, status: 'ok', count: totalMessagesSaved };
                } catch (e: any) {
                    // [ISOLAMENTO DE CHAT] Falha num chat não quebra os outros do lote
                    Logger.error('SyncController', `[TASK WORKER] Falha isolada ao processar chat ${jid} - lote continua`, e, { 
                        instanceName, 
                        metadata: { jid, error_message: e.message }
                    });
                    return { jid, status: 'error', error: e.message };
                }
            }));

            // [FIX CRÍTICO] allSettled: todos os resultados chegam, erros não propagam
            const results = await Promise.allSettled(hydrationTasks);
            const errors = results.filter(r => r.status === 'rejected');
            if (errors.length > 0) {
                Logger.warn('SyncController', `[TASK WORKER] ${errors.length} chats falharam no lote (outros foram processados normalmente).`, { instanceName });
            }

            // [RATE LIMITING] Delay entre páginas para não estourar CPU do banco ou Rate Limit da Evolution API
            const PAGE_DELAY_MS = 1500; // [TUNING] Reduzido para 1.5s entre páginas
            Logger.info('SyncController', `[TASK WORKER] Rate Limiting: Aguardando ${PAGE_DELAY_MS}ms antes da próxima página...`, { instanceName, metadata: { page } });
            await new Promise(r => setTimeout(r, PAGE_DELAY_MS));

            // 3. Continuidade (Próximo Cursor)
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const nextCursor = lastDoc.id;

            await instanceRef.update({ 
                "syncStatus.message": `Processando histórico... (${snapshot.size} chats)`,
                "syncStatus.processedCount": admin.firestore.FieldValue.increment(snapshot.size),
                "syncStatus.lastUpdate": admin.firestore.FieldValue.serverTimestamp()
            });

            // Agenda PRÓXIMA página
            Logger.info('SyncController', `[TASK WORKER] Agendando próxima etapa.`, { instanceName, metadata: { nextCursor } });
            await CloudTasksService.enqueueSyncPage(instanceName, page + 1, nextCursor);

            await syncStateRef.update({ status: 'IDLE' });

        } catch (error: any) {
            const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
            Logger.error('SyncController', `[TASK WORKER] Erro fatal na página ${page}: ${errorDetails}`, error, { instanceName });
             await syncStateRef.update({ 
                status: 'IDLE',
                lastError: error.message
            });
            throw error;
        }
    }

    private static async finishSync(instanceName: string, message: string) {
        const db = admin.firestore();
        await db.collection("instances").doc(instanceName).update({ 
            systemStatus: "READY",
            isSyncing: false,
            "syncStatus.status": "COMPLETED",
            "syncStatus.message": message,
            lastDeepSync: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    static async handleSyncPage(req: Request, res: Response) {
        const { instanceName, page, cursor } = req.body;
        if (!instanceName || page === undefined) {
            res.status(400).send("Missing parameters");
            return;
        }

        try {
            await SyncController.processSyncPage(instanceName, Number(page), cursor || null);
            res.status(200).send("Page Processed");
        } catch (error: any) {
            Logger.error('SyncController', "Error processing sync page task", error, { instanceName, metadata: { page } });
            res.status(500).send(error.message);
        }
    }

    static async handleSyncBatch(req: Request, res: Response) {
        const { instanceName, chatIds } = req.body;
        if (!instanceName || !chatIds || !Array.isArray(chatIds)) {
            res.status(400).send("Missing parameters: instanceName, chatIds[]");
            return;
        }

        try {
            await SyncController.processSyncBatch(instanceName, chatIds);
            res.status(200).send("Batch Processed");
        } catch (error: any) {
            Logger.error('SyncController', "Error processing sync batch task", error, { instanceName, metadata: { count: chatIds.length } });
            res.status(500).send(error.message);
        }
    }

    /**
     * Processa um lote de chats (Deep Sync) de forma paralela/controlada.
     * [CORREÇÃO] Agora busca TODAS as páginas de mensagens (até 10 páginas = 1000 msgs por chat)
     */
    static async processSyncBatch(instanceName: string, chatIds: string[]) {
        Logger.info('SyncController', `[TASK BATCH] Processando chats...`, { instanceName, metadata: { count: chatIds.length } });
        
        const limit = pLimit(3); // [OTIMIZAÇÃO] Reduzido de 5 para 3
        
        const tasks = chatIds.map(jid => limit(async () => {
            try {
                // [CORREÇÃO] Busca TODAS as páginas (até 10) com 100 msgs cada = 1000 msgs por chat
                await EvolutionService.processSingleChatMessages(instanceName, jid, 1000, true); // limit: 1000 (10 pages x 100)
            } catch (e: any) {
                Logger.warn('SyncController', `[TASK BATCH] Falha ao processar chat`, { instanceName, metadata: { jid, error: e.message } });
            }
        }));

        await Promise.all(tasks);
        Logger.info('SyncController', `[TASK BATCH] Lote finalizado`, { instanceName });
    }

    /**
     * Processa mensagens de um chat específico (On Demand).
     */
    public static async syncChatMessagesDeep(instanceName: string, remoteJid: string, force: boolean, limit: number = 50): Promise<number> {
        Logger.info('SyncController', `[CHAT SYNC] Iniciando sync manual`, { instanceName, metadata: { remoteJid } });
        
        const messages = await EvolutionService.fetchMessagesPaginated(instanceName, remoteJid, { page: 1, limit });
        
        if (!Array.isArray(messages) || messages.length === 0) return 0;

        await EvolutionService.saveDirectBatchMessages(instanceName, messages);
        return messages.length;
    }

    static async handleChatSync(req: Request, res: Response) {
        const { instanceName, remoteJid, limit, force } = req.body;

        if (!instanceName || !remoteJid) {
            res.status(400).json({ error: "instanceName e remoteJid são obrigatórios." });
            return;
        }

        try {
            Logger.info('SyncController', `[CHAT SYNC] Iniciando sync on-demand`, { instanceName, metadata: { remoteJid } });
            const count = await SyncController.syncChatMessagesDeep(instanceName, remoteJid, force === true, limit || 50);
            
            res.status(200).json({ 
                success: true, 
                count, 
                message: "Chat sincronizado com sucesso." 
            });
        } catch (error: any) {
            Logger.error('SyncController', `[CHAT SYNC] Erro`, error, { instanceName, metadata: { remoteJid } });
            res.status(500).json({ error: error.message });
        }
    }

    static async handleDeepSync(req: Request, res: Response) {
        const { instanceName, offset, force } = req.body;
        if (!instanceName) {
            res.status(400).json({ error: "instanceName é obrigatório." });
            return;
        }

        SyncController.executeSmartSync(instanceName).catch(err => {
            Logger.error('SyncController', `[SMART SYNC] Falha no Handover HTTP`, err, { instanceName });
        });

        res.status(202).json({ 
            success: true, 
            message: "Pipeline Smart Sync iniciado.",
            instanceName 
        });
    }
}
