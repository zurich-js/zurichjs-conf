import { analytics } from '@/lib/analytics';
import { addPublicConferenceToCalendar, addPublicEngineeringDayToCalendar } from '@/lib/calendar/public-events';
import { addPublicSessionToCalendar, getPublicSessionGoogleCalendarUrl } from '@/lib/calendar/public-session';
import { shareNatively } from '@/lib/native-share';
import type { PublicSession } from '@/lib/types/cfp';

interface SessionScheduleOverride {
  date?: string | null;
  start_time?: string | null;
  duration_minutes?: number | null;
  room?: string | null;
}

export type SessionCalendarProvider = 'google' | 'outlook' | 'ics';

export function getCurrentSessionDetailUrl() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${window.location.pathname}`;
}

export function getSessionShareUrl(resolvedId?: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);

  if (resolvedId) {
    url.hash = resolvedId;
  }

  return url.toString();
}

export function hasSessionCalendar(session: PublicSession, speakerDetailUrl?: string) {
  return Boolean(getPublicSessionGoogleCalendarUrl(session, { speakerDetailUrl }));
}

export function trackCalendarSelection(
  session: PublicSession,
  calendar: SessionCalendarProvider,
  entryType: 'session' | 'conference_day'
) {
  try {
    analytics.getInstance().capture('speaker_calendar_added', {
      calendar_provider: calendar,
      entry_type: entryType,
      session_id: session.id,
      session_title: session.title,
      session_type: session.type,
    });
  } catch {
    // Ignore analytics failures.
  }
}

/**
 * Merge an optional schedule override into the session so the generated
 * calendar payload reflects the latest workshop scheduling (room, date, time,
 * duration) set by the admin, even if the CFP submission mirror is stale.
 */
function applyScheduleOverride(
  session: PublicSession,
  override?: SessionScheduleOverride
): PublicSession {
  if (!override) return session;
  const hasOverride =
    override.date || override.start_time || override.duration_minutes || override.room;
  if (!hasOverride) return session;

  return {
    ...session,
    schedule: {
      date: override.date ?? session.schedule?.date ?? null,
      start_time: override.start_time ?? session.schedule?.start_time ?? null,
      duration_minutes: override.duration_minutes ?? session.schedule?.duration_minutes ?? null,
      room: override.room ?? session.schedule?.room ?? null,
    },
  };
}

export function addSessionOrEngineeringDayToCalendar(
  session: PublicSession,
  calendar: SessionCalendarProvider,
  speakerDetailUrl?: string,
  scheduleOverride?: SessionScheduleOverride
) {
  const effective = applyScheduleOverride(session, scheduleOverride);

  if (hasSessionCalendar(effective, speakerDetailUrl)) {
    const added = addPublicSessionToCalendar(effective, calendar, { speakerDetailUrl });
    if (added) {
      trackCalendarSelection(effective, calendar, 'session');
    }
    return;
  }

  if (calendar === 'google') {
    const added = addPublicEngineeringDayToCalendar();
    if (added) {
      trackCalendarSelection(effective, calendar, 'conference_day');
    }
  }
}

/**
 * "Set a reminder" — encodes the specific session (title, room, timing) into
 * the calendar entry when scheduling info is available, otherwise falls back
 * to a generic conference reminder.
 */
export function addConferenceReminder(
  session?: PublicSession,
  scheduleOverride?: SessionScheduleOverride
) {
  if (session) {
    const effective = applyScheduleOverride(session, scheduleOverride);
    if (hasSessionCalendar(effective)) {
      const added = addPublicSessionToCalendar(effective, 'google');
      if (added) {
        trackCalendarSelection(effective, 'google', 'session');
        return;
      }
    }
  }
  addPublicConferenceToCalendar();
}

export async function shareSession(session: PublicSession, resolvedId?: string) {
  const shareUrl = getSessionShareUrl(resolvedId);

  if (!shareUrl) {
    return;
  }

  await shareNatively({
    title: session.title,
    text: session.abstract,
    url: shareUrl,
  });
}
