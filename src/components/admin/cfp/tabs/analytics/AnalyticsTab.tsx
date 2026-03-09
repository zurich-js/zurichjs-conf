/**
 * Analytics Tab
 * Comprehensive CFP analytics dashboard for conference organizers
 */

import type { CfpAnalytics } from '@/lib/types/cfp-analytics';
import { FunnelSection } from './FunnelSection';
import { BreakdownSection } from './BreakdownSection';
import { DemographicsSection } from './DemographicsSection';
import { LogisticsSection } from './LogisticsSection';
import { ReviewActivitySection } from './ReviewActivitySection';
import { TagsSection } from './TagsSection';

interface AnalyticsTabProps {
  analytics: CfpAnalytics | null;
  isLoading: boolean;
}

export function AnalyticsTab({ analytics, isLoading }: AnalyticsTabProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <FunnelSection funnel={analytics.funnel} />

      <div className="border-t border-gray-100" />

      <BreakdownSection byType={analytics.byType} byLevel={analytics.byLevel} />

      <div className="border-t border-gray-100" />

      <DemographicsSection demographics={analytics.demographics} />

      <div className="border-t border-gray-100" />

      <LogisticsSection
        logistics={analytics.logistics}
        totalSpeakers={analytics.demographics.totalSpeakers}
      />

      <div className="border-t border-gray-100" />

      <ReviewActivitySection
        reviewActivity={analytics.reviewActivity}
        timeline={analytics.submissionTimeline}
      />

      {analytics.topTags.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <TagsSection topTags={analytics.topTags} />
        </>
      )}
    </div>
  );
}
