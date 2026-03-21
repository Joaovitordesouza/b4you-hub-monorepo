import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import axios from "axios";
import { GoogleAuth } from "google-auth-library";

// URL do Worker (Idealmente via variável de ambiente, mas fallback fixo para simplicidade)
const WORKER_URL = process.env.WORKER_URL || "https://evolution-worker-412916747304.us-central1.run.app";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "b4you-internal-secret-key-v1";

const auth = new GoogleAuth();
let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Obtém um ID Token do Google para autenticação Service-to-Service robusta.
 */
async function getIdToken(url: string): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
    
    try {
        const client = await auth.getIdTokenClient(url);
        const headers: any = await client.getRequestHeaders();
        const token = headers['Authorization']?.split(' ')[1];
        if (token) {
            cachedToken = token;
            tokenExpiry = Date.now() + 3000000; // Cache por 50 min
            return token;
        }
        return INTERNAL_API_KEY; // Fallback
    } catch (e) {
        return INTERNAL_API_KEY;
    }
}

// Dispatcher genérico para o Worker
async function dispatchToWorker(instanceName: string, messageId?: string) {
    try {
        console.log(`[OUTBOX TRIGGER] Despachando para Worker: ${instanceName} [Trigger: ${messageId || 'BATCH'}]`);
        
        const token = await getIdToken(WORKER_URL);

        // [OTIMIZAÇÃO] Timeout aumentado para 15s para suportar Cold Start do Worker
        // O Worker processará a fila independentemente de qual mensagem disparou (Batch/Idempotent)
        await axios.post(`${WORKER_URL}/jobs/outbox`, { instanceName, triggerMessageId: messageId }, {
            headers: { 
                'apikey': INTERNAL_API_KEY, // Mantém para retrocompatibilidade
                'Authorization': `Bearer ${token}` // Autenticação OIDC robusta
            },
            timeout: 15000 // 15s (Cold Start Safe)
        }).catch(e => {
            // Ignora timeout (ECONNABORTED) pois é provável que o worker esteja processando
            if (e.code === 'ECONNABORTED') {
                console.warn(`[OUTBOX TRIGGER] Timeout (15s) ao chamar Worker. Assumindo que o processamento continua em background.`);
                return;
            }
            
            // Loga erro se o worker rejeitar (ex: 401 Unauthorized, 500 Internal Server Error)
            if (e.response) {
                 console.error(`[OUTBOX TRIGGER] Worker rejeitou (${e.response.status}):`, JSON.stringify(e.response.data));
            } else {
                 console.error(`[OUTBOX TRIGGER] Erro de conexão com Worker:`, e.message);
            }
        });

    } catch (e: any) {
        console.error(`[OUTBOX TRIGGER] Falha crítica:`, e.message);
    }
}

/**
 * TRIGGER DE MENSAGENS (Lightweight Dispatcher)
 * Apenas acorda o Worker quando uma mensagem chega na Outbox.
 * Toda a lógica pesada (Locks, Envio, Retry) está no Worker.
 */

export const onOutboxCreate = onDocumentCreated(
    { 
        document: "instances/{instanceId}/outbox/{messageId}",
        memory: "128MiB", // Reduzido para economizar
        timeoutSeconds: 30
    },
    async (event) => {
        if (!event.data) return;
        await dispatchToWorker(event.params.instanceId, event.params.messageId);
    }
);

export const onOutboxRetry = onDocumentUpdated(
    { 
        document: "instances/{instanceId}/outbox/{messageId}",
        memory: "128MiB",
        timeoutSeconds: 30
    },
    async (event) => {
        if (!event.data) return;
        const after = event.data.after.data();
        
        // Se mudou para PENDING ou FAILED_RETRYING (ex: via poke manual ou timeout), avisa o worker
        if (after && ['PENDING', 'FAILED_RETRYING'].includes(after.status)) {
            await dispatchToWorker(event.params.instanceId, event.params.messageId);
        }
    }
);
