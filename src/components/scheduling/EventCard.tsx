import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ScheduleCard } from './ScheduleCard';
import { formatTimeRange } from './utils';

export interface EventCardProps {
  id?: string;
  title: string;
  description?: string | null;
  startTime: string;
  durationMinutes: number;
  className?: string;
  /** Extra content (links, RSVP buttons) rendered inside the expandable panel below the description. */
  actions?: ReactNode;
}

export function EventCard({ id, title, description, startTime, durationMinutes, className, actions }: EventCardProps) {
  const hasPanel = Boolean(description) || Boolean(actions);

  return (
    <ScheduleCard
      id={id}
      className={cn('rounded-2xl px-3 py-2', className)}
      expandable={hasPanel}
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
