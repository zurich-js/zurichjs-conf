import React from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { BellPlus, CalendarPlus, Share2 } from 'lucide-react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';
import { addPublicConferenceToCalendar, addPublicEngineeringDayToCalendar } from '@/lib/calendar/public-events';
import { addPublicSessionToCalendar, getPublicSessionGoogleCalendarUrl } from '@/lib/calendar/public-session';
import { shareNatively } from '@/lib/native-share';
import type { PublicSession } from '@/lib/types/cfp';
import { cn } from '@/lib/utils';

export interface SpeakerSessionCardProps {
  session: PublicSession;
  className?: string;
  id?: string;
}

const LEVEL_LABELS: Record<PublicSession['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function formatTime(time: string | null) {
  if (!time) {
    return null;
  }

  const [hours = '00', minutes = '00'] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function addMinutes(time: string | null, minutesToAdd: number | null) {
  if (!time || !minutesToAdd) {
    return null;
  }

  const [hours = '0', minutes = '0'] = time.split(':');
  const totalMinutes = Number(hours) * 60 + Number(minutes) + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = totalMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function SpeakerSessionCard({
  session,
  className,
  id,
}: SpeakerSessionCardProps) {
  const resolvedId = id ?? `session-${session.id}`;
  const startTime = formatTime(session.schedule?.start_time ?? null);
  const endTime = addMinutes(session.schedule?.start_time ?? null, session.schedule?.duration_minutes ?? null);
  const isWorkshop = session.type === 'workshop';
  const workshopBookingUrl = `/workshops/${session.id}`;
  const speakerDetailUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
  const hasSessionCalendar = Boolean(getPublicSessionGoogleCalendarUrl(session, { speakerDetailUrl }));

  const getSessionShareUrl = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const url = new URL(window.location.href);
    url.hash = resolvedId;
    return url.toString();
  };

  const trackCalendarSelection = (calendar: 'google' | 'outlook' | 'ics', entryType: 'session' | 'conference_day') => {
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
  };

  const handleCardCalendar = (calendar: 'google' | 'outlook' | 'ics') => {
    if (hasSessionCalendar) {
      const added = addPublicSessionToCalendar(session, calendar, { speakerDetailUrl });
      if (added) {
        trackCalendarSelection(calendar, 'session');
      }
      return;
    }

    if (calendar === 'google') {
      const added = addPublicEngineeringDayToCalendar();
      if (added) {
        trackCalendarSelection(calendar, 'conference_day');
      }
    }
  };

  const handleBottomReminder = () => {
    addPublicConferenceToCalendar();
  };

  const handleShare = async () => {
    const shareUrl = getSessionShareUrl();

    if (!shareUrl) {
      return;
    }

    await shareNatively({
      title: session.title,
      text: session.abstract,
      url: shareUrl,
    });
  };

  return (
    <article
      id={resolvedId}
      className={cn(
        'rounded-xl flex flex-col gap-4 p-5 border border-brand-gray-lightest',
        session.type === 'workshop' ? 'bg-brand-gray-lightest' : 'bg-white',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {startTime ? (
            <p className="text-base text-brand-gray-medium">
              {startTime}{endTime ? ` - ${endTime}` : ''}
            </p>
          ) : null}
          <h3 className="mt-3 text-lg font-bold leading-tight text-brand-black">{session.title}</h3>
        </div>

        <Menu as="div" className="relative self-start">
          <MenuButton className="inline-flex items-center gap-2 text-base font-bold text-brand-gray-medium transition-colors hover:text-brand-black">
            <CalendarPlus className="size-4" />
            Add to calendar
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="z-30 mt-2 w-48 rounded-2xl border border-brand-gray-lightest bg-brand-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.14)] outline-none"
          >
            {(['google', 'outlook', 'ics'] as const).map((calendar) => (
              <MenuItem key={calendar}>
                <button
                  type="button"
                  onClick={() => handleCardCalendar(calendar)}
                  className="flex w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-black transition-colors data-[focus]:bg-brand-gray-lightest"
                >
                  {calendar === 'google' ? 'Google Calendar' : calendar === 'outlook' ? 'Outlook' : 'Apple / iCal'}
                </button>
              </MenuItem>
            ))}
          </MenuItems>
        </Menu>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm sm:text-base">
        <span className="text-brand-black">
          <strong>Duration:</strong>{' '}
          <span className="text-brand-gray-medium">{session.schedule?.duration_minutes ? `${session.schedule.duration_minutes} minutes` : 'TBA'}</span>
        </span>
        <strong>&bull;</strong>
        <span>
          <strong>Expertise:</strong> <span className="text-brand-gray-medium">{LEVEL_LABELS[session.level]}</span>
        </span>
        <strong>&bull;</strong>
        <span>
          <strong>Stage:</strong> <span className="text-brand-gray-medium">{session.schedule?.room || 'TBA'}</span>
        </span>
      </div>

      <p className="mt-10 text-lg leading-[1.7] text-brand-gray-darkest">{session.abstract}</p>

      {session.tags.length > 0 ? (
        <div className="mt-10 flex flex-wrap gap-3">
          {session.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-xl bg-brand-white px-3 py-1.5 text-sm font-medium text-brand-gray-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {isWorkshop ? (
        <div className="mt-12 flex flex-col gap-6 border-t border-brand-gray-lightest pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-6 text-lg font-bold text-brand-black">
            <button
              type="button"
              onClick={handleBottomReminder}
              className="inline-flex items-center gap-3 transition-colors hover:text-brand-blue"
            >
              <BellPlus className="size-6" />
              Set a reminder
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-3 transition-colors hover:text-brand-blue"
            >
              <Share2 className="size-6" />
              Share with...
            </button>
          </div>

          <Link
            href={workshopBookingUrl}
            className="inline-flex items-center justify-center rounded-full bg-brand-blue px-7 py-4 text-lg font-bold text-brand-white transition-colors hover:bg-blue-dark"
          >
            Book the workshop
          </Link>
        </div>
      ) : null}
    </article>
  );
}
