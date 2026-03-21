import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import axios from "axios";
import * as crypto from "crypto";
import { GoogleAuth } from "google-auth-library";
import { EvolutionService } from "../services/evolution.service";

// Constantes Invariantes da Infraestrutura
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || "").trim();
const GLOBAL_API_KEY = String(process.env.EVOLUTION_GLOBAL_KEY || "").trim();
const INTERNAL_API_KEY = String(process.env.INTERNAL_API_KEY || "").trim();
const WORKER_URL = process.env.WORKER_URL; // [NEW] URL do Cloud Run Worker
const WEBHOOK_URL = WORKER_URL ? `${WORKER_URL}/webhooks/evolution` : process.env.WEBHOOK_URL;
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "b4you-hub";
const REGION = "us-central1";

// Helper Local de Segurança
const getSafeMillis = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'number') return timestamp;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    return 0;
};

/**
 * Cloud Function para gerenciar instâncias da Evolution API (Versão onCall).
 * Refatorado para Arquitetura SRE: Token por Instância + Webhook Unificado.
 */
export const manageInstances = onCall({ region: REGION }, async (request) => {
    console.log(`[DEBUG] manageInstances chamada por ${request.auth?.uid}`);

    // [DIAGNOSTIC] Log detalhado das variáveis de ambiente
    console.log(`[DEBUG] ENV DIAGNOSTIC:`);
    console.log(`- WORKER_URL: ${WORKER_URL || 'MISSING'}`);
    console.log(`- WEBHOOK_URL: ${WEBHOOK_URL || 'MISSING'}`);
    console.log(`- EVOLUTION_API_URL: ${EVOLUTION_API_URL || 'MISSING'}`);
    console.log(`- PROJECT_ID: ${PROJECT_ID}`);
    console.log(`- GLOBAL_KEY_CONFIGURED: ${!!GLOBAL_API_KEY}`);

    // Validação de Configuração
    if (!EVOLUTION_API_URL || !GLOBAL_API_KEY || !WEBHOOK_URL) {
        console.error("CRITICAL: Missing Evolution API configuration. Check .env.production generation.");
        throw new HttpsError('internal', 'Configuração do servidor incompleta.');
    }

    // Autenticação
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'O usuário deve estar autenticado.');
    }

    const userId = request.auth.uid;
    const { action, instanceName } = request.data;

    if (!action) {
        throw new HttpsError('invalid-argument', 'Ação é obrigatória.');
    }

    try {
        const db = admin.firestore();
        if (admin.apps.length === 0) {
            admin.initializeApp({ 
                projectId: PROJECT_ID,
                storageBucket: "b4you-hub.firebasestorage.app"
            });
        }

        switch (action) {
            case 'create': {
                const finalInstanceName = instanceName || `user-${userId.substring(0, 8)}`;

                // [SRE] Lock de Segurança
                const lockRef = db.collection("instance_locks").doc(finalInstanceName);
                const lockDoc = await lockRef.get();
                if (lockDoc.exists) {
                    const lockData = lockDoc.data();
                    const now = Date.now();
                    const lockTime = getSafeMillis(lockData?.createdAt);
                    if (now - lockTime < 60000) {
                        throw new HttpsError('resource-exhausted', 'Uma tentativa de criação já está em curso. Aguarde 60s.');
                    }
                }
                await lockRef.set({ userId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

                console.log(`[DEBUG] Iniciando criação de instância: ${finalInstanceName}`);

                // 1. Geração de Token Seguro
                const instanceToken = crypto.randomBytes(32).toString('hex');

                // 2. Clean Start (Tentativa de remoção segura)
                try {
                    await axios.delete(`${EVOLUTION_API_URL}/instance/delete/${finalInstanceName}`, {
                        headers: { "apikey": GLOBAL_API_KEY }
                    });
                } catch (e) { /* Ignora */ }

                // 3. Payload Unificado (Protocolo v2)
                const payload = {
                    instanceName: finalInstanceName,
                    token: instanceToken,
                    qrcode: true,
                    syncFullHistory: true, 
                    integration: "WHATSAPP-BAILEYS",
                    version: "2.3000.1032033616", 
                    webhook: {
                        url: WEBHOOK_URL,
                        byEvents: true,
                        base64: true,
                        enabled: true,
                        headers: {
                            "apikey": GLOBAL_API_KEY
                        },
                        events: [
                            "MESSAGES_UPSERT", 
                            "MESSAGES_UPDATE", 
                            "MESSAGES_DELETE", 
                            "CONNECTION_UPDATE", 
                            "QRCODE_UPDATED",
                            "SEND_MESSAGE",
                            "CHATS_UPSERT"
                        ]
                    }
                };

                // 4. Chamada de Criação
                let response;
                try {
                    response = await axios.post(`${EVOLUTION_API_URL}/instance/create`, payload, {
                        headers: { 
                            "Content-Type": "application/json",
                            "apikey": GLOBAL_API_KEY
                        }
                    });
                } catch (apiError: any) {
                    console.error("[DEBUG] Erro Evolution (Create):", apiError.message);
                    throw new HttpsError('internal', 'Falha ao criar instância na API Evolution.');
                }

                const instanceData = response.data;
                const qrcode = instanceData.qrcode?.base64 || instanceData.base64 || "";

                // 5. Persistência no Firestore
                await db.collection("instances").doc(finalInstanceName).set({
                    ownerId: userId,
                    instanceName: finalInstanceName,
                    token: instanceToken,
                    apiUrl: EVOLUTION_API_URL,
                    status: "CREATED",
                    systemStatus: "NEEDS_PAIRING",
                    connectionStatus: "OFFLINE",
                    qrcode: qrcode,
                    webhookUrl: payload.webhook,
                    syncGroups: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                return { 
                    success: true, 
                    instance: instanceData.instance || instanceData,
                    qrcode: qrcode,
                    message: "Instância criada com sucesso."
                };
            }

            case 'connect':
            case 'getQr': {
                if (!instanceName) throw new HttpsError('invalid-argument', 'instanceName obrigatório.');
                
                try {
                    const statusRes = await EvolutionService.request(instanceName, `/instance/connectionState/${instanceName}`, 'GET');
                    if (statusRes?.instance?.state === 'open') {
                        // [FIX] Use set/merge para evitar crash se doc não existir
                        await db.collection("instances").doc(instanceName).set({ systemStatus: "READY" }, { merge: true });
                        return { success: true, status: "CONNECTED", systemStatus: "READY", details: statusRes };
                    }
                } catch (e) {}

                const response = await EvolutionService.request(instanceName, `/instance/connect/${instanceName}`, 'GET');
                
                if (response && response.base64) {
                    // [FIX] Use set/merge para evitar crash
                    await db.collection("instances").doc(instanceName).set({ systemStatus: "NEEDS_PAIRING" }, { merge: true });
                    return { success: true, qrcode: response.base64, systemStatus: "NEEDS_PAIRING", ...response };
                }
                return { success: true, data: response };
            }

            case 'list': {
                const snapshot = await db.collection("instances")
                    .where("ownerId", "==", userId)
                    .get();
                return { success: true, instances: snapshot.docs.map(doc => doc.data()) };
            }

            case 'delete': {
                if (!instanceName) throw new HttpsError('invalid-argument', 'instanceName obrigatório.');
                
                try {
                    await EvolutionService.request(instanceName, `/instance/delete/${instanceName}`, 'DELETE');
                } catch (e) {
                    try {
                        await axios.delete(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                            headers: { "apikey": GLOBAL_API_KEY }
                        });
                    } catch (err) {}
                }
                
                await db.collection("instances").doc(instanceName).delete();
                return { success: true };
            }

            case 'resync': {
                if (!instanceName) throw new HttpsError('invalid-argument', 'instanceName obrigatório.');
                
                try {
                    // 1. Trigger Smart Sync (Fast + Deep) no Worker (Cloud Run)
                    const targetUrl = WORKER_URL || `https://evolution-worker-${PROJECT_ID}.${REGION}.a.run.app/jobs/sync`;
                    
                    console.log(`[WORKER TRIGGER] Disparando Deep Sync para ${targetUrl}...`);
                    
                    try {
                        // [AUTH FIX] Gerar ID Token para autenticação no Cloud Run
                        const auth = new GoogleAuth();
                        const targetAudience = new URL(targetUrl).origin;
                        const client = await auth.getIdTokenClient(targetAudience);

                        // Usar client.request diretamente (Google Auth Library handles headers automatically)
                        await client.request({
                            url: targetUrl,
                            method: 'POST',
                            data: {
                                instanceName,
                                offset: 10
                            },
                            headers: { "apikey": INTERNAL_API_KEY || GLOBAL_API_KEY },
                            timeout: 1000
                        }).catch(e => {
                            // Ignora timeout (ECONNABORTED) pois é esperado para "fire and forget"
                            if (e.code !== 'ECONNABORTED' && e.message !== 'timeout') console.error("[WORKER TRIGGER] Erro assíncrono:", e.message);
                        });
                    } catch (err: any) {
                         console.error("[WORKER TRIGGER] Falha ao disparar:", err.message);
                    }

                    return { success: true, message: "Sincronização iniciada (Background Worker)." };
                } catch (e: any) {
                    console.error("Erro no resync:", e);
                    throw new HttpsError('internal', "Falha na sincronização.");
                }
            }

            case 'updateConfig': {
                if (!instanceName) throw new HttpsError('invalid-argument', 'instanceName obrigatório.');
                const { config } = request.data;
                if (!config) throw new HttpsError('invalid-argument', 'Configurações ausentes.');

                // [DB] Atualiza metadados no Firestore
                await db.collection("instances").doc(instanceName).set({
                    ...config,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // [API] Se houver configurações relevantes para a Evolution (ex: webhook), atualiza lá também
                // No momento, focamos em flags de comportamento interno (syncGroups, etc)
                
                return { success: true, message: "Configurações atualizadas." };
            }

            default:
                throw new HttpsError('invalid-argument', 'Ação não suportada.');
        }

    } catch (error: any) {
        console.error(`[DEBUG] Erro Final (${action}):`, error);
        if (error.code && error.details) throw error;
        throw new HttpsError('internal', error.message || 'Erro interno.');
    }
});
