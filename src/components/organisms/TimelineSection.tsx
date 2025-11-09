import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Kicker } from '@/components/atoms/Kicker';
import { Heading } from '@/components/atoms/Heading';
import { Subtext } from '@/components/atoms/Subtext';
import { Separator } from '@/components/atoms/Separator';
import { TimelineDot, TimelineIconType } from '@/components/molecules/TimelineDot';
import { TimelineCard, TimelineTag } from '@/components/molecules/TimelineCard';
import { useMotion } from '@/contexts/MotionContext';

export interface TimelineEntry {
  id: string;
  dateISO: string;
  title: string;
  icon?: TimelineIconType;
  body?: string;
  tags?: TimelineTag[];
  href?: string;
  emphasis?: boolean;
}

export interface TimelineSectionProps {
  kicker?: string;
  title: string;
  copy?: string;
  entries: TimelineEntry[];
  startAtId?: string;
}

/**
 * TimelineSection component displaying a vertical timeline with events
 * Features keyboard navigation, auto-highlighting of upcoming events, and smooth animations
 */
export const TimelineSection: React.FC<TimelineSectionProps> = ({
  kicker = 'TIMELINE',
  title,
  copy,
  entries,
  startAtId,
}) => {
  const { shouldAnimate } = useMotion();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  // Sort entries by date and group by date
  const sortedEntries = React.useMemo(() => {
    return [...entries].sort((a, b) =>
      new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()
    );
  }, [entries]);

  // Group entries by date
  const groupedEntries = React.useMemo(() => {
    const groups: Array<{ date: string; entries: TimelineEntry[] }> = [];

    sortedEntries.forEach((entry) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === entry.dateISO) {
        lastGroup.entries.push(entry);
      } else {
        groups.push({ date: entry.dateISO, entries: [entry] });
      }
    });

    return groups;
  }, [sortedEntries]);

  // Find the next upcoming entry based on today's date
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEntry = sortedEntries.find(entry => {
      const entryDate = new Date(entry.dateISO);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= today;
    });

    if (upcomingEntry) {
      setCurrentEntryId(upcomingEntry.id);
    }
  }, [sortedEntries]);

  // Scroll to initial entry if specified
  useEffect(() => {
    if (startAtId) {
      const element = cardRefs.current.get(startAtId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }
  }, [startAtId]);

  // Format date for display
  const formatDate = (dateISO: string): string => {
    const date = new Date(dateISO);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number, entry: TimelineEntry) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(index + 1, sortedEntries.length - 1);
        const nextEntry = sortedEntries[nextIndex];
        const nextElement = cardRefs.current.get(nextEntry.id);
        if (nextElement) {
          nextElement.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        const prevEntry = sortedEntries[prevIndex];
        const prevElement = cardRefs.current.get(prevEntry.id);
        if (prevElement) {
          prevElement.focus();
        }
      } else if (e.key === 'Enter' && entry.href) {
        e.preventDefault();
        window.location.href = entry.href;
      }
    },
    [sortedEntries]
  );

  // Handle card click
  const handleCardClick = useCallback((href?: string) => {
    if (href) {
      window.location.href = href;
    }
  }, []);

  return (
    <section
      className="relative bg-surface-section text-slate-200 overflow-hidden"
      aria-label="Timeline"
    >
      {/* Top Diagonal Separator */}
      <Separator variant="diagonal-top" fill="#19191B" />

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left Column - Text Content */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              {shouldAnimate ? (
                <>
                  <Kicker animate delay={0.1}>
                    {kicker}
                  </Kicker>
                  <Heading
                    level="h2"
                    className="text-4xl md:text-5xl lg:text-6xl mt-4 mb-6"
                    animate
                    delay={0.2}
                  >
                    {title}
                  </Heading>
                  {copy && (
                    <Subtext animate delay={0.3}>
                      {copy}
                    </Subtext>
                  )}
                </>
              ) : (
                <>
                  <Kicker>{kicker}</Kicker>
                  <Heading
                    level="h2"
                    className="text-4xl md:text-5xl lg:text-6xl mt-4 mb-6"
                  >
                    {title}
                  </Heading>
                  {copy && <Subtext>{copy}</Subtext>}
                </>
              )}
            </div>
          </div>

          {/* Right Column - Timeline */}
          <div className="lg:col-span-8 relative">
            {/* Timeline Rail */}
            <div
              className="absolute left-[122px] sm:left-[146px] top-0 bottom-0 w-px bg-[rgba(255,255,255,0.08)]"
              aria-hidden="true"
            />

            {/* Timeline Items */}
            <div className="space-y-6">
              {groupedEntries.map((group) => {
                const allEntriesIndex = sortedEntries.findIndex(e => e.id === group.entries[0].id);

                return (
                  <div key={`group-${group.date}`} className="relative">
                    {group.entries.map((entry, entryIndex) => {
                      const isCurrent = entry.id === currentEntryId;
                      const index = allEntriesIndex + entryIndex;
                      const delay = shouldAnimate ? 0.4 + index * 0.06 : 0;
                      const isFirstInGroup = entryIndex === 0;

                      return (
                        <div
                          key={entry.id}
                          className={`relative flex items-start gap-4 sm:gap-6 ${entryIndex > 0 ? 'mt-6' : ''}`}
                        >
                          {/* Date Column - Only show for first entry in group */}
                          <div className="flex-shrink-0 w-20 sm:w-24 pt-1">
                            {isFirstInGroup && (
                              <time
                                dateTime={entry.dateISO}
                                className="text-sm text-slate-400 font-medium"
                              >
                                {formatDate(entry.dateISO)}
                              </time>
                            )}
                          </div>

                          {/* Timeline Dot */}
                          <div className="flex-shrink-0 relative z-10">
                            <TimelineDot
                              icon={entry.icon}
                              emphasis={entry.emphasis}
                              isCurrent={isCurrent}
                              delay={delay}
                            />
                          </div>

                          {/* Timeline Card */}
                          <div className="flex-1 min-w-0">
                            <TimelineCard
                              ref={(el) => {
                                if (el) {
                                  cardRefs.current.set(entry.id, el);
                                } else {
                                  cardRefs.current.delete(entry.id);
                                }
                              }}
                              title={entry.title}
                              dateISO={entry.dateISO}
                              dateFormatted={formatDate(entry.dateISO)}
                              body={entry.body}
                              tags={entry.tags}
                              href={entry.href}
                              emphasis={entry.emphasis}
                              isCurrent={isCurrent}
                              delay={delay}
                              showDate={false}
                              onClick={() => handleCardClick(entry.href)}
                              onKeyDown={(e) => handleKeyDown(e, index, entry)}
                              tabIndex={0}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

