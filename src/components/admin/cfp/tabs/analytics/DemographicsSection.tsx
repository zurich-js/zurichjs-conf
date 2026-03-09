/**
 * Demographics Section
 * Speaker demographics, geography, and company distribution
 */

import { Users, MapPin, Building2, Handshake } from 'lucide-react';
import type { CfpDemographics } from '@/lib/types/cfp-analytics';

interface DemographicsSectionProps {
  demographics: CfpDemographics;
}

export function DemographicsSection({ demographics }: DemographicsSectionProps) {
  const {
    totalSpeakers,
    profileComplete,
    profileIncomplete,
    topCountries,
    topCompanies,
    sponsorInterestCount,
    avgSubmissionsPerSpeaker,
    multiSubmissionSpeakers,
  } = demographics;

  const completionPct = totalSpeakers > 0 ? ((profileComplete / totalSpeakers) * 100).toFixed(0) : '0';

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-black">Speaker Demographics</h3>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Speakers" value={totalSpeakers} />
        <MetricCard
          label="Profile Complete"
          value={`${completionPct}%`}
          subtitle={`${profileComplete} of ${totalSpeakers}`}
          valueColor={Number(completionPct) > 70 ? 'text-green-600' : 'text-amber-600'}
        />
        <MetricCard
          label="Avg Submissions"
          value={avgSubmissionsPerSpeaker.toFixed(1)}
          subtitle={`${multiSubmissionSpeakers} multi-submitters`}
        />
        <MetricCard
          label="Sponsor Interest"
          value={sponsorInterestCount}
          subtitle="companies open to sponsoring"
          icon={<Handshake className="w-4 h-4 text-amber-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-black">Top Countries</h4>
          </div>
          {topCountries.length === 0 ? (
            <p className="text-sm text-gray-400">No country data available</p>
          ) : (
            <div className="space-y-2">
              {topCountries.map(({ country, count }, i) => {
                const maxCount = topCountries[0]?.count || 1;
                return (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                    <span className="text-sm text-black flex-1 truncate">{country}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-300 rounded-full"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-black w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Companies */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-black">Top Companies</h4>
          </div>
          {topCompanies.length === 0 ? (
            <p className="text-sm text-gray-400">No company data available</p>
          ) : (
            <div className="space-y-2">
              {topCompanies.map(({ company, count }, i) => {
                const maxCount = topCompanies[0]?.count || 1;
                return (
                  <div key={company} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                    <span className="text-sm text-black flex-1 truncate">{company}</span>
                    <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-300 rounded-full"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-black w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Profile completeness bar */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Profile Completeness</span>
          <span className="text-sm font-medium text-black">{profileComplete} complete / {profileIncomplete} incomplete</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  valueColor = 'text-black',
  icon,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}
