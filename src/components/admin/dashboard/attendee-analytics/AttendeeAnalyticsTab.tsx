/**
 * Attendee Analytics Tab
 * Comprehensive attendee analytics dashboard for conference organizers and sponsor reporting
 */

import { useQuery } from '@tanstack/react-query';
import type { AttendeeAnalytics } from '@/lib/types/attendee-analytics';
import { SummarySection } from './SummarySection';
import { BreakdownSection } from './BreakdownSection';
import { DemographicsSection } from './DemographicsSection';
import { AcquisitionSection } from './AcquisitionSection';

async function fetchAttendeeAnalytics(): Promise<{ analytics: AttendeeAnalytics }> {
  const res = await fetch('/api/admin/attendee-analytics');
  if (!res.ok) throw new Error('Failed to fetch attendee analytics');
  return res.json();
}

export function AttendeeAnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'attendee-analytics'],
    queryFn: fetchAttendeeAnalytics,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const analytics = data?.analytics;

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        No attendee analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <SummarySection summary={analytics.summary} />

      <div className="border-t border-gray-100" />

      <BreakdownSection
        byCategory={analytics.byCategory}
        byStage={analytics.byStage}
        totalAttendees={analytics.summary.confirmedAttendees}
      />

      <div className="border-t border-gray-100" />

      <DemographicsSection
        demographics={analytics.demographics}
        totalAttendees={analytics.summary.confirmedAttendees}
      />

      <div className="border-t border-gray-100" />

      <AcquisitionSection
        acquisition={analytics.acquisition}
        totalAttendees={analytics.summary.confirmedAttendees}
      />
    </div>
  );
}
