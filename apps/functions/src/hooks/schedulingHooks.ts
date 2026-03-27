
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { CalendarService } from "../services/calendarService";
import { CalendarSettings, Meeting, WorkingHours } from "@b4you/types";
import { addMinutes, formatISO, parseISO, isBefore, isAfter, startOfDay, addDays } from "date-fns";

const calendarService = new CalendarService();

/**
 * Calcula slots disponíveis para um CS.
 */
export const getAvailableSlots = onCall(async (request) => {
    const { csId, daysAhead = 14 } = request.data;
    if (!csId) throw new HttpsError('invalid-argument', 'ID do colaborador é obrigatório.');

    // 1. Busca configurações de agenda do CS
    const settingsDoc = await admin.firestore().collection('users').doc(csId).collection('calendar_settings').doc('default').get();
    const settings = settingsDoc.exists ? settingsDoc.data() as CalendarSettings : {
        working_hours: {
            monday: { start: "09:00", end: "18:00", enabled: true },
            tuesday: { start: "09:00", end: "18:00", enabled: true },
            wednesday: { start: "09:00", end: "18:00", enabled: true },
            thursday: { start: "09:00", end: "18:00", enabled: true },
            friday: { start: "09:00", end: "18:00", enabled: true },
        },
        buffer_minutes: 15,
        slot_duration: 45,
        timezone: 'America/Sao_Paulo'
    };

    // 2. Busca ocupação no Google Calendar
    const timeMin = formatISO(new Date());
    const timeMax = formatISO(addDays(new Date(), daysAhead));
    
    let busySlots: any[] = [];
    try {
        busySlots = await calendarService.getFreeBusy(csId, timeMin, timeMax);
    } catch (e) {
        console.error("Erro ao buscar Free/Busy:", e);
        // Prossegue considerando apenas working hours se houver erro (ou lança erro dependendo da política)
    }

    // 3. Lógica de cálculo de slots (Simplificada)
    const availableSlots: any[] = [];
    const now = new Date();

    for (let i = 0; i < daysAhead; i++) {
        const date = addDays(startOfDay(now), i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const config = settings.working_hours[dayName] as WorkingHours;

        if (!config || !config.enabled) continue;

        let currentSlotStart = parseISO(`${formatISO(date).split('T')[0]}T${config.start}:00`);
        const dayEnd = parseISO(`${formatISO(date).split('T')[0]}T${config.end}:00`);
        
        const breakStart = config.breakStart ? parseISO(`${formatISO(date).split('T')[0]}T${config.breakStart}:00`) : null;
        const breakEnd = config.breakEnd ? parseISO(`${formatISO(date).split('T')[0]}T${config.breakEnd}:00`) : null;

        while (isBefore(currentSlotStart, dayEnd)) {
            const currentSlotEnd = addMinutes(currentSlotStart, settings.slot_duration);
            
            // Verifica se o slot está dentro ou sobrepõe o horário de almoço
            let isDuringBreak = false;
            if (breakStart && breakEnd) {
                // Se o início do slot for antes do fim do almoço E o fim do slot for depois do início do almoço = conflito
                if (isBefore(currentSlotStart, breakEnd) && isAfter(currentSlotEnd, breakStart)) {
                    isDuringBreak = true;
                }
            }

            // Verifica se está no futuro e não conflita com almoço
            if (isAfter(currentSlotStart, now) && !isDuringBreak) {
                // Verifica conflito com busy slots
                const hasConflict = busySlots.some(busy => {
                    const bStart = parseISO(busy.start);
                    const bEnd = parseISO(busy.end);
                    return (isBefore(currentSlotStart, bEnd) && isAfter(currentSlotEnd, bStart));
                });

                if (!hasConflict) {
                    availableSlots.push({
                        start: formatISO(currentSlotStart),
                        end: formatISO(currentSlotEnd)
                    });
                }
            }

            // Próximo slot considerando buffer
            if (isDuringBreak && breakEnd && breakStart && isBefore(currentSlotStart, breakStart)) {
                // Se cruzou o almoço mas o slot começaria antes, o ideal é pular para o final do almoço diretamente para não criar slots quebrados,
                // mas para manter a consistência com os buffers, apenas avançamos normalmente, ou saltamos o almoço se start >= breakStart
                currentSlotStart = addMinutes(currentSlotEnd, settings.buffer_minutes);
            } else if (isDuringBreak && breakEnd) {
                 // Jump precisely to the end of the break
                 currentSlotStart = breakEnd;
            } else {
                 currentSlotStart = addMinutes(currentSlotEnd, settings.buffer_minutes);
            }
        }
    }

    return availableSlots;
});

/**
 * Realiza o agendamento final.
 */
export const bookMeeting = onCall(async (request) => {
    const { producerId, csId, startTime, endTime, title, description } = request.data;
    if (!producerId || !csId || !startTime || !endTime) {
        throw new HttpsError('invalid-argument', 'Dados insuficientes para agendamento.');
    }

    // 1. Busca dados do produtor (para o e-mail)
    const producerDoc = await admin.firestore().collection('producers').doc(producerId).get();
    if (!producerDoc.exists) throw new HttpsError('not-found', 'Produtor não encontrado.');
    const producer = producerDoc.data();

    try {
        // 2. Cria evento no Google Calendar
        const googleEvent = await calendarService.createEvent(csId, {
            title: title || `Onboarding: ${producer?.nome_display}`,
            description: description || `Reunião de Onboarding técnico B4You.`,
            startTime,
            endTime,
            attendeeEmail: producer?.email_contato || ''
        });

        // 3. Salva no Firestore
        const meetingId = `meet_${Date.now()}`;
        const meetingData: Meeting = {
            id: meetingId,
            producerId,
            csId,
            startTime: admin.firestore.Timestamp.fromDate(parseISO(startTime)),
            endTime: admin.firestore.Timestamp.fromDate(parseISO(endTime)),
            googleEventId: googleEvent.id || undefined,
            meetLink: googleEvent.conferenceData?.entryPoints?.[0]?.uri || undefined,
            status: 'scheduled',
            title: title || `Onboarding: ${producer?.nome_display}`,
            description,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await admin.firestore().collection('meetings').doc(meetingId).set(meetingData);

        // 4. (Opcional) Log na timeline do produtor
        await admin.firestore().collection('producers').doc(producerId).collection('timeline').add({
            type: 'SYSTEM_LOG',
            content: `Reunião de Onboarding agendada para ${new Date(startTime).toLocaleString()}.`,
            timestamp: Date.now(),
            authorName: 'Sistema',
            category: 'SYSTEM'
        });

        return { success: true, meetingId, meetLink: meetingData.meetLink };
    } catch (error: any) {
        console.error("Erro ao agendar reunião:", error);
        throw new HttpsError('internal', 'Erro ao processar agendamento no Google Calendar.', error.message);
    }
});
