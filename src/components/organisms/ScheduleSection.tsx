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
    </SectionSplitView>
  );
};

