import React from 'react';
import Image from 'next/image';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellPlus, CalendarPlus, ChevronDown, Share2 } from 'lucide-react';
import { Button } from '@/components/atoms';
import { analytics } from '@/lib/analytics';
import { addPublicConferenceToCalendar, addPublicEngineeringDayToCalendar } from '@/lib/calendar/public-events';
import { addPublicSessionToCalendar, getPublicSessionGoogleCalendarUrl } from '@/lib/calendar/public-session';
import { shareNatively } from '@/lib/native-share';
import type { PublicSession } from '@/lib/types/cfp';
import { cn } from '@/lib/utils';

export interface SessionCardProps {
  session: PublicSession;
  speaker?: {
    name: string;
    role?: string | null;
    imageUrl?: string | null;
  };
  expandable?: boolean;
  defaultOpen?: boolean;
  href?: string;
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

export function SessionCard({
  session,
  speaker,
  expandable = false,
  defaultOpen = false,
  href,
  className,
  id,
}: SessionCardProps) {
  const resolvedId = id ?? `session-${session.id}`;
  const startTime = formatTime(session.schedule?.start_time ?? null);
  const endTime = addMinutes(session.schedule?.start_time ?? null, session.schedule?.duration_minutes ?? null);
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

  if (expandable) {
    return (
      <Disclosure
        as="article"
        defaultOpen={defaultOpen}
        id={resolvedId}
        className={cn('rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest p-5', className)}
      >
        {({ open }) => (
          <>
            <div className="flex items-start justify-between gap-4">
              <DisclosureButton className="min-w-0 flex-1 text-left cursor-pointer">
                {startTime ? (
                  <p className="text-sm text-brand-gray-medium">
                    {startTime}{endTime ? ` - ${endTime}` : ''}
                  </p>
                ) : null}
                <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{session.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-black">
                  {speaker ? (
                    <span>
                      <strong>{session.type === 'workshop' ? 'Instructor:' : 'Speaker:'}</strong>{' '}
                      <span className="text-brand-gray-medium">{speaker.name}</span>
                    </span>
                  ) : null}
                  {speaker ? <span className="text-brand-gray-medium">&bull;</span> : null}
                  <span>
                    <strong>Expertise:</strong> <span className="text-brand-gray-medium">{LEVEL_LABELS[session.level]}</span>
                  </span>
                </div>
              </DisclosureButton>

              <DisclosureButton className="flex size-10 shrink-0 items-center justify-center rounded-full text-brand-black transition-colors hover:bg-brand-white cursor-pointer">
                <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
              </DisclosureButton>
            </div>

            <AnimatePresence initial={false}>
              {open ? (
                <DisclosurePanel static as={React.Fragment}>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5">
                      <p className="text-sm leading-7 text-brand-gray-darkest">{session.abstract}</p>

                      {speaker ? (
                        <div className="mt-5 flex items-center gap-3">
                          {speaker.imageUrl ? (
                            <div className="relative size-11 overflow-hidden rounded-full">
                              <Image src={speaker.imageUrl} alt={speaker.name} fill className="object-cover" sizes="44px" />
                            </div>
                          ) : (
                            <div className="flex size-11 items-center justify-center rounded-full bg-brand-black text-sm font-bold text-brand-white">
                              {speaker.name.charAt(0)}
                            </div>
                          )}

                          <div>
                            <p className="text-sm font-semibold text-brand-black">{speaker.name}</p>
                            {speaker.role ? <p className="text-xs text-brand-gray-medium">{speaker.role}</p> : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleBottomReminder}
                            forceDark
                          >
                            <BellPlus className="size-4" />
                            Set a reminder
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            forceDark
                          >
                            <Share2 className="size-4" />
                            Share with...
                          </Button>
                        </div>

                        {href ? (
                          <Button
                            variant={session.type === 'workshop' ? 'blue' : 'primary'}
                            size="sm"
                            asChild
                            href={href}
                          >
                            See details
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                </DisclosurePanel>
              ) : null}
            </AnimatePresence>
          </>
        )}
      </Disclosure>
    );
  }

  return (
    <article
      id={resolvedId}
      className={cn(
        'rounded-xl flex flex-col gap-8 p-5 border border-brand-gray-lightest',
        session.type === 'workshop' ? 'bg-brand-gray-lightest' : 'bg-white',
        className
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {startTime ? (
              <p className="text-base text-brand-gray-medium">
                {startTime}{endTime ? ` - ${endTime}` : ''}
              </p>
            ) : null}
            <h3 className="text-lg font-bold leading-tight text-brand-black">{session.title}</h3>
          </div>

          <Menu as="div" className="relative self-start">
            <MenuButton className="inline-flex items-center gap-2 text-base font-bold text-brand-gray-medium transition-colors hover:text-brand-black cursor-pointer">
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
      </div>

      <p className="text-md leading-[1.7] text-brand-gray-darkest">{session.abstract}</p>

      {session.tags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
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

      {session.type === 'workshop' ? (
        <div className="flex flex-col-reverse gap-6 border-t border-brand-gray-lightest md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row items-center gap-6 text-lg font-bold text-brand-black">
            <Button
              variant="ghost"
              onClick={handleBottomReminder}
              forceDark
            >
              <BellPlus className="size-6" />
              Set a reminder
            </Button>

            <Button
              variant="ghost"
              onClick={handleShare}
              forceDark
            >
              <Share2 className="size-6" />
              Share with...
            </Button>
          </div>

          {href ? (
            <Button
              variant="blue"
              asChild
              href={href}
            >
              Book the workshop
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
