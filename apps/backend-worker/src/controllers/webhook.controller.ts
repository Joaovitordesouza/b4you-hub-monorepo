import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { EvolutionService } from "../services/evolution.service";
import { MediaService } from "../services/media.service";
import { SyncController } from "./sync.controller";
import { InstanceCache } from "../utils/instance-cache";
import { CloudTasksService } from "../services/cloud-tasks.service";
import { ContentParser } from "../utils/content-parser";
import { EvolutionChat, TimelineEvent } from "@b4you/types";

export class WebhookController {

    static async handleEvent(req: Request, res: Response) {
        try {
            // Pub/Sub Push format: message.data (base64)
            let payload = req.body;
            
            if (payload.message && payload.message.data) {
                const dataBuffer = Buffer.from(payload.message.data, 'base64');
                payload = JSON.parse(dataBuffer.toString());
            }

            // O Dispatcher envelopa o corpo original em payload.body
            const body = payload.body || payload;
            const event = body.event;
            const instanceId = body.instance;
            
            if (!instanceId) {
                console.error("[WORKER] Instance ID missing in payload");
                res.status(400).send("Instance ID missing");
                return;
            }

            console.log(`[WORKER] Processing Event: ${event} | Instance: ${instanceId}`);

            const db = admin.firestore();

            // Roteamento de Eventos
            switch (event) {
                case "MESSAGES_UPSERT":
                case "messages.upsert":
                    await WebhookController.handleMessagesUpsert(db, instanceId, body.data);
                    break;

                case "MESSAGES_DELETE":
                case "messages.delete":
                    await WebhookController.handleMessagesDelete(db, instanceId, body.data);
                    break;

                case "MESSAGES_UPDATE":
                case "messages.update":
                case "MESSAGES_EDITED":
                case "messages.edited":
                    await WebhookController.handleMessagesUpdate(db, instanceId, body.data);
                    break;

                case "SEND_MESSAGE":
                case "send.message":
                    await WebhookController.handleSendMessage(db, instanceId, body.data);
                    break;

                case "CONNECTION_UPDATE":
                case "connection.update":
                    await WebhookController.handleConnectionUpdate(db, instanceId, body.data);
                    break;

                case "QRCODE_UPDATED":
                case "qrcode.updated":
                    await WebhookController.handleQrCodeUpdate(db, instanceId, body.data);
                    break;

                // [NEW] Captura histórico passivo: o WhatsApp entrega chats ativamente
                // Isso evita depender 100% de polling na Fase 1 do Smart Sync
                case "CHATS_UPSERT":
                case "chats.upsert":
                case "CHATS_SET":
                case "chats.set":
                    await WebhookController.handleChatsUpsert(db, instanceId, body.data).catch(e =>
                        console.warn(`[WORKER] handleChatsUpsert falhou silenciosamente: ${e.message}`)
                    );
                    break;

                // [NEW] Captura evento de histórico completo (history.set do Baileys)
                case "HISTORY_SET":
                case "history.set":
                    await WebhookController.handleHistorySet(db, instanceId, body.data).catch(e =>
                        console.warn(`[WORKER] handleHistorySet falhou silenciosamente: ${e.message}`)
                    );
                    break;

                default:
                    console.log(`[WORKER] Evento ignorado ou não mapeado: ${event}`);
                    break;
            }

            // Responder 200 para o Pub/Sub não reenviar
            res.status(200).send("Processed");

        } catch (error: any) {
            console.error("[WORKER] Erro no Webhook Processor:", error);
            // Em caso de erro 500 o Pub/Sub tentará novamente (retry policy)
            res.status(500).send("Error");
        }
    }

    // --- Handlers Portados e Otimizados ---

