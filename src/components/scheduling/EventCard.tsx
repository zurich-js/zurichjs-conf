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
}

export function EventCard({ id, title, description, startTime, durationMinutes, className }: EventCardProps) {
  return (
    <ScheduleCard
      id={id}
      className={cn('rounded-[1.25rem] px-3 py-2', className)}
      expandable={Boolean(description)}
      header={(
        <>
          <p className="text-sm text-brand-gray-medium">{formatTimeRange(startTime, durationMinutes)}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{title}</h3>
        </>
      )}
      panel={description ? <p className="text-sm leading-7 text-brand-gray-darkest">{description}</p> : undefined}
    />
  );
}
