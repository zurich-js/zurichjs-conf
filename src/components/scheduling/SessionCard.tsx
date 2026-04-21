import Image from 'next/image';
import Link from 'next/link';
import { BellPlus, CalendarPlus, Share2 } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Button } from '@/components/atoms';
import type { PublicSession } from '@/lib/types/cfp';
import { cn } from '@/lib/utils';
import { ScheduleCard } from './ScheduleCard';
import {
  addConferenceReminder,
  addSessionOrEngineeringDayToCalendar,
  getCurrentSessionDetailUrl,
  shareSession,
  type SessionCalendarProvider,
} from './session-actions';
import { formatDuration, formatTimeRange } from './utils';

type SessionCardSpeaker = {
  name: string;
  role?: string | null;
  imageUrl?: string | null;
  slug?: string | null;
  participantRole?: string | null;
};

export interface SessionCardProps {
  session: PublicSession;
  speaker?: SessionCardSpeaker;
  speakers?: SessionCardSpeaker[];
  expandable?: boolean;
  defaultOpen?: boolean;
  href?: string;
  className?: string;
  id?: string;
  showDuration?: boolean;
  actionMode?: 'schedule' | 'detail';
}

const LEVEL_LABELS: Record<PublicSession['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function SessionCard({
  session,
  speaker,
  speakers,
  expandable = false,
  defaultOpen = false,
  href,
  className,
  id,
  showDuration = false,
  actionMode = 'schedule',
}: SessionCardProps) {
  const resolvedId = id ?? `session-${session.id}`;
  const timeRange = formatTimeRange(session.schedule?.start_time, session.schedule?.duration_minutes);
  const durationLabel = formatDuration(session.schedule?.duration_minutes);
  const isWorkshop = session.type === 'workshop';
  const isPanel = session.type === 'panel';
  const resolvedSpeakers: SessionCardSpeaker[] = speakers && speakers.length > 0 ? speakers : speaker ? [speaker] : session.speakers;
  const speakerDetailUrl = getCurrentSessionDetailUrl();

  const handleCardCalendar = (calendar: SessionCalendarProvider) => {
    addSessionOrEngineeringDayToCalendar(session, calendar, speakerDetailUrl);
  };

  const handleBottomReminder = () => {
    addConferenceReminder();
  };

  const handleShare = async () => {
    await shareSession(session, resolvedId);
  };

  const header = (
    <>
      {timeRange ? <p className="text-sm text-brand-gray-medium">{timeRange}</p> : null}
      <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{session.title}</h3>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-black">
        {resolvedSpeakers.length > 0 ? (
          <span>
            <strong>{isWorkshop ? 'Instructor:' : isPanel ? 'Panel:' : 'Speaker:'}</strong>{' '}
            <span className="text-brand-gray-medium">{resolvedSpeakers.map((entry) => entry.name).join(', ')}</span>
          </span>
        ) : null}
        {resolvedSpeakers.length > 0 ? <span className="text-brand-gray-medium">&bull;</span> : null}
        <span>
          <strong>Expertise:</strong>{' '}
          <span className="text-brand-gray-medium">{LEVEL_LABELS[session.level]}</span>
        </span>
        {showDuration && durationLabel ? <span className="text-brand-gray-medium">&bull;</span> : null}
        {showDuration && durationLabel ? (
          <span>
            <strong>Duration:</strong>{' '}
            <span className="text-brand-gray-medium">{durationLabel}</span>
          </span>
        ) : null}
      </div>
    </>
  );

  const renderSpeakerContent = (entry: SessionCardSpeaker) => (
    <>
      {entry.imageUrl ? (
        <div className="relative size-11 overflow-hidden rounded-full">
          <Image src={entry.imageUrl} alt={entry.name} fill className="object-cover" sizes="44px" />
        </div>
      ) : (
        <div className="flex size-11 items-center justify-center rounded-full bg-brand-black text-sm font-bold text-brand-white">
          {entry.name.charAt(0)}
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-brand-black">{entry.name}</p>
        {entry.role ? <p className="text-xs text-brand-gray-medium">{entry.role}</p> : null}
        {entry.participantRole && isPanel ? <p className="text-xs font-semibold capitalize text-brand-blue">{entry.participantRole}</p> : null}
      </div>
    </>
  );

  const panel = (
    <>
      <p className="text-sm leading-7 text-brand-gray-darkest">{session.abstract}</p>

      {resolvedSpeakers.length > 0 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {resolvedSpeakers.map((entry) => entry.slug ? (
          <Link
            key={entry.slug}
            href={`/speakers/${entry.slug}`}
            className="flex w-fit items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          >
            {renderSpeakerContent(entry)}
          </Link>
        ) : (
          <div key={entry.name} className="flex items-center gap-3">{renderSpeakerContent(entry)}</div>
        ))}
        </div>
      ) : null}
    </>
  );

  const footer = actionMode === 'detail' ? (
    <div className="flex flex-col gap-4 border-t border-brand-gray-lightest pt-6 md:flex-row md:items-center md:gap-6">
      {isWorkshop ? (
        <Button variant="ghost" onClick={handleBottomReminder} forceDark>
          <BellPlus className="size-6" />
          Add a reminder
        </Button>
      ) : null}

      <Button variant="ghost" onClick={handleShare} forceDark>
        <Share2 className="size-6" />
        Share with...
      </Button>
    </div>
  ) : expandable ? (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <Button variant="ghost" size="sm" onClick={handleBottomReminder} forceDark>
          <BellPlus className="size-4" />
          Set a reminder
        </Button>

        <Button variant="ghost" size="sm" onClick={handleShare} forceDark>
          <Share2 className="size-4" />
          Share with...
        </Button>
      </div>

      {href ? (
        <Button variant={isWorkshop ? 'blue' : 'primary'} size="sm" asChild href={href}>
          See details
        </Button>
      ) : null}
    </div>
  ) : isWorkshop ? (
    <div className="flex flex-col-reverse gap-6 border-t border-brand-gray-lightest md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col items-start gap-4 pt-6 md:flex-row md:items-center md:gap-6">
        <Button variant="ghost" onClick={handleBottomReminder} forceDark>
          <BellPlus className="size-6" />
          Set a reminder
        </Button>

        <Button variant="ghost" onClick={handleShare} forceDark>
          <Share2 className="size-6" />
          Share with...
        </Button>
      </div>

      {href ? (
        <div className="pt-6">
          <Button variant="blue" asChild href={href}>
            See details
          </Button>
        </div>
      ) : null}
    </div>
  ) : null;

  const trailing = !expandable && (actionMode !== 'detail' || !isWorkshop) ? (
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
  ) : null;

  return (
    <ScheduleCard
      id={resolvedId}
      className={cn(
        'rounded-[1.25rem] border p-5',
        isWorkshop || isPanel ? 'border-brand-gray-lightest bg-brand-gray-lightest' : 'border-brand-gray-light bg-brand-white',
        className
      )}
      expandable={expandable}
      defaultOpen={defaultOpen}
      header={header}
      panel={panel}
      footer={footer}
      trailing={trailing}
    />
  );
}
