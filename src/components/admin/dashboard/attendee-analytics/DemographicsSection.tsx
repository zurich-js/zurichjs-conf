/**
 * Demographics Section
 * Attendee demographics: companies, roles, geography
 */

import { Building2, Briefcase, MapPin, Map, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { AttendeeDemographics } from '@/lib/types/attendee-analytics';

interface DemographicsSectionProps {
  demographics: AttendeeDemographics;
  totalAttendees: number;
}

export function DemographicsSection({ demographics, totalAttendees }: DemographicsSectionProps) {
  const companyPct = totalAttendees > 0
    ? ((demographics.companyProvided / totalAttendees) * 100).toFixed(0)
    : '0';
  const jobTitlePct = totalAttendees > 0
    ? ((demographics.jobTitleProvided / totalAttendees) * 100).toFixed(0)
    : '0';

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Attendee Demographics</h3>
        <Tooltip content="Company, role, and geographic distribution of confirmed attendees. Useful for sponsor reports.">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
        </Tooltip>
      </div>

      {/* Data completeness bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Company data</span>
            <span className="text-sm font-medium text-black">{demographics.companyProvided} of {totalAttendees} ({companyPct}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${companyPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Job title data</span>
            <span className="text-sm font-medium text-black">{demographics.jobTitleProvided} of {totalAttendees} ({jobTitlePct}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${jobTitlePct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Companies */}
        <RankedList
          icon={<Building2 className="w-4 h-4 text-gray-500" />}
          title="Top Companies"
          items={demographics.topCompanies.map((c) => ({ label: c.company, count: c.count }))}
          barColor="bg-indigo-300"
          emptyText="No company data available"
        />

        {/* Job Titles */}
        <RankedList
          icon={<Briefcase className="w-4 h-4 text-gray-500" />}
          title="Top Roles / Job Titles"
          items={demographics.topJobTitles.map((j) => ({ label: j.jobTitle, count: j.count }))}
          barColor="bg-purple-300"
          emptyText="No job title data available"
        />

        {/* Countries */}
        <RankedList
          icon={<MapPin className="w-4 h-4 text-gray-500" />}
          title="Top Countries"
          items={demographics.topCountries.map((c) => ({ label: c.country, count: c.count }))}
          barColor="bg-blue-300"
          emptyText="No country data available"
        />

        {/* Cities */}
        <RankedList
          icon={<Map className="w-4 h-4 text-gray-500" />}
          title="Top Cities"
          items={demographics.topCities.map((c) => ({ label: c.city, count: c.count }))}
          barColor="bg-teal-300"
          emptyText="No city data available"
        />
      </div>
    </section>
  );
}

function RankedList({
  icon,
  title,
  items,
  barColor,
  emptyText,
}: {
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; count: number }>;
  barColor: string;
  emptyText: string;
}) {
  const maxCount = items[0]?.count || 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-semibold text-black">{title}</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map(({ label, count }, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
              <span className="text-sm text-black flex-1 truncate">{label}</span>
              <div className="hidden sm:block w-16 sm:w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-black w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
