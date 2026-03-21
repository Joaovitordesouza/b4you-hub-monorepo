import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { MediaService } from "../services/media.service";
import { EvolutionService } from "../services/evolution.service";
import { CloudTasksService, TaskPriority } from "../services/cloud-tasks.service";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MediaController {

    /**
     * Reenfileira o processamento de mídia para uma mensagem específica, permitindo
     * que o frontend peça um novo download quando a mídia estiver EXPIRED/ERROR.
     */
    static async handleReprocessMedia(req: Request, res: Response) {
        const { instanceName, remoteJid, messageId } = req.body || {};

        if (!instanceName || !remoteJid || !messageId) {
            console.error("[MEDIA WORKER] ReprocessMedia - parâmetros inválidos:", { instanceName, remoteJid, messageId });
            res.status(400).send("Missing parameters");
            return;
        }

        const db = admin.firestore();
        const msgRef = db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${messageId}`);
        const snap = await msgRef.get();

        if (!snap.exists) {
            console.warn("[MEDIA WORKER] ReprocessMedia - mensagem não encontrada:", { instanceName, remoteJid, messageId });
            res.status(404).send("Message not found");
            return;
        }

        const data = snap.data() || {};
        const media = (data as any).media || {};

        const originalUrl: string | undefined =
            (data as any).originalMediaUrl ||
            media.originalUrl ||
            media.url;

        const mediaType: string | undefined =
            media.type ||
            (data as any).messageType ||
            (data as any).type ||
            "image";

        const mimeType: string | undefined =
            media.mimetype ||
            (data as any).mimetype ||
            "";

        if (!originalUrl) {
            console.warn("[MEDIA WORKER] ReprocessMedia - mensagem sem URL de mídia válida:", { instanceName, remoteJid, messageId });
            res.status(400).send("No media URL to process");
            return;
        }

        try {
            await CloudTasksService.enqueueProcessMedia(
                String(instanceName),
                String(messageId),
                String(remoteJid),
                String(originalUrl),
                String(mediaType),
                mimeType,
                TaskPriority.HIGH,
                5
            );

            await msgRef.set({
                mediaStatus: 'PENDING',
                "media.mediaStatus": 'PENDING',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            res.status(200).send("Reprocess enqueued");
        } catch (error: any) {
            console.error("[MEDIA WORKER] ReprocessMedia - falha ao enfileirar:", error.message);
            res.status(500).send("Failed to enqueue reprocess");
        }
    }

    static async handleProcessMedia(req: Request, res: Response) {
        const { type, instanceName, messageId, remoteJid, mediaUrl, mediaType, mimeType: payloadMimeType } = req.body;

        console.log(`[MEDIA WORKER] INICIANDO job process-media`, { instanceName, messageId, remoteJid, type, mediaType });

        if (!instanceName || !remoteJid) {
            console.error("[MEDIA WORKER] Missing critical parameters (instance/jid):", req.body);
            res.status(400).send("Missing critical parameters");
            return;
        }

        const isProfile = type === 'profile_picture';

        if (!mediaUrl) {
            if (!isProfile) {
                 console.warn("[MEDIA WORKER] Task de mensagem sem mediaUrl ignorada.", { instanceName, remoteJid, messageId });
            }
            res.status(200).send("No media URL to process");
            return;
        }

        const db = admin.firestore();
        const targetRef = isProfile 
            ? db.doc(`instances/${instanceName}/chats/${remoteJid}`)
            : db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${messageId}`);

        console.log(`[MEDIA WORKER] Processando ${isProfile ? 'PFP' : 'Mensagem'} para ${remoteJid}...`);

        try {
            // Idempotência: Se já for URL do GCS, pula
            if (mediaUrl.includes("storage.googleapis.com")) {
                if (!isProfile) await targetRef.set({ mediaStatus: 'UPLOADED', "media.mediaStatus": 'UPLOADED', "media.url": mediaUrl }, { merge: true });
                res.status(200).send("Already Processed");
                return;
            }

            let skipStrategy2 = false;
            let currentData: any = null;

            if (!isProfile) {
                const docSnap = await targetRef.get();
                if (docSnap.exists) {
                    currentData = docSnap.data();
                    // Evitar reprocessamento
                    if (currentData?.mediaStatus === 'UPLOADED' || currentData?.mediaStatus === 'COMPLETED') {
                        res.status(200).send("Already Processed");
                        return;
                    }
                    
                    const ts = currentData?.timestamp || currentData?.messageTimestampMillis;
                    if (ts) {
                        const age = Date.now() - Number(ts);
                        if (age > 3600000) { // > 1 hora
                            skipStrategy2 = true;
                            console.log(`[MEDIA WORKER] Mensagem antiga (>1h). Pulando Strategy 2 para evitar 403.`);
                        }
                    }
                    
                    // Salva status PROCESSING
                    await targetRef.set({
                        mediaStatus: 'PROCESSING',
                        "media.mediaStatus": 'PROCESSING',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
            }

            let finalUrl: string | null = null;
            let finalMimeType = isProfile ? 'image/jpeg' : (payloadMimeType || mediaType || 'application/octet-stream');

            console.log(`[MEDIA WORKER] Estratégia inicial de Mídia: ${isProfile ? 'PFP' : 'Message'} | MIME: ${finalMimeType}`);

            // [STRATEGY] Prioridade 1: Evolution API (Base64) - Com Retry Inteligente
            if (!isProfile && messageId) {
                let attempts = 0;
                // Se a mensagem for muito recente (< 2 min), tentamos mais vezes pois pode ser delay do MongoDB
                const isVeryRecent = currentData?.timestamp && (Date.now() - Number(currentData.timestamp) < 120000);
                const maxAttempts = isVeryRecent ? 3 : 1;

                while (attempts < maxAttempts && !finalUrl) {
                    attempts++;
                    try {
                        console.log(`[MEDIA WORKER] STRATEGY 1 (Attempt ${attempts}/${maxAttempts}): Buscando mídia ${messageId}...`);
                        
                        // [CORREÇÃO] Passar remoteJid que é obrigatório para a API funcionar
                        // [FIX] convertToMp4 = false para manter o formato original (OGG) e evitar corrupção
                        const base64Data = await EvolutionService.getBase64FromMedia(instanceName, messageId, remoteJid, false);
                        
                        if (base64Data && base64Data.base64) {
                            console.log(`[MEDIA WORKER] STRATEGY 1 SUCCESS: Base64 obtido com sucesso.`, {
                                mimeTypeOriginal: finalMimeType,
                                mimeTypeReturned: base64Data.mimetype,
                                size: base64Data.base64.length
                            });
                            
                            finalUrl = await MediaService.uploadMedia(instanceName, base64Data.base64, base64Data.mimetype || finalMimeType);
                            if (base64Data.mimetype) finalMimeType = base64Data.mimetype;
                            console.log(`[MEDIA WORKER] Upload do Base64 concluído. Nova URL: ${finalUrl}`);
                            break; // Sucesso, sai do loop
                        }
                    } catch (apiError: any) {
                        const status = apiError.response?.status;
                        console.warn(`[MEDIA WORKER] STRATEGY 1 FAILED (Attempt ${attempts}): ${apiError.message} (Status: ${status})`);
                        
                        // Erros fatais (não retentar)
                        if (status === 404 || status === 403 || status === 410) {
                            console.warn(`[MEDIA WORKER] Erro fatal ${status} na Strategy 1. Abortando tentativas.`);
                            break;
                        }

                        // Se for erro 400 (Bad Request), é provável que a mídia não exista AINDA no banco da Evolution
                        if (status === 400 && attempts < maxAttempts) {
                            const backoff = attempts * 5000; // 5s, 10s...
                            console.warn(`[MEDIA WORKER] 400 Bad Request - Aguardando ${backoff}ms para retentar...`);
                            await sleep(backoff);
                            continue; // Retenta
                        }

                        // Se esgotou tentativas ou é outro erro, e não vamos usar Strategy 2, lança erro para Cloud Tasks
                        if (attempts >= maxAttempts && !skipStrategy2 && status === 400) {
                             // Não lança erro aqui para permitir fallback para Strategy 2 (Download Direto) se possível
                             // Mas se Strategy 2 falhar também, Cloud Tasks não vai retentar este erro 400 específico
                             // a menos que lancemos. Mas como temos Strategy 2, vamos tentar ela.
                             console.warn(`[MEDIA WORKER] Desistindo da Strategy 1 após ${attempts} tentativas.`);
                        }
                    }
                }
            }

            // [STRATEGY] Prioridade 2: Download Direto (Fallback)
            // AVISO: URLs do WhatsApp CDN (mmg.whatsapp.net) precisam de descriptografia (MediaKey).
            // Axios simples não descriptografa, resultando em erro no FFmpeg.
            if (!finalUrl && mediaUrl && !skipStrategy2) {
                const isEncryptedCdn = mediaUrl.includes('whatsapp.net');
                if (isEncryptedCdn && !isProfile) {
                    console.warn(`[MEDIA WORKER] STRATEGY 2 CANCELADA: URL é da CDN criptografada do WhatsApp. Exige Strategy 1 para descriptografar.`, { url: mediaUrl.substring(0, 50) });
                } else {
                    console.log(`[MEDIA WORKER] STRATEGY 2: Tentando Download Direto de ${mediaUrl.substring(0, 100)}...`);
                    finalUrl = await MediaService.downloadAndPersist(instanceName, mediaUrl, finalMimeType);
                    if (finalUrl) {
                        console.log(`[MEDIA WORKER] STRATEGY 2 SUCCESS: Download direto concluído. Nova URL: ${finalUrl}`);
                    } else {
                        console.log(`[MEDIA WORKER] STRATEGY 2 FAILED: Falha ou null.`);
                    }
                }
            } else if (!finalUrl && skipStrategy2) {
                console.log(`[MEDIA WORKER] STRATEGY 2 SKIPPED devido à idade da mensagem.`);
            }

            if (!finalUrl || finalUrl === 'EXPIRED') {
                const isExpired = finalUrl === 'EXPIRED';
                console.warn(`[MEDIA WORKER] Mídia ${isExpired ? 'EXPIRADA' : 'NÃO ENCONTRADA'} para ${remoteJid}/${messageId}`);
                
                const updateData: any = { 
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    mediaStatus: isExpired ? 'EXPIRED' : 'ERROR' 
                };
                if (isProfile) {
                    updateData.profilePictureError = isExpired ? "Expired" : "Download Failed";
                } else {
                    updateData["media.mediaStatus"] = isExpired ? 'EXPIRED' : 'ERROR';
                    updateData.mediaError = isExpired ? "Media Expired on WhatsApp" : "Download Failed";
                    updateData["media.url"] = isExpired ? "EXPIRED" : null;
                }
                await targetRef.set(updateData, { merge: true });
                res.status(200).send(isExpired ? "Expired" : "Failed");
                return;
            }

            // [SUCCESS] Update Firestore Atomically
            const updateData: any = { 
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                mediaStatus: 'UPLOADED'
            };

            if (isProfile) {
                updateData.profilePictureUrl = finalUrl;
            } else {
                updateData["media.url"] = finalUrl;
                updateData["media.mediaStatus"] = 'UPLOADED';
                updateData["media.mimetype"] = finalMimeType;
                
                if (finalMimeType.includes('audio/ogg') || mediaUrl?.includes('.ogg')) {
                    updateData["media.mimetype"] = 'audio/mpeg';
                }
            }

            console.log(`[MEDIA WORKER] Verificando documento: ${instanceName}/chats/${remoteJid}/messages/${messageId}`);
            const docSnap = await targetRef.get();
            if (!docSnap.exists) {
                console.error(`[MEDIA WORKER] ❌ Documento NÃO existe: ${messageId}. Usando set() para criar.`);
                await targetRef.set(updateData, { merge: true });
            } else {
                console.log(`[MEDIA WORKER] Documento existe, atualizando...`);
                await targetRef.update(updateData);
            }
            console.log(`[MEDIA WORKER] ✅ Sucesso: ${remoteJid} (Url: ${finalUrl.substring(0, 40)}...)`);
            console.log(JSON.stringify({
                severity: 'INFO',
                message: '[MEDIA WORKER] Media processed successfully',
                instanceName,
                remoteJid,
                messageId: messageId || 'PFP',
                mediaStatusBefore: isProfile ? 'N/A' : currentData?.mediaStatus,
                mediaStatusAfter: 'UPLOADED',
                finalUrl: finalUrl.substring(0, 120),
                finalMimeType
            }));
            res.status(200).send("Processed");

        } catch (error: any) {
            console.error(`[MEDIA WORKER] Falha ao processar ${messageId}:`, error.message);
            
            if (error.response?.status === 404 || error.response?.status === 410) {
                console.warn(`[MEDIA WORKER] Mídia não encontrada (404/410) para ${remoteJid}/${messageId}. Marcando como FAILED.`);
                const db = admin.firestore();
                const targetRef = isProfile 
                    ? db.doc(`instances/${instanceName}/chats/${remoteJid}`)
                    : db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${messageId}`);
                
                const updateData: any = { 
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    mediaStatus: 'FAILED'
                };
                
                if (isProfile) {
                    updateData.profilePictureError = "Not Found";
                } else {
                    updateData.mediaError = "Media Expired/NotFound";
                }
                
                await targetRef.set(updateData, { merge: true }).catch(e => console.error("Erro ao marcar falha:", e));
                res.status(200).send("Media Expired - Marked Failed");
            } else {
                res.status(500).send(error.message);
            }
        }
    }
}
