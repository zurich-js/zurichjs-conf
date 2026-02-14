/**
 * Insights Tab Component
 * Displays CFP analytics: shortlist status distribution, score buckets, coverage buckets
 */

import { FileText, Star, Users } from 'lucide-react';
import { SHORTLIST_STATUS_LABELS } from '@/lib/cfp/scoring';
import type { CfpInsights } from '@/lib/types/cfp-admin';

interface InsightsTabProps {
  insights: CfpInsights | null;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  likely_shortlisted: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  borderline: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  needs_more_reviews: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  likely_reject: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const SCORE_BUCKET_LABELS: Record<string, string> = {
  '0-1.99': '0 - 1.99',
  '2-2.99': '2 - 2.99',
  '3-3.49': '3 - 3.49',
  '3.5-4': '3.5 - 4.0',
};

const COVERAGE_BUCKET_LABELS: Record<string, string> = {
  '0-24': '0% - 24%',
  '25-49': '25% - 49%',
  '50-74': '50% - 74%',
  '75-100': '75% - 100%',
};

export function InsightsTab({ insights, isLoading }: InsightsTabProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12 text-gray-500">
        No insights data available
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Shortlist Status Distribution */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Shortlist Status Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byStatus).map(([status, count]) => {
            const colors = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
            return (
              <div
                key={status}
                className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}
              >
                <div className="text-3xl font-bold text-black mb-1">{count}</div>
                <div className={`text-sm font-medium ${colors.text}`}>
                  {SHORTLIST_STATUS_LABELS[status as keyof typeof SHORTLIST_STATUS_LABELS] || status}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Score Buckets */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Average Score Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byScoreBucket).map(([bucket, count]) => (
            <div
              key={bucket}
              className="rounded-xl p-4 border border-gray-200 bg-gray-50"
            >
              <div className="text-3xl font-bold text-black mb-1">{count}</div>
              <div className="text-sm font-medium text-gray-600">
                {SCORE_BUCKET_LABELS[bucket] || bucket}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage Buckets */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Review Coverage Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byCoverageBucket).map(([bucket, count]) => (
            <div
              key={bucket}
              className="rounded-xl p-4 border border-gray-200 bg-gray-50"
            >
              <div className="text-3xl font-bold text-black mb-1">{count}</div>
              <div className="text-sm font-medium text-gray-600">
                {COVERAGE_BUCKET_LABELS[bucket] || bucket}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Summary Stats */}
      <section className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p>
            <span className="font-medium text-black">Total submissions analyzed:</span>{' '}
            {Object.values(insights.byStatus).reduce((a, b) => a + b, 0)}
          </p>
        </div>
      </section>
    </div>
  );
}
