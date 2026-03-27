
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { CalendarService } from "../services/calendarService";

const calendarService = new CalendarService();

/**
 * Retorna a URL de autorização do Google para o usuário.
 */
export const getGoogleAuthUrl = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const userId = request.auth.uid;
    return await calendarService.getAuthUrl(userId);
});

/**
 * Callback de redirecionamento do Google OAuth 2.0.
 */
export const googleAuthCallback = onRequest(async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        res.status(400).send('Código ou Usuário não fornecidos.');
        return;
    }

    try {
        const tokens = await calendarService.getTokens(code as string);
        
        // Salva os tokens no Firestore
        await admin.firestore()
            .collection('users')
            .doc(userId as string)
            .collection('integrations')
            .doc('google_calendar')
            .set({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
                scopes: tokens.scope?.split(' ') || [],
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        // Redireciona de volta para o CRM (ajustar URL conforme ambiente)
        const redirectUrl = process.env.CRM_URL || 'https://frontend-prod-74e3ydctxq-uc.a.run.app/#/agenda';
        res.redirect(`${redirectUrl}?status=success`);
    } catch (error: any) {
        console.error('Erro no Google Auth Callback:', error);
        res.status(500).send('Erro ao processar autenticação do Google.');
    }
});

/**
 * Busca os eventos do Google Calendar do usuário em um intervalo de tempo.
 */
export const listEvents = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    const { timeMin, timeMax, targetUserId } = request.data;
    if (!timeMin || !timeMax) throw new HttpsError('invalid-argument', 'timeMin e timeMax são obrigatórios.');

    const userId = targetUserId || request.auth.uid;

    try {
        return await calendarService.listEvents(userId, timeMin, timeMax);
    } catch (error: any) {
        console.error('Erro ao listar eventos:', error);
        throw new HttpsError('internal', 'Erro ao listar eventos do Google Calendar.');
    }
});

/**
 * Permite Criar, Editar ou Deletar um evento na agenda.
 */
export const manageEvent = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    const { action, eventId, eventData } = request.data;
    if (!action) throw new HttpsError('invalid-argument', 'Parâmetro action é obrigatório.');

    try {
        return await calendarService.manageEvent(request.auth.uid, action, eventId, eventData);
    } catch (error: any) {
        console.error('Erro ao gerenciar evento:', error);
        throw new HttpsError('internal', 'Erro ao gerenciar evento no Google Calendar.');
    }
});
