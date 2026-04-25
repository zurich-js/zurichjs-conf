/**
 * Logistics Section
 * Travel assistance, airports, and special requirements
 */

import { Plane, Hotel, AlertCircle, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
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
        <Plane className="w-5 h-5 text-brand-gray-dark" />
        <h3 className="text-lg font-semibold text-black">Travel &amp; Logistics</h3>
        <Tooltip content="Travel assistance needs, top departure airports, and special requirements from speakers.">
          <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Assistance summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-brand-gray-lightest bg-white p-4">
            <div className="text-2xl sm:text-3xl font-bold text-black">{travelAssistanceNeeded}</div>
            <div className="text-sm text-brand-gray-medium">
              speakers need travel assistance ({travelPct}%)
            </div>
          </div>

          {/* Assistance type breakdown */}
          <div className="rounded-xl border border-brand-gray-lightest bg-white p-4 space-y-3">
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
            <p className="text-sm text-brand-gray-medium">No airport data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topAirports.map(({ airport, count }) => (
                <div key={airport} className="flex items-center gap-3 rounded-lg border border-text-brand-gray-lightest bg-gray-50 px-3 py-2.5">
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-mono font-bold text-blue-800 border border-blue-200 flex-shrink-0">
                    {airportCode(airport)}
                  </span>
                  <span className="text-sm text-brand-gray-dark flex-1 truncate">{airportLabel(airport)}</span>
                  <span className="text-sm font-semibold text-black tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Parse "AMS - AMSTERDAM, NETHERLANDS" into { code: "AMS", label: "Amsterdam, Netherlands" } */
function parseAirport(raw: string): { code: string; label: string } {
  const dashIdx = raw.indexOf(' - ');
  if (dashIdx > 0) {
    const code = raw.slice(0, dashIdx).trim();
    const rest = raw.slice(dashIdx + 3).trim();
    // Title-case the label
    const label = rest
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { code, label };
  }
  return { code: raw, label: '' };
}

function airportLabel(raw: string): string {
  const { label } = parseAirport(raw);
  return label;
}

function airportCode(raw: string): string {
  const { code } = parseAirport(raw);
  return code;
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
        <span className="text-sm text-brand-gray-dark">{label}</span>
      </div>
      <span className="text-sm font-semibold text-black">{count}</span>
    </div>
  );
}
