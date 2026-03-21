import { Request, Response } from "express";
import { WebhookController } from "./webhook.controller";

const GLOBAL_API_KEY = String(process.env.EVOLUTION_GLOBAL_KEY || "").trim();

export class HttpWebhookController {

    static async handleEvolutionWebhook(req: Request, res: Response) {
        try {
            const apiKey = (req.query.apikey as string) || req.headers.apikey;

            // 1. Fast Validation (Security)
            // [TEMP] Desabilitado temporariamente para debug/migração conforme solicitado
            /*
            if (!GLOBAL_API_KEY || apiKey !== GLOBAL_API_KEY) {
                console.warn(`[AUTH FAIL] Webhook sem chave válida ou não configurada. IP: ${req.ip}`);
                res.status(401).send("Unauthorized");
                return;
            }
            */

            // 2. Adapter: Normaliza o payload para o formato esperado pelo WebhookController
            // O WebhookController espera:
            // - req.body.message.data (base64) -> vindo do PubSub
            // - OU req.body com estrutura direta
            
            // Aqui estamos recebendo direto da Evolution API, então o req.body já é o evento.
            // Mas o WebhookController.handleEvent procura `payload.body || payload`.
            // Se passarmos req diretamente, req.body será o payload.
            
            // Vamos envelopar para garantir compatibilidade com a lógica existente
            // que espera encontrar o evento em `payload.body` ou `payload` direto.
            
            // Na Function antiga:
            // const payload = { body: req.body, ... }
            // E o Worker desembrulhava: const body = payload.body || payload;
            
            // Então podemos modificar o req.body para envelopar, ou confiar que o controller lida com direto.
            // O Controller diz: `const body = payload.body || payload;`
            // Se payload for o req.body (direto da Evolution), então `body` será o próprio evento.
            // Isso funciona.
            
            // Delega para o processador existente
            // NOTA: WebhookController.handleEvent é assíncrono e retorna Promise<void>, 
            // mas responde o res status internamente.
            await WebhookController.handleEvent(req, res);

        } catch (e) {
            console.error("[HTTP WEBHOOK] Erro no despacho:", e);
            if (!res.headersSent) {
                res.status(500).send("Internal Server Error");
            }
        }
    }
}
