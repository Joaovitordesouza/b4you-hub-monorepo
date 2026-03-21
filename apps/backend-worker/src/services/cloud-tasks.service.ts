import { CloudTasksClient } from '@google-cloud/tasks';
import * as admin from 'firebase-admin';

/**
 * Prioridade das Cloud Tasks
 * - HIGH: Mensagens críticas que precisam de processamento imediato
 * - DEFAULT: Operações normais de sync
 * - LOW: Processamento de mídia em background
 */
export enum TaskPriority {
    HIGH = 'high',
    DEFAULT = 'default',
    LOW = 'low'
}

// [SRE] Configuração Nativa Otimizada para Cloud Run
const client = new CloudTasksClient({
    retry: {
        retryCodes: [14, 4, 10], // UNAVAILABLE, DEADLINE_EXCEEDED, ABORTED
        backoffSettings: {
            initialRetryDelayMillis: 100,
            retryDelayMultiplier: 1.3,
            maxRetryDelayMillis: 10000,
            totalTimeoutMillis: 60000
        }
    }
});

const PROJECT = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'b4you-hub';
const REGION = process.env.GCP_REGION || 'us-central1';
const QUEUE = process.env.CLOUD_TASKS_QUEUE || 'evolution-sync'; // Permite override via ENV
const MEDIA_QUEUE = process.env.CLOUD_TASKS_MEDIA_QUEUE || 'evolution-media';
const MEDIA_QUEUE_HIGH = process.env.CLOUD_TASKS_MEDIA_QUEUE_HIGH || 'evolution-media-high';
const WORKER_URL = process.env.WORKER_URL;

if (!PROJECT || !REGION) {
    // Fail Fast: Não permite que o Worker suba sem configuração crítica de infra
    console.error('[CLOUD TASKS] CRITICAL: GCP_PROJECT ou GCP_REGION não definidos.');
}

export class CloudTasksService {

