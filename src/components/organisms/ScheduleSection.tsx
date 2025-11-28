import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heading } from '@/components/atoms/Heading';
import { DayTabs } from '@/components/molecules/DayTabs';
import { EventItem } from '@/components/molecules/EventItem';
import { useTabs } from '@/hooks/useTabs';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
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
  events: Event[];
}

export interface ScheduleSectionProps {
  title: string;
  subtitle: string;
  aboutLink?: {
    label: string;
    href: string;
  };
  travelNote?: string;
  accommodationNote?: string;
  days: Day[];
}

/**
 * ScheduleSection organism component
 * Two-column layout with title/description on left and tabbed schedule on right
 * Features diagonal transition at bottom to match hero section
 */
export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  title,
  subtitle,
  aboutLink,
  travelNote,
  accommodationNote,
  days,
}) => {
  const { activeTab, setActiveTab } = useTabs(days[0]?.id || '');
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeDay = days.find((day) => day.id === activeTab);

  return (
    <SectionSplitView
      kicker="Schedule"
      title={title}
      subtitle={subtitle}
      link={aboutLink}
      variant="light"
    >
      <DayTabs
        tabs={days.map((day) => ({
          id: day.id,
          label: day.label,
          date: day.date,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab panel with events or TBA description */}
      <AnimatePresence mode="wait">
        {activeDay && (
          <motion.div
            key={activeDay.id}
            role="tabpanel"
            id={`tabpanel-${activeDay.id}`}
            aria-labelledby={`tab-${activeDay.id}`}
            initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="py-2.5"
          >
            {activeDay.tbaMode ? (
              <div className="py-2.5">
                <Heading
                  level="h3"
                  className="text-lg font-bold text-brand-black flex items-center gap-1"
                  variant="light"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Schedule Coming Soon
                </Heading>
                <p className="text-base text-brand-gray-medium leading-relaxed">
                  {activeDay.description || 'Detailed schedule for this day will be announced soon.'}
                </p>
              </div>
            ) : activeDay.events.length > 0 ?
                activeDay.events.map((event, index) => (
                  <EventItem
                    key={`${activeDay.id}-${index}`}
                    time={event.time}
                    title={event.title}
                    description={event.description}
                    index={index}
                  />
                )
            ) : (
              <div className="py-2.5">
                <p className="text-base text-brand-gray-medium leading-relaxed">
                  No events scheduled for this day yet.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Travel and accommodation notes */}
      {(travelNote || accommodationNote) && (
        <div className="mt-8 pt-6 border-t border-brand-gray-light/20 space-y-4">
          {travelNote && (
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              <p className="text-sm text-brand-gray-medium leading-relaxed">
                <span className="font-semibold text-brand-black">Travel tip:</span>{' '}
                {travelNote}
              </p>
            </div>
          )}
          {accommodationNote && (
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-sm text-brand-gray-medium leading-relaxed">
                <span className="font-semibold text-brand-black">Accommodation:</span>{' '}
                {accommodationNote.split(/(hello@zurichjs\.com)/).map((part, i) =>
                  part === 'hello@zurichjs.com' ? (
                    <a
                      key={i}
                      href="mailto:hello@zurichjs.com"
                      className="text-brand-blue hover:underline"
                    >
                      {part}
                    </a>
                  ) : (
                    part
                  )
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </SectionSplitView>
  );
};

