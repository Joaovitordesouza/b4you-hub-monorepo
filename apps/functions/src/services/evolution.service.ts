import * as admin from "firebase-admin";
import axios from "axios";
import { logger } from "firebase-functions";

export class EvolutionService {
    
    // Helper: Extração de Texto da Mensagem (Compartilhado)
    static extractMessageText(data: any): string {
        if (!data) return "Mensagem";
        const msg = data.message || data.content || {}; // Suporta estrutura de webhook e chat
        
        if (msg.conversation) return msg.conversation;
        if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
        
        if (msg.imageMessage) return "📷 Imagem";
        if (msg.videoMessage) return "🎥 Vídeo";
        if (msg.audioMessage) return "🎵 Áudio";
        if (msg.documentMessage) return "📄 Documento";
        if (msg.stickerMessage) return "💟 Figurinha";
        if (msg.contactMessage) return "👤 Contato";
        if (msg.locationMessage) return "📍 Localização";
        
        return "Mensagem";
    }

    /**
     * Realiza requisições à Evolution API usando o token específico da instância.
     */
    static async request(instanceName: string, endpoint: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', data?: any): Promise<any> {
        const db = admin.firestore();
        const instanceDoc = await db.collection("instances").doc(instanceName).get();
        
        if (!instanceDoc.exists) {
            throw new Error(`Instância ${instanceName} não encontrada no Firestore.`);
        }
        
        const instanceData = instanceDoc.data();
        const token = (instanceData?.token || "").trim();
        const apiUrlEnv = (process.env.EVOLUTION_API_URL || "").trim();
        const apiUrl = (instanceData?.apiUrl || apiUrlEnv || "").trim();
        
        if (instanceData?.apiUrl && instanceData.apiUrl !== apiUrlEnv) {
            logger.warn(`[EvolutionService] Usando apiUrl do Firestore (${instanceData.apiUrl}) que difere do ENV (${apiUrlEnv})`, { instanceName });
        }
        
        // [FIX] Prioriza a Global Key se disponível, pois é mais confiável para actions
        const globalKey = (process.env.EVOLUTION_GLOBAL_KEY || process.env.EVOLUTION_APIKEY || "").trim();
        const apiKeyToUse = globalKey || token;

        if (!apiKeyToUse) {
            throw new Error(`API Key não encontrada para instância ${instanceName}.`);
        }
        if (!apiUrl) {
            throw new Error(`URL da API não configurada.`);
        }

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        // Normalize URL: remove trailing slashes from apiUrl
        const baseUrl = apiUrl.replace(/\/+$/, "");
        const url = `${baseUrl}${cleanEndpoint}`;

        // [LOGS ESTRUTURADOS]
        logger.info(`[API] Request ${method} ${url}`, {
            instanceName,
            endpoint,
            payloadSummary: data ? {
                to: data.number,
                type: data.textMessage ? 'text' : (data.mediaMessage?.mediatype || 'unknown'),
                hasMedia: !!data.mediaMessage
            } : null
        });

        try {
            const response = await axios({
                method,
                url,
                data,
                headers: {
                    "Content-Type": "application/json",
                    "apikey": token
                },
                timeout: 120000, // Aumentado para 120s (Banco do WhatsApp pode ser lento)
                maxBodyLength: Infinity, // Suporte a payloads gigantes (Base64)
                maxContentLength: Infinity
            });
            return response.data;
        } catch (error: any) {
            console.error(`[EvolutionService] Erro ${method} ${url} (${instanceName}): ${error.message}`);
            if (error.response) {
                console.error(`[EvolutionService] Status: ${error.response.status}`);
                // Log limitado para não poluir, mas suficiente para debug
                try {
                    console.error(`[EvolutionService] Data:`, JSON.stringify(error.response.data).substring(0, 1000));
                } catch (e) {
                    console.error(`[EvolutionService] Data (Raw):`, error.response.data);
                }
            }
            throw error;
        }
    }

    // Métodos removidos (Movidos para Worker):
    // - findLeadByPhone
    // - fetchChats
    // - fetchMessages
    // - fetchProfilePictureUrl
    // - handleMediaUpload

    static async sendText(instanceName: string, to: string, text: string, options: any = {}): Promise<any> {
        return await this.request(instanceName, '/message/sendText', 'POST', {
            number: to,
            options,
            textMessage: { text }
        });
    }

    static async sendMedia(instanceName: string, to: string, mediaUrl: string, type: string, caption: string = "", options: any = {}): Promise<any> {
        return await this.request(instanceName, '/message/sendMedia', 'POST', {
            number: to,
            options,
            mediaMessage: {
                mediatype: type,
                caption: caption,
                media: mediaUrl
            }
        });
    }
}
