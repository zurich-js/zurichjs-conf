/**
 * Logistics Section
 * Travel assistance, airports, and special requirements
 */

import { Plane, Hotel, AlertCircle } from 'lucide-react';
import type { CfpLogistics } from '@/lib/types/cfp-analytics';

interface LogisticsSectionProps {
  logistics: CfpLogistics;
  totalSpeakers: number;
}

export function LogisticsSection({ logistics, totalSpeakers }: LogisticsSectionProps) {
  const { travelAssistanceNeeded, assistanceBreakdown, topAirports, specialRequirementsCount } = logistics;
  const travelPct = totalSpeakers > 0 ? ((travelAssistanceNeeded / totalSpeakers) * 100).toFixed(0) : '0';

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Plane className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Travel &amp; Logistics</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assistance summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-3xl font-bold text-black">{travelAssistanceNeeded}</div>
            <div className="text-sm text-gray-500">
              speakers need travel assistance ({travelPct}%)
            </div>
          </div>

          {/* Assistance type breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <h4 className="text-sm font-semibold text-black">Assistance Type</h4>
            <AssistanceRow
              icon={<Plane className="w-4 h-4 text-blue-500" />}
              label="Travel only"
              count={assistanceBreakdown.travel}
            />
            <AssistanceRow
              icon={<Hotel className="w-4 h-4 text-purple-500" />}
              label="Accommodation only"
              count={assistanceBreakdown.accommodation}
            />
            <AssistanceRow
              icon={<div className="flex"><Plane className="w-3 h-3 text-blue-500" /><Hotel className="w-3 h-3 text-purple-500" /></div>}
              label="Both"
              count={assistanceBreakdown.both}
            />
          </div>

          {specialRequirementsCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  {specialRequirementsCount} speaker{specialRequirementsCount !== 1 ? 's' : ''} with special requirements
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Departure airports */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-semibold text-black mb-3">Departure Airports</h4>
          {topAirports.length === 0 ? (
            <p className="text-sm text-gray-400">No airport data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topAirports.map(({ airport, count }) => {
                const maxCount = topAirports[0]?.count || 1;
                const barWidth = (count / maxCount) * 100;
                return (
                  <div key={airport} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm font-mono font-semibold text-black w-12">{airport}</span>
                    <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-300 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-black w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AssistanceRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-black">{count}</span>
    </div>
  );
}
