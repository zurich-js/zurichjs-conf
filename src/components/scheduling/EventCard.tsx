import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ScheduleCard } from './ScheduleCard';
import { formatTimeRange } from './utils';

export interface EventCardLink {
  label: string;
  href: string;
}

export interface EventCardProps {
  id?: string;
  title: string;
  description?: string | null;
  startTime: string;
  durationMinutes: number;
  className?: string;
  /** Extra content (links, RSVP buttons) rendered inside the expandable panel below the description. */
  actions?: ReactNode;
  /** Quiet external link rendered on the card's trailing edge (e.g. "Info and RSVP"). */
  link?: EventCardLink;
}

export function EventCard({ id, title, description, startTime, durationMinutes, className, actions, link }: EventCardProps) {
  const hasPanel = Boolean(description) || Boolean(actions);

  return (
    <ScheduleCard
      id={id}
      className={cn('rounded-2xl px-3 py-2', className)}
      expandable={hasPanel}
      trailing={link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-gray-medium underline underline-offset-4 hover:text-brand-black"
        >
          {link.label}
        </a>
      ) : undefined}
      header={(
        <>
          <p className="text-sm text-brand-gray-medium">{formatTimeRange(startTime, durationMinutes)}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{title}</h3>
        </>
      )}
      panel={hasPanel ? (
        <>
          {description ? <p className="text-sm leading-7 text-brand-gray-darkest">{description}</p> : null}
          {actions ? <div className={cn(description && 'mt-4')}>{actions}</div> : null}
        </>
      ) : undefined}
    />
  );
}
