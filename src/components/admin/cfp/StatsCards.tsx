/**
 * CFP Stats Cards Component
 * Display submission statistics in a grid
 */

import type { CfpStats } from '@/lib/types/cfp-admin';

interface StatsCardsProps {
  stats?: CfpStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_submissions}</div>
        <div className="text-xs sm:text-sm text-black">Total Submissions</div>
      </div>
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.submissions_by_status?.submitted || 0}</div>
        <div className="text-xs sm:text-sm text-black">Pending Review</div>
      </div>
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.submissions_by_status?.accepted || 0}</div>
        <div className="text-xs sm:text-sm text-black">Accepted</div>
      </div>
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
        <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_reviews}</div>
        <div className="text-xs sm:text-sm text-black">Total Reviews</div>
      </div>
    </div>
  );
}
