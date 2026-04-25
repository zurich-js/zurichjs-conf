/**
 * Insights Tab Component
 * Decision-support view: shortlist readiness, score distribution, coverage health, and operational alerts
 */

import { FileText, Star, Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SHORTLIST_STATUS_LABELS } from '@/lib/cfp/scoring';
import type { CfpInsights } from '@/lib/types/cfp-admin';
import type { CfpStats } from '@/lib/types/cfp/admin';

interface InsightsTabProps {
  insights: CfpInsights | null;
  stats?: CfpStats;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; barColor: string }> = {
  likely_shortlisted: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', barColor: 'bg-green-400' },
  borderline: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', barColor: 'bg-yellow-400' },
  needs_more_reviews: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', barColor: 'bg-orange-400' },
  likely_reject: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', barColor: 'bg-red-400' },
};

const SCORE_BUCKET_LABELS: Record<string, string> = {
  '0-1.99': '0 - 1.99',
  '2-2.99': '2 - 2.99',
  '3-3.49': '3 - 3.49',
  '3.5-4': '3.5 - 4.0',
};

const SCORE_BUCKET_COLORS: Record<string, string> = {
  '0-1.99': 'bg-red-300',
  '2-2.99': 'bg-orange-300',
  '3-3.49': 'bg-yellow-300',
  '3.5-4': 'bg-green-300',
};

const COVERAGE_BUCKET_LABELS: Record<string, string> = {
  '0-24': '0% - 24%',
  '25-49': '25% - 49%',
  '50-74': '50% - 74%',
  '75-100': '75% - 100%',
};

const COVERAGE_BUCKET_COLORS: Record<string, string> = {
  '0-24': 'bg-red-300',
  '25-49': 'bg-orange-300',
  '50-74': 'bg-yellow-300',
  '75-100': 'bg-green-300',
};

export function InsightsTab({ insights, stats, isLoading }: InsightsTabProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12 text-brand-gray-medium">
        No insights data available
      </div>
    );
  }

  const totalAnalyzed = Object.values(insights.byStatus).reduce((a, b) => a + b, 0);
  const readyToDecide = insights.byStatus.likely_shortlisted + insights.byStatus.likely_reject;
  const needsWork = insights.byStatus.needs_more_reviews + insights.byStatus.borderline;

  // Operational alerts
  const alerts: Array<{ level: 'warning' | 'info' | 'success'; message: string }> = [];
  if (insights.byStatus.needs_more_reviews > totalAnalyzed * 0.3) {
    alerts.push({ level: 'warning', message: `${insights.byStatus.needs_more_reviews} submissions need more reviews — consider assigning reviewers.` });
  }
  if (insights.byCoverageBucket['0-24'] > totalAnalyzed * 0.2) {
    alerts.push({ level: 'warning', message: `${insights.byCoverageBucket['0-24']} submissions have very low review coverage (<25%).` });
  }
  if (insights.byStatus.likely_shortlisted > 0) {
    alerts.push({ level: 'success', message: `${insights.byStatus.likely_shortlisted} submissions are ready for shortlisting.` });
  }
  if (readyToDecide > totalAnalyzed * 0.5) {
    alerts.push({ level: 'info', message: `${readyToDecide} of ${totalAnalyzed} submissions have enough data for a decision.` });
  }

  return (
    <div className="space-y-8">
      {/* Operational Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start sm:items-center gap-2 sm:gap-3 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm ${
                alert.level === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : alert.level === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {alert.level === 'warning' ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              ) : alert.level === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 flex-shrink-0" />
              )}
              {alert.message}
            </div>
          ))}
        </section>
      )}

      {/* Decision Readiness Summary */}
      <section>
        <h3 className="text-lg font-semibold text-black mb-4">Decision Readiness</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-black">{totalAnalyzed}</div>
            <div className="text-sm text-brand-gray-medium">Total analyzed</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-700">{readyToDecide}</div>
            <div className="text-sm text-green-600">Ready for decision</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-amber-700">{needsWork}</div>
            <div className="text-sm text-amber-600">Needs more data</div>
          </div>
        </div>
        {/* Readiness bar */}
        {totalAnalyzed > 0 && (
          <div className="h-4 bg-text-brand-gray-lightest rounded-full overflow-hidden flex">
            {Object.entries(insights.byStatus).map(([status, count]) => {
              const pct = (count / totalAnalyzed) * 100;
              const colors = STATUS_COLORS[status];
              if (pct === 0 || !colors) return null;
              return (
                <div
                  key={status}
                  className={`h-full ${colors.barColor} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${SHORTLIST_STATUS_LABELS[status as keyof typeof SHORTLIST_STATUS_LABELS]}: ${count} (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-brand-gray-medium">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${colors.barColor}`} />
              {SHORTLIST_STATUS_LABELS[status as keyof typeof SHORTLIST_STATUS_LABELS]}
            </div>
          ))}
        </div>
      </section>

      {/* Shortlist Status Distribution */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Shortlist Status Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byStatus).map(([status, count]) => {
            const colors = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', barColor: 'bg-gray-300' };
            const pct = totalAnalyzed > 0 ? ((count / totalAnalyzed) * 100).toFixed(0) : '0';
            return (
              <div
                key={status}
                className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-bold text-black">{count}</div>
                  <div className="text-sm text-gray-400">{pct}%</div>
                </div>
                <div className={`text-sm font-medium ${colors.text} mt-1`}>
                  {SHORTLIST_STATUS_LABELS[status as keyof typeof SHORTLIST_STATUS_LABELS] || status}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Score Distribution */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Average Score Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byScoreBucket).map(([bucket, count]) => {
            const barColor = SCORE_BUCKET_COLORS[bucket] || 'bg-gray-300';
            const maxBucket = Math.max(...Object.values(insights.byScoreBucket), 1);
            return (
              <div
                key={bucket}
                className="rounded-xl p-4 border border-gray-200 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-bold text-black mb-1">{count}</div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  {SCORE_BUCKET_LABELS[bucket] || bucket}
                </div>
                <div className="h-2 bg-text-brand-gray-lightest rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${(count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coverage Distribution */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">Review Coverage Distribution</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(insights.byCoverageBucket).map(([bucket, count]) => {
            const barColor = COVERAGE_BUCKET_COLORS[bucket] || 'bg-gray-300';
            const maxBucket = Math.max(...Object.values(insights.byCoverageBucket), 1);
            return (
              <div
                key={bucket}
                className="rounded-xl p-4 border border-gray-200 bg-white"
              >
                <div className="text-2xl sm:text-3xl font-bold text-black mb-1">{count}</div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  {COVERAGE_BUCKET_LABELS[bucket] || bucket}
                </div>
                <div className="h-2 bg-text-brand-gray-lightest rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${(count / maxBucket) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Summary */}
      <section className="pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-3 sm:gap-6 text-sm text-gray-600">
          <div>
            <span className="font-medium text-black">Total submissions analyzed:</span>{' '}
            {totalAnalyzed}
          </div>
          {stats && (
            <>
              <div>
                <span className="font-medium text-black">Avg reviews/submission:</span>{' '}
                {stats.avg_reviews_per_submission?.toFixed(1) || '-'}
              </div>
              <div>
                <span className="font-medium text-black">Active reviewers (7d):</span>{' '}
                {stats.active_reviewers_7d ?? '-'}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
