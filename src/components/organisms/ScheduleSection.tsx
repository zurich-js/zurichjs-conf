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
  description?: string; // General description for TBA mode
  tbaMode?: boolean; // When true, show description instead of detailed events for this day
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
          <div className="w-full min-w-0">
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
                  className="mt-4"
                >
                  {activeDay.tbaMode ? (
                    // TBA Mode: Show general day description
                    <div className="bg-surface-card rounded-2xl px-6 py-8 md:px-8 md:py-10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
                          <svg 
                            className="w-6 h-6 text-brand-primary" 
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
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">
                            Schedule Coming Soon
                          </h3>
                          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                            {activeDay.description || 'Detailed schedule for this day will be announced soon.'}
                          </p>
                          <div className="inline-flex items-center px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                            <span className="text-sm font-medium text-brand-primary">
                              Full schedule to be announced
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : activeDay.events.length > 0 ? (
                    // Regular Mode: Show detailed events
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
                    // Fallback: No events
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

