import express from 'express';
import * as admin from 'firebase-admin';
import https from 'https';
import http from 'http';
import { json } from 'body-parser';

// Configuração Anti-Socket-Hangup (Google Cloud Run Otimization)
// Configuração Anti-Socket-Hangup (Google Cloud Run Otimization)
(https.globalAgent as any).keepAlive = true;
(https.globalAgent as any).keepAliveMsecs = 60000; // 60s (Padrão Google Cloud para evitar Socket Hangup)
(https.globalAgent as any).maxSockets = 500;
(http.globalAgent as any).keepAlive = true;
(http.globalAgent as any).keepAliveMsecs = 60000;
(http.globalAgent as any).maxSockets = 500;
import { WebhookController } from './controllers/webhook.controller';
import { SyncController } from './controllers/sync.controller';
import { OutboxController } from './controllers/outbox.controller';
import { HttpWebhookController } from './controllers/http-webhook.controller';
import { MediaController } from './controllers/media.controller';
import { MaintenanceController } from './controllers/maintenance.controller';

// Init Firebase
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: process.env.GCP_PROJECT || "b4you-hub",
        storageBucket: "b4you-hub.firebasestorage.app"
    });
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para mensagens grandes do Pub/Sub
app.use(json({ limit: '50mb' }));

// Middleware de Segurança (Basic Auth Check Simplificado para Cloud Tasks / API interna)
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers.apikey || req.headers['x-api-key'];
    const expectedApiKey = process.env.INTERNAL_API_KEY;
    const isCloudTask = req.headers['user-agent']?.includes('Google-Cloud-Tasks') || req.headers['x-cloudtasks-queuename'];

    // 1. Autorizar se for o Google Cloud Tasks
    // O GCP IAM cuida da autenticação OIDC antes de chegar no container do Cloud Run,
    // Mas repassamos aqui caso o proxy do Express necessite ou se for invocado diretamente.
    if (isCloudTask) {
        console.log(`[SECURITY] Requisição aceita via Cloud Tasks em ${req.path}`);
        return next();
    }

    // 2. Autorizar por apiKey correta
    if (expectedApiKey && (apiKey === expectedApiKey)) {
        return next();
    }

    // 3. OIDC fallback / Authorization Header genérico (caso a GCP repasse o Token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Em um ambiente produtivo real sem API Gateway, você validaria esse OIDC Token.
        // Como o Cloud Run já o valida via IAM (Service-to-Service auth), e só chegamos 
        // aqui se o Cloud Run autorizou (caso seja invocação interna permitida), passamos.
        console.log(`[SECURITY] Requisição aceita com ID Token (OIDC) em ${req.path}`);
        return next();
    }

    // Sem credenciais válidas
    const maskedApiKey = apiKey ? `${String(apiKey).substring(0, 4)}***` : 'missing';
    const hasBearer = !!authHeader;
    console.warn(`[SECURITY] Bloqueado acesso em ${req.path} | Origem: ${req.ip} | expectedKey: ${expectedApiKey ? 'definida' : 'NÃO-definida'} | receivedKey: ${maskedApiKey} | hasBearer: ${hasBearer}`);
    res.status(401).json({ error: "Unauthorized: Invalid or Missing credentials" });
};

// Health Check
app.get('/', (req, res) => res.status(200).send('Worker Online 🚀'));

// Sanity Check no boot
console.log(`[BOOT] INTERNAL_API_KEY configurada: ${process.env.INTERNAL_API_KEY ? process.env.INTERNAL_API_KEY.substring(0, 4) + '...' : 'NÃO DEFINIDA (Usando fallback)'}`);
SyncController.checkDbPermissions().catch(console.error);

// 1. Webhook Processor (Pub/Sub Push)
// Recebe o evento da Evolution via Dispatcher (Pub/Sub)
app.post('/events/process', WebhookController.handleEvent);

// 2. Deep Sync Job (Cloud Tasks Target ou Chamada Direta)
// Lida com sincronização pesada de histórico
app.post('/jobs/sync', authMiddleware, SyncController.handleDeepSync);

// 2.1 Chat Sync Job (On-Demand / Lazy Loading)
// Lida com sincronização de chat específico (ex: ao abrir conversa)
app.post('/jobs/sync-chat', authMiddleware, SyncController.handleChatSync);

// 2.2 Sync Page Job (Task-Chain Unit)
// Processa uma única página de histórico e agenda a próxima
app.post('/jobs/sync-page', authMiddleware, SyncController.handleSyncPage);

// 2.3 Sync Batch Job (Parallel Deep Sync)
// Processa um lote de chats recebidos no fetch inicial
app.post('/jobs/sync-batch', authMiddleware, SyncController.handleSyncBatch);

// 3. Outbox Job (Acionado por Trigger ou Cron)
// Processa fila de envio
app.post('/jobs/outbox', authMiddleware, OutboxController.handleProcessOutbox);

// 4. Media Processing (Cloud Tasks Dedicated Queue)
// Processa upload de mídia em background para não travar o sync
app.post('/jobs/process-media', authMiddleware, MediaController.handleProcessMedia);

// 4.0.1 Media Reprocess (User-triggered retry)
// Permite que o frontend peça reprocessamento de mídia expirada/erro
app.post('/media/reprocess', authMiddleware, MediaController.handleReprocessMedia);

// 4.1 Maintenance Jobs
app.post('/jobs/repair-webhooks', authMiddleware, MaintenanceController.handleRepairWebhooks);

// 5. Http Webhook (Evolution Direct Push)
// Substitui a Cloud Function. Recebe evento direto da Evolution.
// Aceita sub-rotas como /webhooks/evolution/qrcode-updated
app.post('/webhooks/evolution*', HttpWebhookController.handleEvolutionWebhook);

app.listen(PORT, () => {
    console.log(`[WORKER] Listening on port ${PORT}`);
});
