
import { google } from 'googleapis';
import { GoogleCalendarIntegration } from '@b4you/types';
import * as admin from 'firebase-admin';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'];

export class CalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
      process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_CLIENT_SECRET',
      process.env.GOOGLE_REDIRECT_URI || 'https://us-central1-b4you-hub-prodv1.cloudfunctions.net/googleAuthCallback'
    );
  }

  async getAuthUrl(userId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId,
      prompt: 'consent'
    });
  }

  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async setCredentials(userId: string) {
    const integrationDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('google_calendar')
      .get();

    if (!integrationDoc.exists) {
      throw new Error('Google Calendar integration not found for user ' + userId);
    }

    const data = integrationDoc.data() as GoogleCalendarIntegration;
    this.oauth2Client.setCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiry_date: data.expiry_date
    });

    // Handle token refresh
    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        // Updated refresh token
        await integrationDoc.ref.update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Only access token updated
        await integrationDoc.ref.update({
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return this.oauth2Client;
  }

  async getFreeBusy(userId: string, timeMin: string, timeMax: string) {
    await this.setCredentials(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: 'primary' }]
      }
    });

    return response.data.calendars?.primary?.busy || [];
  }

  async createEvent(userId: string, event: {
    title: string,
    description?: string,
    startTime: string,
    endTime: string,
    attendeeEmail: string
  }) {
    await this.setCredentials(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
        attendees: [{ email: event.attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
    });

    return response.data;
  }

  async listEvents(userId: string, timeMin: string, timeMax: string) {
    await this.setCredentials(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    let allEvents: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
        pageToken: pageToken
      });

      if (response.data.items) {
        allEvents = allEvents.concat(response.data.items);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return allEvents;
  }

  async manageEvent(userId: string, action: 'create' | 'update' | 'delete', eventId?: string, eventData?: any) {
    await this.setCredentials(userId);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    if (action === 'delete') {
      if (!eventId) throw new Error('Event ID required for delete action');
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
      return { success: true };
    }

    if (action === 'update') {
      if (!eventId || !eventData) throw new Error('Event ID and Data required for update action');
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: eventData,
      });
      return response.data;
    }

    if (action === 'create') {
      if (!eventData) throw new Error('Event Data required for create action');
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData,
      });
      return response.data;
    }

    throw new Error('Invalid manageEvent action');
  }
}
