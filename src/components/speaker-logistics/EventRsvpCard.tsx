/**
 * Event RSVP Card
 * One speaker-week event: title, date/time, description, yes/no RSVP, and
 * conditional follow-up fields (dietary, plus one) passed as children
 */

import React from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import type { SpeakerLogisticsEvent } from '@/data/speaker-logistics-events';
import { YesNoChoice } from './YesNoChoice';

export interface EventRsvpCardProps {
  event: SpeakerLogisticsEvent;
  value: boolean | null;
  error?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  /** Conditional follow-up fields, rendered when attending */
  children?: React.ReactNode;
}

export function EventRsvpCard({ event, value, error, disabled, onChange, children }: EventRsvpCardProps) {
  return (
    <section className="bg-black rounded-2xl p-6 md:p-8" aria-labelledby={`${event.field}-title`}>
      <h2 id={`${event.field}-title`} className="text-xl font-bold text-brand-primary">
        {event.title}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" aria-hidden="true" />
          <time dateTime={event.isoDate}>{event.date}</time>
        </span>
        {event.time && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden="true" />
            {event.time}
          </span>
        )}
      </div>
      <p className="mt-3 text-gray-200 text-sm leading-relaxed">{event.description}</p>

      <div className="mt-5">
        <YesNoChoice
          name={event.field}
          legend={`Will you attend the ${event.title.toLowerCase()}?`}
          value={value}
          error={error}
          disabled={disabled}
          onChange={onChange}
        />
      </div>

      {value === true && children ? <div className="mt-6 space-y-5">{children}</div> : null}
    </section>
  );
}