    static async handleMessagesUpsert(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const msgData = data.data || data; 
        const key = msgData.key || msgData;
        
        if (!key || !key.remoteJid) return;

        const { remoteJid, fromMe } = key;
        const isGroup = remoteJid.endsWith("@g.us");

        // Filtro de Ingestão de Grupos
        if (isGroup) {
            const instanceData = await InstanceCache.get(instanceId);
            if (instanceData?.syncGroups === false) {
                return;
            }
        }

        // Tratamento de Reações (reactionMessage)
        if (msgData.message?.reactionMessage || msgData.reactionMessage) {
            const reaction = msgData.message?.reactionMessage || msgData.reactionMessage;
            const targetMsgId = reaction.key?.id;
            if (targetMsgId) {
                let targetRef = db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${targetMsgId}`);
                let targetDoc = await targetRef.get();
                
                // [RESILIÊNCIA] Se não achar pelo ID, busca pelo realId (para mensagens enviadas via app com ID temp)
                if (!targetDoc.exists) {
                    const messagesCollection = db.collection(`instances/${instanceId}/chats/${remoteJid}/messages`);
                    const querySnapshot = await messagesCollection.where('realId', '==', targetMsgId).limit(1).get();
                    if (!querySnapshot.empty) {
                        targetDoc = querySnapshot.docs[0];
                        targetRef = targetDoc.ref;
                    }
                }

                // Define realSender antes do if/else para estar disponível em ambos os blocos
                const sender = reaction.sender || remoteJid;
                const realSender = reaction.participant || sender; 
                
                if (targetDoc.exists) {
                    const existingReactions = targetDoc.data()?.reactions || [];
                    
                    // Verificar se já existe reação do mesmo usuário
                    const existingIndex = existingReactions.findIndex((r: any) => r.sender === realSender);
                    
                    let newReactions = [...existingReactions];
                    if (reaction.text === null || reaction.text === undefined || reaction.text === '') {
                        // Remover reação (unreact)
                        if (existingIndex >= 0) {
                            newReactions.splice(existingIndex, 1);
                        }
                    } else {
                        // Adicionar ou atualizar reação
                        const reactionObj = {
                            emoji: reaction.text,
                            sender: realSender,
                            timestamp: Date.now()
                        };
                        if (existingIndex >= 0) {
                            newReactions[existingIndex] = reactionObj;
                        } else {
                            newReactions.push(reactionObj);
                        }
                    }
                    
                    await targetRef.update({
                        reactions: newReactions,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // [LOG] Reação ignorada - mensagem alvo não encontrada
                    console.warn(`[WORKER] Reação ignorada: mensagem alvo não encontrada. targetMsgId: ${targetMsgId}, sender: ${realSender}, emoji: ${reaction.text}`);
                }
                return;
            }
        }

        // Tratamento de Protocol Messages (Edit / Revoke)
        if (msgData.messageType === "protocolMessage" || msgData.type === "protocolMessage") {
            const protocol = msgData.message?.protocolMessage || msgData.protocolMessage;
            if (protocol && protocol.key && protocol.key.id) {
                const originalMsgId = protocol.key.id;
                let targetRef = db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${originalMsgId}`);
                
                // [RESILIÊNCIA] Verifica existência ou busca por realId
                let targetDoc = await targetRef.get();
                if (!targetDoc.exists) {
                    const messagesCollection = db.collection(`instances/${instanceId}/chats/${remoteJid}/messages`);
                    const querySnapshot = await messagesCollection.where('realId', '==', originalMsgId).limit(1).get();
                    if (!querySnapshot.empty) {
                         targetRef = querySnapshot.docs[0].ref;
                         targetDoc = querySnapshot.docs[0];
                    }
                }

                if (targetDoc.exists) {
                    if (protocol.type === "EDIT_MESSAGE" || protocol.type === 14) {
                        // Buscar conteúdo original para histórico
                        const oldContent = targetDoc.data()?.text || targetDoc.data()?.content?.conversation || "";
                        
                        await targetRef.set({
                            isEdited: true,
                            editedAt: admin.firestore.FieldValue.serverTimestamp(),
                            text: ContentParser.extractContent(protocol.editedMessage || {}),
                            content: protocol.editedMessage || {},
                            oldMessages: admin.firestore.FieldValue.arrayUnion({
                                text: oldContent,
                                editedAt: admin.firestore.FieldValue.serverTimestamp()
                            }),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        return;
                    }
                    if (protocol.type === "REVOKE" || protocol.type === 0) {
                        await targetRef.set({
                            isDeleted: true,
                            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                            text: "🚫 Mensagem apagada",
                            content: { text: "🚫 Mensagem apagada" },
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        return;
                    }
                }
            }
        }

        // Busca foto de perfil se não for grupo e se ainda não tivermos (Optimization)
        if (!isGroup && !fromMe) {
            try {
                // Tenta buscar no documento do chat primeiro para evitar chamadas excessivas
                const chatSnap = await db.doc(`instances/${instanceId}/chats/${remoteJid}`).get();
                if (!chatSnap.exists || !chatSnap.data()?.profilePictureUrl) {
                    const profilePictureUrl = await EvolutionService.fetchProfilePictureUrl(instanceId, remoteJid);
                    if (profilePictureUrl) {
                        try {
                            await db.doc(`instances/${instanceId}/chats/${remoteJid}`).set({ profilePictureUrl }, { merge: true });
                        } catch(e) {}
                    }
                }
            } catch (e) {
                console.error("[WORKER] Erro ao processar profile pic:", e);
            }
        }

        // REFACTOR: Delegar salvamento seguro para o Service
        try {
            await EvolutionService.saveMessage(instanceId, msgData);
            
            const savedId = msgData.key?.id || msgData.id;
            const hasMedia = !!(msgData.message?.imageMessage || msgData.message?.videoMessage || msgData.message?.documentMessage || msgData.message?.audioMessage);
            console.log(JSON.stringify({
                severity: 'INFO',
                message: '[WEBHOOK] Mensagem salva via saveMessage',
                instanceId,
                remoteJid,
                messageId: savedId,
                fromMe,
                hasMedia
            }));

            // EvolutionService já atualiza o chat, mas garantimos que o lastMessageAt (se necessário pelo front) e unreadCount estejam corretos aqui
            // [CORREÇÃO] Incrementar unreadCount para mensagens recebidas (não enviadas por nós)
            if (!fromMe) {
                const timestamp = msgData.messageTimestamp 
                    ? (Number(msgData.messageTimestamp) < 10000000000 ? Number(msgData.messageTimestamp) * 1000 : Number(msgData.messageTimestamp))
                    : Date.now();
                const text = ContentParser.extractContent(msgData.message || msgData);
                
                const chatRef = db.doc(`instances/${instanceId}/chats/${remoteJid}`);
                await chatRef.set({
                    unreadCount: admin.firestore.FieldValue.increment(1),
                    lastMessage: text || "Mídia",
                    lastMessagePreview: text || "Mídia",
                    // [FIX] Padronização de campos para ordenação mestre e prevenir bugs de query
                    lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(timestamp),
                    lastMessageAt: timestamp,
                    lastMessageTimestampMillis: timestamp,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (e) {
            console.error("[WORKER] Erro crítico ao salvar mensagem via Service:", e);
            throw e; // Retry
        }
    }

    static async handleMessagesUpdate(db: admin.firestore.Firestore, instanceId: string, updates: any[]) {
        if (!Array.isArray(updates)) return;
        
        // Processa atualizações uma a uma para garantir a busca correta do ID
        for (const update of updates) {
            if (update.key && update.update?.status) {
                const waId = update.key.id;
                const remoteJid = update.key.remoteJid;
                const status = WebhookController.mapStatus(update.update.status);

                const messagesCollection = db.collection(`instances/${instanceId}/chats/${remoteJid}/messages`);
                let messageRef = messagesCollection.doc(waId);

                // [RESILIÊNCIA] Verifica se o documento existe pelo ID direto (waId)
                // Se não existir, busca pelo campo 'realId' (caso o doc tenha sido criado com tempId)
                const docSnap = await messageRef.get();
                if (!docSnap.exists) {
                    const querySnapshot = await messagesCollection.where('realId', '==', waId).limit(1).get();
                    if (!querySnapshot.empty) {
                        messageRef = querySnapshot.docs[0].ref;
                    } else {
                        // Se não encontrou de jeito nenhum, pula (pode ser mensagem antiga ou fora de sync)
                        continue;
                    }
                }

                // [SYNC] Atualiza o status da mensagem
                await messageRef.set({
                    status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // [SIDE-EFFECT] Se a mensagem foi lida por nós, podemos querer zerar o contador do chat
                if (status === 'read' && update.key.fromMe === false) {
                    const chatRef = db.doc(`instances/${instanceId}/chats/${remoteJid}`);
                    await chatRef.set({ unreadCount: 0 }, { merge: true });
                }
            }
        }
    }

    /**
     * Mapeia o evento de confirmação de envio da Evolution
     */
    static async handleSendMessage(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const msgData = data.data || data;
        if (!msgData || !msgData.key) return;

        const remoteJid = msgData.key.remoteJid;
        const msgId = msgData.key.id;

        console.log(`[WORKER] Confirmação de envio recebida para ${msgId}`);

        const msgRef = db.doc(`instances/${instanceId}/chats/${remoteJid}/messages/${msgId}`);
        await msgRef.set({
            status: 'sent',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    static async handleConnectionUpdate(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const state = data.state || data.connectionState || "unknown";
        const reason = data.reason || "";
        console.log(`[WORKER CONNECTION] Instance: ${instanceId} | State: ${state} | Reason: ${reason}`);

        if (state === "connecting") {
            await db.collection("instances").doc(instanceId).set({
                connectionStatus: "CONNECTING",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return;
        }

        let status = "OFFLINE";
        let systemStatus = "RECONNECT_REQUIRED";

        if (state === "open" || state === "connected") {
            status = "ONLINE";
            systemStatus = "READY";
            
            // [SYNC] Dispara Smart Sync (Fast -> Deep) em background
            SyncController.executeSmartSync(instanceId).catch(err => 
                console.error(`[WEBHOOK TRIGGER] Falha ao iniciar Smart Sync para ${instanceId}:`, err)
            );
        } else if (state === "close" || state === "refused") {
            status = "OFFLINE";
            
            // [LOGIC] Se foi fechado intencionalmente ou logout, status muda para NEEDS_PAIRING
            if (reason === "logout" || reason === "removed") {
                systemStatus = "NEEDS_PAIRING";
            } else {
                systemStatus = "RECONNECT_REQUIRED";
                
                // [AUTO-RECONNECT] Tenta reconectar em background se não for logout
                // Aguarda 2s para evitar loop infinito imediato em falhas críticas
                setTimeout(async () => {
                    try {
                        console.log(`[AUTO-RECONNECT] Tentando reabrir instância ${instanceId}...`);
                        await EvolutionService.request(instanceId, `/instance/connect/${instanceId}`, 'GET');
                    } catch (e: any) {
                        console.error(`[AUTO-RECONNECT] Falha ao tentar reconectar ${instanceId}: ${e.message}`);
                    }
                }, 2000);
            }
        }
        
        await db.collection("instances").doc(instanceId).set({
            connectionStatus: status,
            systemStatus: systemStatus,
            lastConnectionUpdate: admin.firestore.FieldValue.serverTimestamp(),
            lastDisconnectReason: reason || admin.firestore.FieldValue.delete()
        }, { merge: true });
    }

    static async handleQrCodeUpdate(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const docRef = db.collection("instances").doc(instanceId);
        const doc = await docRef.get();
        if (doc.exists && doc.data()?.connectionStatus === "ONLINE") return;

        let qrcodeBase64 = data?.qrcode?.base64 || data?.base64 || "";
        if (qrcodeBase64) {
            await docRef.set({
                qrcode: qrcodeBase64,
                connectionStatus: "QRCODE", 
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    /**
     * [NEW] Processa chats entregues ativamente pelo WhatsApp via chats.upsert / chats.set.
     * Salva apenas metadados (sem mensagens) para popular a sidebar rapidamente.
     * Opera fire-and-forget a partir do switch de eventos.
     */
    static async handleChatsUpsert(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const chats = Array.isArray(data) ? data : (Array.isArray(data?.chats) ? data.chats : []);
        if (chats.length === 0) return;

        console.log(`[WORKER CHATS_UPSERT] ${chats.length} chats recebidos ativamente para ${instanceId}`);

        const { JidResolver } = await import('../utils/jid-resolver');
        const { ContentParser } = await import('../utils/content-parser');
        
        const batchSize = 400; // Firestore batch limit
        let processed = 0;

        for (let i = 0; i < chats.length; i += batchSize) {
            const slice = chats.slice(i, i + batchSize);
            const batch = db.batch();

            for (const chat of slice) {
                const remoteJid = JidResolver.resolveJid(chat);
                if (!JidResolver.isValidJid(remoteJid)) continue;

                // [FIX] Parse Long from Baileys accurately
                let rawTs = chat.conversationTimestamp || chat.lastMessageTimestamp || 0;
                if (typeof rawTs === 'object' && rawTs !== null) {
                    if (rawTs.low !== undefined) rawTs = rawTs.low;
                    else if (typeof rawTs.toNumber === 'function') rawTs = rawTs.toNumber();
                }
                const tsParsed = Number(rawTs);
                const tsMillis = (!isNaN(tsParsed) && tsParsed > 0) ? (tsParsed < 10000000000 ? tsParsed * 1000 : tsParsed) : Date.now();

                const updateData: any = {
                    remoteJid,
                    lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(tsMillis),
                    lastMessageTimestampMillis: tsMillis,
                    lastMessageAt: tsMillis,
                    isGroup: remoteJid.endsWith('@g.us'),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    _syncSource: 'chats_upsert_webhook',
                };

                const pushName = chat.pushName || chat.name || chat.subject;
                if (pushName) updateData.pushName = pushName;

                const profilePictureUrl = chat.profilePictureUrl || chat.profilePicUrl;
                if (profilePictureUrl) updateData.profilePictureUrl = profilePictureUrl;

                const lastMessagePreview = chat.lastMessage ? ContentParser.extractContent(chat.lastMessage) : undefined;
                if (lastMessagePreview && lastMessagePreview !== "Mensagem") updateData.lastMessagePreview = lastMessagePreview;

                if (chat.unreadCount !== undefined) updateData.unreadCount = chat.unreadCount;

                const chatRef = db.collection('instances').doc(instanceId).collection('chats').doc(remoteJid);
                batch.set(chatRef, updateData, { merge: true });
                processed++;
            }

            await batch.commit();
        }

        console.log(`[WORKER CHATS_UPSERT] ${processed} chats salvos via webhook ativo para ${instanceId}`);
    }

    /**
     * [NEW] Processa o evento history.set do Baileys — entregue quando o WhatsApp sincroniza.
     * Este evento pode conter chats e mensagens do histórico. Salvamos os chats imediatamente.
     */
    static async handleHistorySet(db: admin.firestore.Firestore, instanceId: string, data: any) {
        // history.set pode ter diferentes formatos dependendo da versão da Evolution
        const chats = data?.chats || data?.history?.chats || [];
        const messages = data?.messages || data?.history?.messages || [];

        console.log(`[WORKER HISTORY_SET] ${chats.length} chats, ${messages.length} mensagens recebidos para ${instanceId}`);

        // Processa chats (metadados) imediatamente
        if (chats.length > 0) {
            await WebhookController.handleChatsUpsert(db, instanceId, chats);
        }

        // Se vieram mensagens junto, enfileira o save (lote grande pode ser demorado)
        if (messages.length > 0) {
            console.log(`[WORKER HISTORY_SET] Agendando save de ${messages.length} mensagens históricas...`);
            // Fire-and-forget para não travar o webhook
            EvolutionService.saveDirectBatchMessages(instanceId, messages.slice(0, 500)).catch(e =>
                console.warn(`[WORKER HISTORY_SET] Falha no save de mensagens históricas: ${e.message}`)
            );
        }
    }

    static async handleMessagesDelete(db: admin.firestore.Firestore, instanceId: string, data: any) {
        const eventData = data.data || data;
        const items = Array.isArray(eventData) ? eventData : [eventData];
        const batch = db.batch();
        let count = 0;
        for (const item of items) {
            const key = item.key || item;
            if (key && key.remoteJid && key.id) {
                const msgRef = db.doc(`instances/${instanceId}/chats/${key.remoteJid}/messages/${key.id}`);
                // [FIX] Use set/merge instead of update to avoid NOT_FOUND crashes
                batch.set(msgRef, {
                    isDeleted: true,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                count++;
            }
        }
        if (count > 0) await batch.commit();
    }

    static mapStatus(status: number | string): string {
        // Normalização para comparação
        const s = typeof status === 'string' ? status.toUpperCase() : status;

        switch (s) {
            case 1:
            case 'PENDING':
                return 'pending'; // Enviando...
            
            case 2:
            case 'SERVER_ACK':
            case 'SENT':
                return 'sent'; // Enviado (1 tick)

            case 3:
            case 'DELIVERY_ACK':
            case 'DELIVERED':
            case 'RECEIVED':
                return 'delivered'; // Entregue (2 ticks)

            case 4:
            case 'READ':
                return 'read'; // Lido (2 ticks azuis)

            case 5:
            case 'PLAYED':
                return 'played'; // Reproduzido (áudio)

            default:
                // Se for desconhecido, assume sent para não travar
                return 'sent';
        }
    }
}