    static async enqueueSyncPage(instanceName: string, page: number, cursor: string | null = null) {
        if (!WORKER_URL) {
            throw new Error('[CLOUD TASKS] FATAL: WORKER_URL não definido. Impossível agendar task.');
        }

        if (!PROJECT || !REGION) {
            throw new Error('[CLOUD TASKS] FATAL: GCP_PROJECT ou GCP_REGION não definidos.');
        }

        const parent = client.queuePath(PROJECT, REGION, QUEUE);
        const payload = { instanceName, page, cursor };

        const task = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url: `${WORKER_URL}/jobs/sync-page`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: {
                    'Content-Type': 'application/json',
                },
                // Em ambiente de produção (Cloud Run), usamos OIDC Token para auth
                oidcToken: {
                    serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL || `evolution-worker-sa@${PROJECT}.iam.gserviceaccount.com`
                }
            }
        };

        // [DEBUG] Diagnóstico de Identidade
        const saEmail = task.httpRequest.oidcToken.serviceAccountEmail;
        console.log(`[CLOUD TASKS] Tentando agendar com SA Email: '${saEmail}' (Project: ${PROJECT})`);

        // Retry Manual Agressivo (Anti-Flap para Cloud Run)
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const [response] = await client.createTask({ parent, task });
                console.log(`[CLOUD TASKS] Task criada para ${instanceName} (Página ${page} - Cursor: ${cursor || 'Inicio'}): ${response.name}`);
                return;
            } catch (error: any) {
                const attempt = i + 1;
                // Códigos gRPC: 14 (UNAVAILABLE), 4 (DEADLINE_EXCEEDED)
                const isTransient = error.code === 14 || error.code === 4 || error.message?.includes('UNAVAILABLE') || error.message?.includes('DEADLINE_EXCEEDED');

                if (attempt === maxRetries || !isTransient) {
                    console.error(`[CLOUD TASKS] Falha Final (${error.code}): ${error.message}`);
                    throw error;
                }

                // Backoff Exponencial (500ms, 1s, 2s, 4s...)
                const delay = 500 * Math.pow(2, i);
                console.warn(`[CLOUD TASKS] Erro Transiente (${error.code}). Retentando em ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    static async enqueueSyncBatch(instanceName: string, chatIds: string[]) {
        if (!WORKER_URL) throw new Error('[CLOUD TASKS] FATAL: WORKER_URL ausente');
        if (!PROJECT || !REGION) throw new Error('[CLOUD TASKS] FATAL: GCP Config ausente');

        const parent = client.queuePath(PROJECT, REGION, QUEUE);
        const payload = { instanceName, chatIds };

        const task = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url: `${WORKER_URL}/jobs/sync-batch`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: {
                    serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL || `evolution-worker-sa@${PROJECT}.iam.gserviceaccount.com`
                }
            }
        };

        try {
            await client.createTask({ parent, task });
            // console.log(`[CLOUD TASKS] Lote de ${chatIds.length} chats agendado.`);
        } catch (error: any) {
            console.error(`[CLOUD TASKS] Falha ao agendar lote: ${error.message}`);
            throw error;
        }
    }

    static async enqueueProcessMedia(instanceName: string, messageId: string, remoteJid: string, mediaUrl: string, mediaType: string, mimeType?: string, priority: TaskPriority = TaskPriority.LOW, delaySeconds: number = 0) {
        if (!WORKER_URL) throw new Error('[CLOUD TASKS] FATAL: WORKER_URL ausente');
        if (!PROJECT || !REGION) throw new Error('[CLOUD TASKS] FATAL: GCP Config ausente');

        // [SRE] Validação rigorosa de parâmetros
        if (!instanceName || !remoteJid || !messageId) {
            console.error(`[CLOUD TASKS] SKIP enqueueProcessMedia: Parâmetros ausentes`, { instanceName, remoteJid, messageId });
            return;
        }

        // [MEDIA QUEUE] Seleção inteligente de fila baseada na prioridade
        const queueName = priority === TaskPriority.HIGH ? MEDIA_QUEUE_HIGH : MEDIA_QUEUE;
        const parent = client.queuePath(PROJECT, REGION, queueName);

        const payload = {
            type: 'message_media',
            instanceName: String(instanceName),
            messageId: String(messageId),
            remoteJid: String(remoteJid),
            mediaUrl: mediaUrl || "",
            mediaType: mediaType || "image",
            mimeType: mimeType || ""
        };

        const task: any = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url: `${WORKER_URL}/jobs/process-media`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: {
                    serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL || `evolution-worker-sa@${PROJECT}.iam.gserviceaccount.com`
                }
            }
        };

        if (delaySeconds > 0) {
            task.scheduleTime = {
                seconds: Math.floor(Date.now() / 1000) + delaySeconds,
            };
        }

        // Retry Loop (5x) com Backoff
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await client.createTask({ parent, task });
                return;
            } catch (error: any) {
                if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
                    const fallbackParent = client.queuePath(PROJECT, REGION, QUEUE);
                    await client.createTask({ parent: fallbackParent, task });
                    return;
                }

                const attempt = i + 1;
                if (attempt === maxRetries) throw error;

                // Backoff Exponencial (500ms start)
                const delay = 500 * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    static async enqueueProfilePicture(instanceName: string, remoteJid: string, mediaUrl: string, priority: TaskPriority = TaskPriority.LOW) {
        if (!WORKER_URL || !PROJECT || !REGION) throw new Error('[CLOUD TASKS] GCP Config ausente');

        // [MEDIA QUEUE] Seleção inteligente de fila baseada na prioridade
        const queueName = priority === TaskPriority.HIGH ? MEDIA_QUEUE_HIGH : MEDIA_QUEUE;
        const parent = client.queuePath(PROJECT, REGION, queueName);
        const payload = {
            type: 'profile_picture',
            instanceName,
            remoteJid,
            mediaUrl
        };

        const task = {
            httpRequest: {
                httpMethod: 'POST' as const,
                url: `${WORKER_URL}/jobs/process-media`,
                body: Buffer.from(JSON.stringify(payload)).toString('base64'),
                headers: { 'Content-Type': 'application/json' },
                oidcToken: {
                    serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL || `evolution-worker-sa@${PROJECT}.iam.gserviceaccount.com`
                }
            }
        };

        // Retry Manual Agressivo (PFP é onde mais falha)
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
            try {
                await client.createTask({ parent, task });
                return;
            } catch (error: any) {
                const attempt = i + 1;
                const isTransient = error.code === 14 || error.code === 4 || error.message?.includes('UNAVAILABLE') || error.message?.includes('DEADLINE_EXCEEDED');

                if (attempt === maxRetries || !isTransient) {
                    console.error(`[CLOUD TASKS] Falha Final PFP ${remoteJid}: ${error.message}`);
                    return; // Não lança erro para não travar o fluxo (Fire and Forget)
                }

                // Backoff Exponencial
                const delay = 500 * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
}
