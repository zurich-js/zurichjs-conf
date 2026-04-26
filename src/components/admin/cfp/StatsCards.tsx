/**
 * CFP Stats Cards Component
 * Display submission statistics in a grid
 */

import { AdminOverviewCards } from '@/components/admin/common';
import type { CfpStats } from '@/lib/types/cfp-admin';

interface StatsCardsProps {
  stats?: CfpStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  return (
    <AdminOverviewCards
      items={[
        { label: 'Total Submissions', value: stats.total_submissions },
        { label: 'Pending Review', value: stats.submissions_by_status?.submitted || 0, valueClassName: 'text-blue-600' },
        { label: 'Accepted', value: stats.submissions_by_status?.accepted || 0, valueClassName: 'text-green-600' },
        { label: 'Total Reviews', value: stats.total_reviews },
        { label: 'Active Reviewers (7d)', value: stats.active_reviewers_7d ?? 0, valueClassName: 'text-purple-600' },
      ]}
      columnsClassName="grid-cols-2 md:grid-cols-5"
    />
  );
}
