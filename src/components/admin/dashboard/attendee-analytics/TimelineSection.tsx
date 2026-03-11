/**
 * Timeline Section
 * Registration timeline showing cumulative attendee growth
 */

import { TrendingUp, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { AttendeeTimelineEntry } from '@/lib/types/attendee-analytics';

interface TimelineSectionProps {
  timeline: AttendeeTimelineEntry[];
}

export function TimelineSection({ timeline }: TimelineSectionProps) {
  if (timeline.length === 0) {
    return null;
  }

  const maxDaily = Math.max(...timeline.map((d) => d.count), 1);
  const totalCumulative = timeline[timeline.length - 1]?.cumulative || 0;

  // Show at most 60 bars to keep it readable
  const displayTimeline = timeline.length > 60
    ? timeline.slice(-60)
    : timeline;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Registration Timeline</h3>
        <Tooltip content="Daily new registrations with cumulative growth. Shows confirmed ticket purchases over time.">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Cumulative summary */}
      <div className="flex flex-wrap gap-4 sm:gap-6 text-sm mb-4">
        <div>
          <span className="text-gray-500">Total confirmed:</span>{' '}
          <span className="font-semibold text-black">{totalCumulative}</span>
        </div>
        <div>
          <span className="text-gray-500">First sale:</span>{' '}
          <span className="font-semibold text-black">{timeline[0]?.date}</span>
        </div>
        <div>
          <span className="text-gray-500">Latest:</span>{' '}
          <span className="font-semibold text-black">{timeline[timeline.length - 1]?.date}</span>
        </div>
      </div>

      {/* Sparkline-style bar chart */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-end gap-px h-32">
          {displayTimeline.map((entry) => {
            const barHeight = Math.max((entry.count / maxDaily) * 100, 2);
            return (
              <div
                key={entry.date}
                className="flex-1 min-w-[2px] group relative"
              >
                <div
                  className="w-full bg-[#F1E271] hover:bg-[#e6d45a] rounded-t transition-colors"
                  style={{ height: `${barHeight}%` }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {entry.date}: {entry.count} new ({entry.cumulative} total)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{displayTimeline[0]?.date}</span>
          <span>{displayTimeline[displayTimeline.length - 1]?.date}</span>
        </div>
      </div>
    </section>
  );
}
