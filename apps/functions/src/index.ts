import * as dotenv from "dotenv";
dotenv.config({ path: ".env.production", override: true });

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import axios from "axios";
import { importProducers } from "./hooks/importProducers";
import { onOutboxCreate, onOutboxRetry } from "./triggers/outboxTriggers";
import { syncInstanceHistory } from "./triggers/syncHistory";
import { manageInstances } from "./hooks/manageInstances";
import { sendMessage, deleteMessage, editMessage } from "./hooks/chatActions";
import { syncChatMessages } from "./hooks/syncActions";

import { getGoogleAuthUrl, googleAuthCallback, listEvents, manageEvent } from "./hooks/calendarHooks";
import { getAvailableSlots, bookMeeting } from "./hooks/schedulingHooks";

// Inicializa usando o projeto padrão do ambiente (b4you-hub-prodv1)
admin.initializeApp();

// Configuração Global para alinhar com Nam5 (us-central1) e permitir escalabilidade
setGlobalOptions({ 
    region: "us-central1",
    memory: "512MiB",
    maxInstances: 10,
    concurrency: 80
});

/**
 * Gatilho para limpar dados quando uma migração é deletada (opcional)
 */
export const onMigrationDeleted = onDocumentDeleted({ document: "migrations/{migrationId}" }, async (event) => {
        console.log(`Migração ${event.params.migrationId} deletada. Limpeza pendente.`);
});

/**
 * Lista os cursos da Kiwify (Proxy).
 */
export const listKiwifyCourses = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { token } = request.data;
    if (!token) {
        throw new HttpsError('invalid-argument', 'Token da Kiwify é obrigatório.');
    }

    try {
        const response = await axios.get('https://admin-api.kiwify.com.br/v1/viewer/schools/courses', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json, text/plain, */*'
            }
        });

        const rawCourses = response.data.courses || [];
        const mappedCourses = rawCourses.map((item: any) => {
            const info = item.course_info || item;
            return {
                id: info.id,
                name: info.name,
                cover_image: info.course_img || info.cover_image,
                product_id: item.product_id
            };
        });

        return mappedCourses;
    } catch (error: any) {
        console.error("Erro ao listar cursos Kiwify:", error.message);
        throw new HttpsError('internal', 'Erro ao conectar com Kiwify', error.response?.data || error.message);
    }
});

export { 
    importProducers, 
    onOutboxCreate, 
    onOutboxRetry, 
    syncInstanceHistory, 
    manageInstances, 
    sendMessage, 
    deleteMessage, 
    editMessage,
    syncChatMessages,
    getGoogleAuthUrl,
    googleAuthCallback,
    getAvailableSlots,
    bookMeeting,
    listEvents,
    manageEvent
};
