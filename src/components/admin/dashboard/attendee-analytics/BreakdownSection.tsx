/**
 * Breakdown Section
 * Ticket breakdown by category and stage
 */

import { Ticket, Clock, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';

interface BreakdownSectionProps {
  byCategory: Record<string, { count: number; revenue: number }>;
  byStage: Record<string, { count: number; revenue: number }>;
  totalAttendees: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  standard: { label: 'Standard', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  vip: { label: 'VIP', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  student: { label: 'Student', color: 'text-green-700', bgColor: 'bg-green-50' },
  unemployed: { label: 'Unemployed', color: 'text-amber-700', bgColor: 'bg-amber-50' },
};

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  blind_bird: { label: 'Blind Bird', color: 'text-pink-700', bgColor: 'bg-pink-50' },
  early_bird: { label: 'Early Bird', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  general_admission: { label: 'General Admission', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  late_bird: { label: 'Late Bird', color: 'text-gray-700', bgColor: 'bg-gray-50' },
};

function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString('en-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BreakdownSection({ byCategory, byStage, totalAttendees }: BreakdownSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
      {/* By Category */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">By Category</h3>
          <Tooltip content="Breakdown of confirmed attendees by ticket category.">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
          </Tooltip>
        </div>
        <div className="space-y-3">
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([key, data]) => {
              const config = CATEGORY_CONFIG[key] || { label: key, color: 'text-gray-700', bgColor: 'bg-gray-50' };
              const pct = totalAttendees > 0 ? ((data.count / totalAttendees) * 100).toFixed(0) : '0';
              return (
                <div key={key} className={`rounded-xl border border-gray-200 p-4 ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-2xl font-bold text-black">{data.count}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <span>{pct}% of attendees</span>
                    <span>{formatCHF(data.revenue)} revenue</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F1E271] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* By Stage */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-black">By Pricing Stage</h3>
          <Tooltip content="Breakdown of confirmed attendees by when they purchased their ticket.">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
          </Tooltip>
        </div>
        <div className="space-y-3">
          {Object.entries(byStage)
            .sort(([, a], [, b]) => b.count - a.count)
            .map(([key, data]) => {
              const config = STAGE_CONFIG[key] || { label: key, color: 'text-gray-700', bgColor: 'bg-gray-50' };
              const pct = totalAttendees > 0 ? ((data.count / totalAttendees) * 100).toFixed(0) : '0';
              return (
                <div key={key} className={`rounded-xl border border-gray-200 p-4 ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-2xl font-bold text-black">{data.count}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                    <span>{pct}% of attendees</span>
                    <span>{formatCHF(data.revenue)} revenue</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F1E271] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
