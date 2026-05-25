import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {SectionSplitView} from "@/components/organisms/SectionSplitView";

export interface Event {
  time: string;
  title: string;
  description: string;
}

export interface Day {
  id: string;
  label: string;
  date: string;
  description?: string; // General description for TBA mode
  tbaMode?: boolean; // When true, show description instead of detailed events for this day
  defaultSelected?: boolean; // When true, this day will be selected by default
  events: Event[];
}

export interface ScheduleSectionProps {
  title: string;
  subtitle: string;
  aboutLink?: {
    label: string;
    href: string;
  };
  days: Day[];
}

const scheduleDayParams: Record<string, string> = {
  community: 'community',
  warmup: 'workshop',
  conference: 'conf',
  'post-conference': 'post-conf',
};

/**
 * ScheduleSection organism component
 * Compact homepage schedule snapshot linking to the full schedule page.
 */
export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  title,
  subtitle,
  aboutLink,
  days,
}) => {
  return (
    <SectionSplitView
      kicker="Schedule"
      title={title}
      subtitle={subtitle}
      link={aboutLink}
      variant="light"
    >
      <div className="pt-8 xl:pt-0">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4 xl:gap-6">
          {days.map((day) => {
            const dayParam = scheduleDayParams[day.id] ?? 'community';
            const scheduleHref = dayParam === 'community' ? '/schedule' : `/schedule?day=${dayParam}`;

            return (
              <Link
                key={day.id}
                href={scheduleHref}
                className="group relative flex min-h-32 w-full flex-col justify-between gap-4 rounded-lg bg-brand-gray-lightest p-5 pr-11 transition-colors duration-300 hover:bg-brand-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-black focus-visible:ring-offset-2 focus-visible:ring-offset-brand-white"
                aria-label={`View full schedule for ${day.label}`}
              >
                <ArrowRight className="absolute right-5 top-5 h-5 w-5 text-brand-black transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                <span className="sr-only">View full schedule for {day.label}</span>
                <div>
                  <time className="text-sm font-medium text-brand-gray-medium">
                    {day.date}
                  </time>
                  <h3 className="mt-3 text-base font-bold leading-tight text-brand-black">
                    {day.label}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </SectionSplitView>
  );
};
