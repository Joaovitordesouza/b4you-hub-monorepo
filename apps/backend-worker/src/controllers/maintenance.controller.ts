import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { EvolutionService } from "../services/evolution.service";
import { Logger } from "../utils/logger";

export class MaintenanceController {

    /**
     * Repara a configuração de Webhook de uma instância ou de todas.
     * POST /jobs/repair-webhooks
     * Body: { instanceName?: string }
     */
    static async handleRepairWebhooks(req: Request, res: Response) {
        const { instanceName } = req.body;
        const db = admin.firestore();
        const globalApiKey = process.env.EVOLUTION_GLOBAL_KEY;
        const workerUrl = process.env.WORKER_URL;

        if (!globalApiKey || !workerUrl) {
            res.status(500).send("Configuração incompleta (EVOLUTION_GLOBAL_KEY ou WORKER_URL ausente).");
            return;
        }

        const webhookUrl = `${workerUrl}/webhooks/evolution`;

        try {
            let instances = [];
            if (instanceName) {
                const doc = await db.collection("instances").doc(instanceName).get();
                if (doc.exists) instances.push(doc.data());
            } else {
                const snapshot = await db.collection("instances").get();
                instances = snapshot.docs.map(d => d.data());
            }

            const results = [];

            for (const instance of instances) {
                const name = instance.instanceName;
                if (!name) continue;

                Logger.info('Maintenance', `Reparando webhook para ${name}...`);

                const payload = {
                    url: webhookUrl,
                    byEvents: true,
                    base64: true,
                    enabled: true,
                    headers: {
                        "apikey": globalApiKey
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
                };

                try {
                    // Tenta atualizar via Evolution API
                    // Nota: O endpoint correto pode ser /webhook/find/{instance} para ver e set para atualizar
                    // A v2 usa /webhook/set/{instance}
                    await EvolutionService.request(name, `/webhook/set/${name}`, 'POST', payload);
                    
                    // Atualiza no Firestore também para manter consistência
                    await db.collection("instances").doc(name).set({
                        webhookUrl: payload
                    }, { merge: true });

                    results.push({ instance: name, status: 'success' });
                } catch (e: any) {
                    Logger.error('Maintenance', `Falha ao reparar ${name}`, e);
                    results.push({ instance: name, status: 'error', error: e.message });
                }
            }

            res.status(200).json({ success: true, results });

        } catch (error: any) {
            Logger.error('Maintenance', 'Erro fatal', error);
            res.status(500).send(error.message);
        }
    }
}
