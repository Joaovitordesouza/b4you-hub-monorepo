import { onDocumentUpdated } from "firebase-functions/v2/firestore";

// URL do Worker (obrigatório via env)
const WORKER_URL = process.env.WORKER_URL;
const GLOBAL_API_KEY = String(process.env.EVOLUTION_GLOBAL_KEY || "").trim();

/**
 * TRIGGER DE SINCRONIZAÇÃO (Lightweight Dispatcher)
 * Detecta quando a instância fica ONLINE e delega o processo pesado de sync para o Worker.
 */
export const syncInstanceHistory = onDocumentUpdated(
    { 
        document: "instances/{instanceId}",
        timeoutSeconds: 60, // Reduzido (era 540s para polling)
        memory: "256MiB"    // Reduzido (era 512MiB)
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        const instanceId = event.params.instanceId;

        if (!before || !after) return;

        // Gatilho: connectionStatus mudou para ONLINE
        if (before.connectionStatus !== "ONLINE" && after.connectionStatus === "ONLINE") {
            if (!WORKER_URL) {
                console.error("[SYNC TRIGGER] CRITICAL: WORKER_URL não está definido no ambiente.");
                return;
            }

            console.log(`[SYNC TRIGGER] Instância ${instanceId} ficou ONLINE. Despachando Smart Sync para Worker...`);
            
            // Retry Loop (3 tentativas)
            const MAX_RETRIES = 3;
            let attempt = 0;
            let success = false;
            let lastError: any = null;

            while (attempt < MAX_RETRIES && !success) {
                try {
                    attempt++;
                    // [ID TOKEN AUTH]
                    const { GoogleAuth } = require("google-auth-library");
                    const auth = new GoogleAuth();
                    const targetAudience = new URL(WORKER_URL).origin;
                    const client = await auth.getIdTokenClient(targetAudience);

                    await client.request({
                        url: `${WORKER_URL}/jobs/sync`,
                        method: 'POST',
                        data: { instanceName: instanceId },
                        headers: { "apikey": GLOBAL_API_KEY },
                        timeout: 20000 // 20s (Cold Start Protection)
                    });
                    
                    success = true;
                    console.log(`[SYNC TRIGGER] Dispatch com sucesso na tentativa ${attempt}`);

                    if (event.data) {
                        await event.data.after.ref.set({ 
                            syncStatus: { 
                                status: "QUEUED", 
                                message: "Sincronização agendada no Worker...",
                                lastStart: new Date() 
                            } 
                        }, { merge: true });
                    }
                } catch (err: any) {
                    lastError = err;
                    console.warn(`[SYNC TRIGGER] Falha dispatch tentativa ${attempt}/${MAX_RETRIES}: ${err.message}`);
                    
                    if (attempt < MAX_RETRIES) {
                        const delay = attempt * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (!success) {
                console.error(`[SYNC TRIGGER] Falha Final após ${MAX_RETRIES} tentativas:`, lastError?.message);

                // Feedback visual de erro para o frontend
                if (event.data) {
                    await event.data.after.ref.set({ 
                        syncStatus: { 
                            status: "ERROR", 
                            message: `Falha ao iniciar sync (Worker Indisponível): ${lastError?.message}. Tente reconectar.`,
                            lastError: new Date() 
                        } 
                    }, { merge: true });
                }
            }
        }
    }
);
