import { onCall, HttpsError } from "firebase-functions/v2/https";
import axios from "axios";

// Variáveis de ambiente
const WORKER_URL = process.env.WORKER_URL;

/**
 * Sincroniza mensagens de um chat específico sob demanda (Lazy Loading).
 * Chamado quando o usuário clica no chat no Frontend.
 * 
 * REFACTOR: Atua apenas como Dispatcher para o Worker.
 */
export const syncChatMessages = onCall({ 
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB" // Reduzido pois agora é leve
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { instanceName, remoteJid, limit, force } = request.data;

    if (!instanceName || !remoteJid) {
        throw new HttpsError('invalid-argument', 'instanceName e remoteJid são obrigatórios.');
    }

    if (!WORKER_URL) {
        console.error("[SYNC ON-DEMAND] CRITICAL: WORKER_URL não está definido.");
        throw new HttpsError('internal', 'Erro de configuração no servidor.');
    }

    try {
        console.log(`[SYNC ON-DEMAND] Despachando sync para ${remoteJid} na instância ${instanceName}...`);
        
        // Autenticação GCP (ID Token)
        const { GoogleAuth } = require("google-auth-library");
        const auth = new GoogleAuth();
        let idToken = "";
        
        try {
            const targetAudience = new URL(WORKER_URL).origin;
            const client = await auth.getIdTokenClient(targetAudience);
            const headers = await client.getRequestHeaders();
            idToken = headers['Authorization']?.split(' ')[1] || "";
        } catch (e) {
            console.warn("[SYNC ON-DEMAND] Falha ao obter ID Token (pode ser ambiente local):", e);
        }

        // Chama o Worker
        const response = await axios.post(`${WORKER_URL}/jobs/sync-chat`, {
            instanceName,
            remoteJid,
            limit: limit || 50,
            force: force || false
        }, {
            headers: { 
                "apikey": String(process.env.INTERNAL_API_KEY || "").trim(),
                ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {})
            },
            timeout: 55000 // Menor que o timeout da Function (60s)
        });

        console.log(`[SYNC ON-DEMAND] Worker respondeu:`, response.data);

        return response.data; // { success: true, count: number, message: string }

    } catch (error: any) {
        console.error("Erro syncChatMessages:", error.message);
        if (error.response) {
            console.error("Worker Response:", error.response.data);
            throw new HttpsError('internal', `Erro no Worker: ${JSON.stringify(error.response.data)}`);
        }
        throw new HttpsError('internal', error.message || "Erro ao sincronizar mensagens.");
    }
});
