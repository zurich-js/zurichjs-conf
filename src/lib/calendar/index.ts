/**
 * Calendar Utilities
 * Generates calendar events and .ics files for ticket holders
 */

import { createEvents, type EventAttributes } from 'ics';
import { getBaseUrl } from '@/lib/url';

export interface ConferenceEventData {
  ticketHolderName: string;
  ticketHolderEmail: string;
  eventName: string;
  eventDescription?: string;
  venueName: string;
  venueAddress: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Generate an .ics calendar file for the conference
 */
export function generateCalendarEvent(data: ConferenceEventData): {
  success: boolean;
  icsContent?: string;
  error?: string;
} {
  try {
    const event: EventAttributes = {
      start: [
        data.startDate.getFullYear(),
        data.startDate.getMonth() + 1,
        data.startDate.getDate(),
        data.startDate.getHours(),
        data.startDate.getMinutes(),
      ],
      end: [
        data.endDate.getFullYear(),
        data.endDate.getMonth() + 1,
        data.endDate.getDate(),
        data.endDate.getHours(),
        data.endDate.getMinutes(),
      ],
      title: data.eventName,
      description: data.eventDescription || `You're registered for ${data.eventName}!`,
      location: `${data.venueName}, ${data.venueAddress}`,
      url: getBaseUrl(),
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: {
        name: 'ZurichJS Conference',
        email: 'hello@zurichjs.com',
      },
      attendees: [
        {
          name: data.ticketHolderName,
          email: data.ticketHolderEmail,
          rsvp: true,
        },
      ],
      alarms: [
        {
          action: 'display',
          description: `${data.eventName} starts in 1 day`,
          trigger: { hours: 24, minutes: 0, before: true },
        },
        {
          action: 'display',
          description: `${data.eventName} starts in 1 hour`,
          trigger: { hours: 1, minutes: 0, before: true },
        },
      ],
    };

    const { error, value } = createEvents([event]);

    if (error) {
      console.error('[Calendar] Error generating calendar event:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate calendar event',
      };
    }

    return {
      success: true,
      icsContent: value,
    };
  } catch (error) {
    console.error('[Calendar] Error generating calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a calendar download URL (base64 data URL)
 */
export function generateCalendarDataUrl(icsContent: string): string {
  const base64 = Buffer.from(icsContent).toString('base64');
  return `data:text/calendar;base64,${base64}`;
}

/**
 * Generate venue-specific calendar data for ZurichJS Conference 2026
 */
export function generateZurichJSConferenceCalendar(
  ticketHolderName: string,
  ticketHolderEmail: string
): { success: boolean; icsContent?: string; error?: string } {
  return generateCalendarEvent({
    ticketHolderName,
    ticketHolderEmail,
    eventName: 'ZurichJS Conference 2026',
    eventDescription:
      'Join us for the premier JavaScript conference in Zurich. Connect with industry leaders, learn about cutting-edge technologies, and network with fellow developers.',
    venueName: 'Technopark Zürich',
    venueAddress: 'Technoparkstrasse 1, 8005 Zürich, Switzerland',
    startDate: new Date('2026-09-11T09:00:00+02:00'), // 9 AM CEST
    endDate: new Date('2026-09-11T17:00:00+02:00'), // 5 PM CEST
  });
}
