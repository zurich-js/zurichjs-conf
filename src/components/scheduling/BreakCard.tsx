import { cn } from '@/lib/utils';
import { formatTimeRange } from './utils';

export interface BreakCardProps {
  id?: string;
  title: string;
  description?: string | null;
  startTime: string;
  durationMinutes: number;
  className?: string;
}

export function BreakCard({ id, title, description, startTime, durationMinutes, className }: BreakCardProps) {
  return (
    <article
      id={id}
      className={cn('rounded-[1.25rem] border border-brand-gray-lightest bg-brand-gray-lightest px-5 py-5', className)}
    >
      <p className="text-sm text-brand-gray-medium">{formatTimeRange(startTime, durationMinutes)}</p>
      <h3 className="mt-1 text-lg font-bold leading-tight text-brand-black">{title}</h3>
      {description ? <p className="mt-4 text-sm leading-7 text-brand-gray-darkest">{description}</p> : null}
    </article>
  );
}
