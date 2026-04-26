/**
 * Funnel Section
 * Visual funnel showing submission flow through statuses
 */

import { ArrowRight, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { CfpFunnelData } from '@/lib/types/cfp-analytics';

interface FunnelSectionProps {
  funnel: CfpFunnelData;
}

const FUNNEL_STAGES: Array<{
  key: keyof CfpFunnelData;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { key: 'draft', label: 'Draft', color: 'text-brand-gray-dark', bgColor: 'bg-text-brand-gray-lightest' },
  { key: 'submitted', label: 'Submitted', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { key: 'under_review', label: 'Under Review', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { key: 'accepted', label: 'Accepted', color: 'text-green-600', bgColor: 'bg-green-50' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-600', bgColor: 'bg-red-50' },
  { key: 'waitlisted', label: 'Waitlisted', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'text-brand-gray-medium', bgColor: 'bg-gray-50' },
];

export function FunnelSection({ funnel }: FunnelSectionProps) {
  const total = Object.values(funnel).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(funnel), 1);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-black">Submission Funnel</h3>
        <Tooltip content="Tracks how submissions progress through each stage, from draft to final decision.">
          <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
        </Tooltip>
      </div>

      {/* Main funnel flow - horizontal on desktop */}
      <div className="hidden lg:flex items-end gap-2 mb-6">
        {FUNNEL_STAGES.map((stage, i) => {
          const count = funnel[stage.key];
          const barHeight = Math.max((count / maxCount) * 160, 8);
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
          return (
            <div key={stage.key} className="flex items-end gap-2">
              <div className="flex flex-col items-center flex-1 min-w-[80px]">
                <span className="text-xl font-bold text-black mb-1">{count}</span>
                <div
                  className={`w-full rounded-t-lg ${stage.bgColor} border border-b-0 border-brand-gray-lightest transition-all`}
                  style={{ height: `${barHeight}px` }}
                />
                <div className={`text-xs font-medium ${stage.color} mt-2 text-center`}>
                  {stage.label}
                </div>
                <div className="text-xs text-brand-gray-medium">{pct}%</div>
              </div>
              {i < FUNNEL_STAGES.length - 1 && (
                <ArrowRight className="w-3 h-3 text-gray-300 mb-8 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile/tablet: stacked view */}
      <div className="lg:hidden space-y-2">
        {FUNNEL_STAGES.map((stage) => {
          const count = funnel[stage.key];
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
          const barWidth = total > 0 ? Math.max((count / maxCount) * 100, 2) : 0;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={`text-xs font-medium ${stage.color} w-20 sm:w-24 text-right shrink-0`}>
                {stage.label}
              </div>
              <div className="flex-1 bg-text-brand-gray-lightest rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stage.bgColor} border border-brand-gray-lightest flex items-center justify-end pr-2 transition-all`}
                  style={{ width: `${barWidth}%` }}
                >
                  {count > 0 && (
                    <span className="text-xs font-semibold text-black">{count}</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-brand-gray-medium w-8 sm:w-10 text-right shrink-0">{pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-4 pt-4 border-t border-text-brand-gray-lightest flex flex-wrap gap-x-4 gap-y-1 sm:gap-6 text-sm">
        <div>
          <span className="text-brand-gray-medium">Total:</span>{' '}
          <span className="font-semibold text-black">{total}</span>
        </div>
        <div>
          <span className="text-brand-gray-medium">Acceptance rate:</span>{' '}
          <span className="font-semibold text-green-600">
            {total > 0 ? ((funnel.accepted / total) * 100).toFixed(1) : '0'}%
          </span>
        </div>
        <div>
          <span className="text-brand-gray-medium">Active (non-draft):</span>{' '}
          <span className="font-semibold text-black">{total - funnel.draft}</span>
        </div>
      </div>
    </section>
  );
}
