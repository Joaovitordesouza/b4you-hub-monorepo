import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { EvolutionService } from "../services/evolution.service";

/**
 * Envia mensagem (Texto ou Mídia) via Evolution API.
 * Suporta: Text, Image, Video, Audio, Document.
 */
export const sendMessage = onCall({ region: "us-central1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { 
        instanceName, 
        remoteJid, 
        message,        // Texto ou Caption
        media,          // Base64 ou URL (Opcional)
        mediaType,      // 'image', 'video', 'audio', 'document' (Obrigatório se tiver media)
        quotedId,       // ID da mensagem respondida (Opcional)
        quotedParticipant, // JID do autor da mensagem respondida (Essencial para Grupos)
        mentions        // Array de JIDs (Opcional)
    } = request.data;

    if (!instanceName || !remoteJid) {
        throw new HttpsError('invalid-argument', 'instanceName e remoteJid são obrigatórios.');
    }

    try {
        const options: any = {
            linkPreview: true // 🔥 Ativa preview de links
        };
        
        if (quotedId) {
            options.quoted = { 
                key: { 
                    id: String(quotedId)
                },
                // Em grupos, participant deve ser o JID do autor original da mensagem (ex: 55...s.whatsapp.net)
                participant: quotedParticipant || "" 
            };
        }
        if (mentions) options.mentions = mentions;

        let endpoint = "";
        let payload: any = {};

        // 1. Envio de Mídia
        if (media && mediaType) {
            endpoint = `/message/sendMedia/${instanceName}`;
            
            // Se for Base64, Evolution v2 aceita direto. 
            // Se for URL, também.
            // O ideal é passar o objeto media formatado.
            payload = {
                number: remoteJid,
                options: options,
                mediaMessage: {
                    mediatype: mediaType,
                    caption: message || "",
                    media: media // Base64 ou URL
                }
            };

            // Se for áudio, Evolution tem tratamento específico para PTT (audioMessage vs userAudioMessage)
            // Se mediaType == 'audio', geralmente é arquivo. PTT requer parametro extra se quisermos 'gravando'.
            
        } 
        // 2. Envio de Texto Simples
        else {
            if (!message) throw new HttpsError('invalid-argument', 'Mensagem vazia.');
            
            endpoint = `/message/sendText/${instanceName}`;
            payload = {
                number: remoteJid,
                options: options,
                text: message
            };
        }

        // Executa Chamada
        const result = await EvolutionService.request(instanceName, endpoint, 'POST', payload);

        // [OPTIMISTIC UPDATE] Salva no Firestore para feedback imediato no Frontend
        const db = admin.firestore();
        const batch = db.batch();
        const msgId = result?.key?.id || result?.id;
        const now = Date.now();

        if (msgId) {
             const msgDocRef = db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${msgId}`);
             batch.set(msgDocRef, {
                 id: msgId,
                 remoteJid,
                 fromMe: true,
                 type: mediaType || 'text',
                 text: message || "",
                 status: "pending", // Aguardando webhook para confirmar
                 timestamp: now,
                 createdAt: admin.firestore.FieldValue.serverTimestamp(),
                 updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                 media: media && typeof media === 'string' && !media.startsWith('data:') && media.length < 2000 ? { url: media, type: mediaType, mediaStatus: 'UPLOADED' } : null 
             }, { merge: true });

             const chatRef = db.doc(`instances/${instanceName}/chats/${remoteJid}`);
             batch.set(chatRef, {
                 lastMessage: message || (mediaType ? "Mídia" : "Mensagem"),
                 lastMessagePreview: message || (mediaType ? "Mídia" : "Mensagem"), // [FIX] Padronização Frontend
                 lastMessageTimestamp: admin.firestore.Timestamp.fromMillis(now),
                 lastMessageAt: now,
                 lastMessageTimestampMillis: now,
                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
             }, { merge: true });

             await batch.commit();
        }

        return { success: true, messageId: msgId, result };

    } catch (error: any) {
        console.error("Erro sendMessage:", error);
        throw new HttpsError('internal', error.message || "Erro ao enviar mensagem.");
    }
});

/**
 * Apaga uma mensagem (Delete for Everyone).
 */
export const deleteMessage = onCall({ region: "us-central1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { instanceName, remoteJid, messageId } = request.data;

    if (!instanceName || !remoteJid || !messageId) {
        throw new HttpsError('invalid-argument', 'Dados incompletos.');
    }

    try {
        await EvolutionService.request(instanceName, `/message/delete/${instanceName}`, 'DELETE', {
            remoteJid: remoteJid,
            id: messageId
        });

        // Atualiza Firestore imediatamente (Otimistic Update Backend-side)
        const db = admin.firestore();
        await db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${messageId}`).set({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Erro deleteMessage:", error);
        throw new HttpsError('internal', "Erro ao apagar mensagem.");
    }
});

/**
 * Edita o texto de uma mensagem enviada.
 */
export const editMessage = onCall({ region: "us-central1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { instanceName, remoteJid, messageId, newText } = request.data;

    if (!instanceName || !remoteJid || !messageId || !newText) {
        throw new HttpsError('invalid-argument', 'Dados incompletos.');
    }

    try {
        await EvolutionService.request(instanceName, `/message/update/${instanceName}`, 'POST', {
            remoteJid: remoteJid,
            id: messageId,
            message: newText
        });

        // Atualiza Firestore imediatamente
        const db = admin.firestore();
        await db.doc(`instances/${instanceName}/chats/${remoteJid}/messages/${messageId}`).set({
            isEdited: true,
            content: {
                message: { conversation: newText }
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Erro editMessage:", error);
        throw new HttpsError('internal', "Erro ao editar mensagem.");
    }
});
