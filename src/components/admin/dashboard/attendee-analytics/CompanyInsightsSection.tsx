/**
 * Company Insights Section
 * AI-enriched company demographics: size distribution and industry sectors
 */

import { Sparkles, Building, Factory, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { AttendeeCompanyInsights } from '@/lib/types/attendee-analytics';

interface CompanyInsightsSectionProps {
  insights: AttendeeCompanyInsights;
}

const SIZE_CONFIG: Record<string, { label: string; description: string; color: string; bgColor: string }> = {
  startup: { label: 'Startup', description: '1-50 employees', color: 'text-green-700', bgColor: 'bg-green-50' },
  scaleup: { label: 'Scale-up', description: '51-500 employees', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  sme: { label: 'SME', description: '501-5,000 employees', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  enterprise: { label: 'Enterprise', description: '5,000+ employees', color: 'text-amber-700', bgColor: 'bg-amber-50' },
};

export function CompanyInsightsSection({ insights }: CompanyInsightsSectionProps) {
  const totalAttendees = Object.values(insights.bySize).reduce((s, n) => s + n, 0);
  const highConfidence = insights.companies.filter((c) => c.confidence === 'high').length;
  const totalCompanies = insights.companies.length;

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-black">Company Insights</h3>
        <Tooltip content="AI-powered classification of attendee companies by size and industry. Weighted by number of attendees per company.">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </Tooltip>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Powered by Claude &middot; {highConfidence}/{totalCompanies} companies classified with high confidence
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Company Size */}
        <div>
          <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500" />
            Attendees by Company Size
          </h4>
          <div className="space-y-3">
            {Object.entries(SIZE_CONFIG).map(([key, config]) => {
              const count = insights.bySize[key] || 0;
              const pct = totalAttendees > 0 ? ((count / totalAttendees) * 100).toFixed(0) : '0';
              return (
                <div key={key} className={`rounded-xl border border-gray-200 p-3 ${config.bgColor}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{config.description}</span>
                    </div>
                    <span className="text-lg font-bold text-black">{count}</span>
                  </div>
                  <div className="text-xs text-gray-500">{pct}% of attendees with company data</div>
                  <div className="mt-1.5 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F1E271] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Industry Sector */}
        <div>
          <h4 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
            <Factory className="w-4 h-4 text-gray-500" />
            Attendees by Industry
          </h4>
          {insights.bySector.length === 0 ? (
            <p className="text-sm text-gray-400">No sector data available</p>
          ) : (
            <div className="space-y-2">
              {insights.bySector.map(({ sector, count }, i) => {
                const maxCount = insights.bySector[0]?.count || 1;
                const pct = totalAttendees > 0 ? ((count / totalAttendees) * 100).toFixed(0) : '0';
                return (
                  <div key={sector} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                    <span className="text-sm text-black flex-1 truncate">{sector}</span>
                    <div className="hidden sm:block w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-amber-300 rounded-full"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-black w-14 text-right">{count} ({pct}%)</span>
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
