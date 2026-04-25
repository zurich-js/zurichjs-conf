/**
 * Review Activity Section
 * Review metrics, score distribution, and activity timeline
 */

import { BarChart3, Clock, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { CfpReviewActivity, CfpTimelineEntry } from '@/lib/types/cfp-analytics';

interface ReviewActivitySectionProps {
  reviewActivity: CfpReviewActivity;
  timeline: CfpTimelineEntry[];
}

export function ReviewActivitySection({ reviewActivity, timeline }: ReviewActivitySectionProps) {
  const { totalReviews, avgScore, scoreDistribution, reviewsPerDay, avgReviewsPerSubmission, unreviewed } = reviewActivity;

  const maxScoreCount = Math.max(...scoreDistribution.map((d) => d.count), 1);
  const maxDayCount = Math.max(...reviewsPerDay.map((d) => d.count), 1);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Review Activity</h3>
        <Tooltip content="How active reviewers are — score distribution, reviews per day, and coverage metrics.">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-black">{totalReviews}</div>
          <div className="text-xs text-brand-gray-medium">Total reviews</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-black">{avgScore !== null ? avgScore.toFixed(2) : '-'}</div>
          <div className="text-xs text-brand-gray-medium">Avg score</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-black">{avgReviewsPerSubmission.toFixed(1)}</div>
          <div className="text-xs text-brand-gray-medium">Avg reviews / submission</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className={`text-2xl font-bold ${unreviewed > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {unreviewed}
          </div>
          <div className="text-xs text-brand-gray-medium">Unreviewed submissions</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Score distribution */}
        <div>
          <h4 className="text-sm font-semibold text-black mb-3">Score Distribution</h4>
          <div className="space-y-1.5">
            {scoreDistribution.map(({ range, count }) => (
              <div key={range} className="flex items-center gap-3">
                <span className="text-xs text-brand-gray-medium w-12 text-right font-mono">{range}</span>
                <div className="flex-1 bg-text-brand-gray-lightest rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${maxScoreCount > 0 ? (count / maxScoreCount) * 100 : 0}%` }}
                  >
                    {count > 0 && <span className="text-xs font-semibold text-black">{count}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews per day (last 30 days) - sparkline style */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-brand-gray-medium" />
            <h4 className="text-sm font-semibold text-black">Reviews / Day (Last 30 Days)</h4>
          </div>
          <div className="flex items-end gap-px h-16 sm:h-24 overflow-hidden">
            {reviewsPerDay.map(({ date, count }) => (
              <div
                key={date}
                className="flex-1 min-w-0 bg-blue-200 hover:bg-blue-400 rounded-t transition-colors cursor-default group relative"
                style={{ height: `${maxDayCount > 0 ? Math.max((count / maxDayCount) * 100, 2) : 2}%` }}
                title={`${date}: ${count} review${count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{reviewsPerDay[0]?.date?.slice(5) || ''}</span>
            <span>{reviewsPerDay[reviewsPerDay.length - 1]?.date?.slice(5) || ''}</span>
          </div>
        </div>
      </div>

      {/* Submission timeline */}
      {timeline.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-1.5 mb-3">
            <h4 className="text-sm font-semibold text-black">Submission Timeline (Cumulative)</h4>
            <Tooltip content="Each bar shows the total number of submissions received up to that date. Rising bars indicate new submissions; flat sections mean quiet periods.">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-end gap-px h-16 sm:h-20 overflow-hidden">
            {timeline.map(({ date, cumulative }) => {
              const maxCumulative = timeline[timeline.length - 1]?.cumulative || 1;
              return (
                <div
                  key={date}
                  className="flex-1 min-w-0 bg-green-200 hover:bg-green-400 rounded-t transition-colors cursor-default"
                  style={{ height: `${(cumulative / maxCumulative) * 100}%` }}
                  title={`${date}: ${cumulative} total submissions`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{timeline[0]?.date?.slice(5) || ''}</span>
            <span>{timeline[timeline.length - 1]?.date?.slice(5) || ''} ({timeline[timeline.length - 1]?.cumulative || 0})</span>
          </div>
        </div>
      )}
    </section>
  );
}
