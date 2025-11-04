import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { LinkText } from '@/components/atoms/LinkText';
import { DayTabs } from '@/components/molecules/DayTabs';
import { EventItem } from '@/components/molecules/EventItem';
import { useTabs } from '@/hooks/useTabs';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface Event {
  time: string;
  title: string;
  description: string;
}

export interface Day {
  id: string;
  label: string;
  date: string;
  events: Event[];
}

export interface ScheduleSectionProps {
  title: string;
  subtitle: string;
  aboutLink: {
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
    <section className="relative bg-white">
      {/* Main content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 lg:pt-16 pb-16 md:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.75fr] gap-8 lg:gap-12 xl:gap-16">
          {/* Left column: Title and description */}
          <div className="flex flex-col justify-start lg:max-w-md">
            <Kicker variant="light" className="mb-4">
              SCHEDULE
            </Kicker>
            
            <Heading
              level="h2"
              variant="light"
              className="text-3xl md:text-4xl lg:text-4xl mb-4"
            >
              {title}
            </Heading>
            
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-6">
              {subtitle}
            </p>
            
            <div>
              <LinkText href={aboutLink.href} animate>
                {aboutLink.label}
              </LinkText>
            </div>
          </div>

          {/* Right column: Tabbed schedule */}
          <div>
            <DayTabs
              tabs={days.map((day) => ({
                id: day.id,
                label: day.label,
                date: day.date,
              }))}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Tab panel with events */}
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
                  className="mt-4"
                >
                  {activeDay.events.length > 0 ? (
                    <div>
                      {activeDay.events.map((event, index) => (
                        <EventItem
                          key={`${activeDay.id}-${index}`}
                          time={event.time}
                          title={event.title}
                          description={event.description}
                          index={index}
                          isLast={index === activeDay.events.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500">
                      No events scheduled for this day yet.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </section>
  );
};

