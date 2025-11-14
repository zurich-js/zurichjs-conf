import React, { useCallback, useRef, useEffect, useState } from 'react';
import { TimelineIconType } from '@/components/molecules/TimelineDot';
import { TimelineCard, TimelineTag } from '@/components/molecules/TimelineCard';
import { useMotion } from '@/contexts/MotionContext';
import {SectionSplitView} from "@/components/organisms/SectionSplitView";

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
  subtitle?: string;
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
  subtitle,
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
    <SectionSplitView
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      variant="dark"
    >
      <div className="lg:col-span-8 relative pt-8">
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
                      className={`relative flex items-start gap-4 flex-col sm:flex-row sm:gap-6 ${entryIndex > 0 ? 'mt-6' : ''}`}
                    >
                      {/* Date Column - Only show for first entry in group */}
                      <div className="flex-shrink-0 w-28 pt-1">
                        {isFirstInGroup && (
                          <time
                            dateTime={entry.dateISO}
                            className="text-sm text-brand-gray-medium font-medium"
                          >
                            {formatDate(entry.dateISO)}
                          </time>
                        )}
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
                          icon={entry.icon}
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
    </SectionSplitView>
  );
};

