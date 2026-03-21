import * as admin from 'firebase-admin';
import axios from 'axios';
import { formatMessageForFirestore } from './utils/formatter';
import { ContentParser } from './utils/content-parser';

// Mock do ambiente
process.env.EVOLUTION_API_URL = 'https://evolution-api-4b7h.srv1506962.hstgr.cloud';
process.env.EVOLUTION_APIKEY = 'ksfghdopsmkxcjfgkspcbnigodkgnjskfgmll';
process.env.LOG_LEVEL = 'DEBUG';

if (!admin.apps.length) {
    admin.initializeApp();
}

const INSTANCE_NAME = 'marketing';
// [FIX] Usando ID fornecido pelo usuário para teste direto
const TARGET_JID = '247055763120346@lid'; 

// --- SIMULAÇÃO DE DEPENDÊNCIAS ---

const CloudTasksService = {
    enqueueProcessMedia: async (...args: any[]) => {
        console.log('[MOCK CloudTasks] Agendando mídia:', args);
    }
};

const MediaService = {
    // Simula processamento rápido (skipUpload)
    processMedia: async (instanceId: string, message: any, skipUpload: boolean) => {
        const msgContent = message.message || {};
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        let mediaMessage = null;
        let type: any = 'unknown';

        for (const t of mediaTypes) {
            if (msgContent[t]) {
                mediaMessage = msgContent[t];
                type = t.replace('Message', '');
                break;
            }
        }

        if (!mediaMessage) return null;

        // Retorna Pending direto
        return {
            type,
            url: "", 
            mimetype: mediaMessage.mimetype || 'application/octet-stream',
            filename: mediaMessage.fileName || null,
            caption: mediaMessage.caption || null,
            originalUrl: mediaMessage.url || "",
            mediaStatus: 'PENDING'
        };
    }
};

// --- LÓGICA DE SALVAMENTO (CÓPIA DE EvolutionService) ---

async function saveDirectBatchMessages(instanceId: string, messages: any[]): Promise<void> {
    if (!messages || messages.length === 0) {
        console.warn('[SAVE BATCH] Array de mensagens vazio. Nada a salvar.');
        return;
    }

    console.log(`[SAVE BATCH] Processando ${messages.length} mensagens para ${instanceId}...`);
    
    const db = admin.firestore();
    const bulk = db.bulkWriter();
    let count = 0;

    for (const msg of messages) {
        // Simula processamento de mídia
        let mediaInfo = null;
        try {
            const msgContent = msg.message || {};
            const hasMedia = Object.keys(msgContent).some(k => k.endsWith('Message') && k !== 'conversation' && k !== 'extendedTextMessage');
            if (hasMedia) {
                // @ts-ignore
                mediaInfo = await MediaService.processMedia(instanceId, msg, true);
            }
        } catch (e) { console.error('Erro media:', e); }

        const msgDoc = formatMessageForFirestore(msg, mediaInfo); 
        
        if (msgDoc) {
            msgDoc.text = ContentParser.extractContent(msg);
            const cleanMsg = ContentParser.sanitizeForFirestore(msgDoc);
            // @ts-ignore
            (cleanMsg as any).lastMessageTimestampMillis = cleanMsg.timestamp;

            // [MEDIA QUEUE]
            const extendedInfo = mediaInfo as any;
            if (extendedInfo?.mediaStatus === 'PENDING') {
                (cleanMsg as any).mediaStatus = 'PENDING';
                (cleanMsg as any).originalMediaUrl = extendedInfo.originalUrl;
            }

            const remoteJid = msg.key?.remoteJid;
            const msgId = msg.key?.id;
            
            // [DEBUG] Log para verificar se IDs estão sendo extraídos
            // console.log(`[DEBUG ITEM] JID: ${remoteJid}, ID: ${msgId}`);

            if (remoteJid && msgId) {
                const msgPath = `instances/${instanceId}/chats/${remoteJid}/messages/${msgId}`;
                if (count === 0) console.log(`[SAVE BATCH] Escrevendo exemplo em: ${msgPath}`);
                
                const msgRef = db.doc(msgPath);
                bulk.set(msgRef, cleanMsg, { merge: true });
                count++;
            } else {
                console.warn(`[SAVE BATCH] Mensagem ignorada (sem ID/JID):`, JSON.stringify(msg.key));
            }
        } else {
            console.warn(`[SAVE BATCH] Mensagem ignorada (formatMessage falhou)`);
        }
    }

    if (count > 0) await bulk.close();
    console.log(`[SAVE BATCH] Total salvo: ${count} mensagens.`);
}

// --- DIAGNÓSTICO ---

async function runDiagnostics() {
    console.log('=== INICIANDO DIAGNÓSTICO DE SYNC (STEP-BY-STEP) ===');
    console.log(`Alvo: ${TARGET_JID}`);

    // 2. Fetch de Mensagens (Raw)
    console.log(`\n[2] Buscando mensagens...`);
    try {
        const url = `${process.env.EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`;
        const payload = {
            page: 1,
            limit: 5,
            where: { key: { remoteJid: TARGET_JID } }
        };
        
        console.log('Payload enviado:', JSON.stringify(payload, null, 2));
        
        const response = await axios.post(url, payload, {
            headers: { 'apikey': process.env.EVOLUTION_APIKEY }
        });
        
        console.log('Status:', response.status);
        
        let messages: any[] = [];
        if (Array.isArray(response.data)) {
            console.log('Formato: Array Direto');
            messages = response.data;
        } else if (response.data.messages) {
             console.log('Formato: { messages: [...] }');
             messages = response.data.messages;
        } else if (response.data.records) {
             console.log('Formato: { records: [...] }');
             messages = response.data.records;
        } else {
            console.log('❌ Formato desconhecido:', JSON.stringify(response.data, null, 2));
        }

        console.log(`Mensagens encontradas: ${messages.length}`);

        if (messages.length > 0) {
            console.log('Exemplo de Mensagem [0] (Key):', JSON.stringify(messages[0].key, null, 2));

            // 3. Teste de Processamento
            console.log(`\n[3] Simulando Salvamento...`);
            
            await saveDirectBatchMessages(INSTANCE_NAME, messages);
            
            // Verifica no Firestore
            const msgId = messages[0].key.id;
            const docRef = admin.firestore().doc(`instances/${INSTANCE_NAME}/chats/${TARGET_JID}/messages/${msgId}`);
            const doc = await docRef.get();
            
            if (doc.exists) {
                console.log(`✅ SUCESSO ABSOLUTO: Mensagem ${msgId} persistida no Firestore!`);
                // console.log('Dados salvos:', JSON.stringify(doc.data(), null, 2));
            } else {
                console.error(`❌ FALHA CRÍTICA: Mensagem ${msgId} NÃO apareceu no Firestore.`);
                console.error(`Caminho verificado: instances/${INSTANCE_NAME}/chats/${TARGET_JID}/messages/${msgId}`);
            }
        } else {
            console.warn('⚠️ Chat sem mensagens retornadas pela API.');
        }

    } catch (e: any) {
        console.error('Erro no diagnóstico:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    }
}

runDiagnostics();
