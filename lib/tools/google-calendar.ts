import { tool } from 'ai';
import { z } from 'zod';
import { getValidGoogleToken } from '@/lib/google/tokens';
import type { GoogleCalendarEvent } from '@/lib/types/agenthub';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export function createGoogleCalendarTools(userId: string) {
  return {
    listCalendarEvents: tool({
      description: 'List upcoming events from Google Calendar',
      inputSchema: z.object({
        maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of events to return'),
        timeMin: z.string().optional().describe('Start time filter (ISO 8601 format)'),
        timeMax: z.string().optional().describe('End time filter (ISO 8601 format)'),
      }),
      async *execute({ maxResults, timeMin, timeMax }) {
        yield { state: 'loading' as const, message: 'Fetching calendar events...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Calendar not connected' };
          return { error: 'Google Calendar not connected' };
        }

        const params = new URLSearchParams({
          maxResults: String(maxResults),
          orderBy: 'startTime',
          singleEvents: 'true',
          timeMin: timeMin || new Date().toISOString(),
        });
        if (timeMax) params.set('timeMax', timeMax);

        const response = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          yield { state: 'error' as const, message: 'Failed to fetch events' };
          return { error: await response.text() };
        }

        const data = await response.json();
        const events: GoogleCalendarEvent[] = data.items || [];

        yield { state: 'ready' as const, count: events.length };
        return {
          events: events.map(e => ({
            id: e.id,
            title: e.summary,
            description: e.description,
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            location: e.location,
            attendees: e.attendees?.map(a => a.email),
          })),
        };
      },
    }),

    createCalendarEvent: tool({
      description: 'Create a new event in Google Calendar',
      inputSchema: z.object({
        title: z.string().describe('Event title/summary'),
        description: z.string().optional().describe('Event description'),
        startTime: z.string().describe('Event start time (ISO 8601 format)'),
        endTime: z.string().describe('Event end time (ISO 8601 format)'),
        location: z.string().optional().describe('Event location'),
        attendees: z.array(z.string().email()).optional().describe('List of attendee emails'),
      }),
      async *execute({ title, description, startTime, endTime, location, attendees }) {
        yield { state: 'loading' as const, message: 'Creating calendar event...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Calendar not connected' };
          return { error: 'Google Calendar not connected' };
        }

        const event = {
          summary: title,
          description,
          location,
          start: { dateTime: startTime, timeZone: 'UTC' },
          end: { dateTime: endTime, timeZone: 'UTC' },
          attendees: attendees?.map(email => ({ email })),
        };

        const response = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          yield { state: 'error' as const, message: 'Failed to create event' };
          return { error: await response.text() };
        }

        const created = await response.json();
        yield { state: 'ready' as const, eventId: created.id };
        return {
          success: true,
          eventId: created.id,
          htmlLink: created.htmlLink,
        };
      },
    }),

    deleteCalendarEvent: tool({
      description: 'Delete an event from Google Calendar',
      inputSchema: z.object({
        eventId: z.string().describe('The ID of the event to delete'),
      }),
      async *execute({ eventId }) {
        yield { state: 'loading' as const, message: 'Deleting calendar event...' };

        const token = await getValidGoogleToken(userId);
        if (!token) {
          yield { state: 'error' as const, message: 'Google Calendar not connected' };
          return { error: 'Google Calendar not connected' };
        }

        const response = await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok && response.status !== 204) {
          yield { state: 'error' as const, message: 'Failed to delete event' };
          return { error: await response.text() };
        }

        yield { state: 'ready' as const };
        return { success: true, message: 'Event deleted successfully' };
      },
    }),
  };
}
