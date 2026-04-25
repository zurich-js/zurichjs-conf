/**
 * Breakdown Section
 * Submission breakdowns by type and level with acceptance rates
 */

import { Mic, GraduationCap, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { CfpTypeBreakdown, CfpLevelBreakdown } from '@/lib/types/cfp-analytics';

interface BreakdownSectionProps {
  byType: CfpTypeBreakdown;
  byLevel: CfpLevelBreakdown;
}

const TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  lightning: { label: 'Lightning Talk', emoji: '⚡' },
  standard: { label: 'Standard Talk', emoji: '🎤' },
  workshop: { label: 'Workshop', emoji: '🛠' },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  beginner: { label: 'Beginner', color: 'text-green-700', bgColor: 'bg-green-50' },
  intermediate: { label: 'Intermediate', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  advanced: { label: 'Advanced', color: 'text-purple-700', bgColor: 'bg-purple-50' },
};

function formatScore(score: number | null): string {
  if (score === null) return '-';
  return score.toFixed(2);
}

export function BreakdownSection({ byType, byLevel }: BreakdownSectionProps) {
  const totalByType = Object.values(byType).reduce((s, v) => s + v.total, 0);
  const totalByLevel = Object.values(byLevel).reduce((s, v) => s + v.total, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
      {/* By Type */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-5 h-5 text-brand-gray-dark" />
          <h3 className="text-lg font-semibold text-black">By Talk Type</h3>
          <Tooltip content="Breakdown of submissions and acceptance rates by talk format (lightning, standard, workshop).">
            <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
          </Tooltip>
        </div>
        <div className="space-y-3">
          {(Object.entries(byType) as Array<[string, { total: number; accepted: number; avgScore: number | null }]>).map(
            ([key, data]) => {
              const config = TYPE_CONFIG[key] || { label: key, emoji: '' };
              const pct = totalByType > 0 ? ((data.total / totalByType) * 100).toFixed(0) : '0';
              const acceptRate = data.total > 0 ? ((data.accepted / data.total) * 100).toFixed(0) : '0';
              return (
                <div key={key} className="rounded-xl border border-brand-gray-lightest p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.emoji}</span>
                      <span className="font-medium text-black">{config.label}</span>
                    </div>
                    <span className="text-2xl font-bold text-black">{data.total}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-brand-gray-medium">
                    <span>{pct}% of total</span>
                    <span className="text-green-600">{data.accepted} accepted ({acceptRate}%)</span>
                    <span>Avg score: {formatScore(data.avgScore)}</span>
                  </div>
                  {/* Mini bar */}
                  <div className="mt-2 h-1.5 bg-text-brand-gray-lightest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* By Level */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-brand-gray-dark" />
          <h3 className="text-lg font-semibold text-black">By Talk Level</h3>
          <Tooltip content="Breakdown by audience level — shows acceptance rate and average review score per level.">
            <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
          </Tooltip>
        </div>
        <div className="space-y-3">
          {(Object.entries(byLevel) as Array<[string, { total: number; accepted: number; avgScore: number | null }]>).map(
            ([key, data]) => {
              const config = LEVEL_CONFIG[key] || { label: key, color: 'text-gray-700', bgColor: 'bg-gray-50' };
              const pct = totalByLevel > 0 ? ((data.total / totalByLevel) * 100).toFixed(0) : '0';
              const acceptRate = data.total > 0 ? ((data.accepted / data.total) * 100).toFixed(0) : '0';
              return (
                <div key={key} className={`rounded-xl border border-brand-gray-lightest p-4 ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-2xl font-bold text-black">{data.total}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-brand-gray-medium">
                    <span>{pct}% of total</span>
                    <span className="text-green-600">{data.accepted} accepted ({acceptRate}%)</span>
                    <span>Avg score: {formatScore(data.avgScore)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
