import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, ChevronDown } from 'lucide-react';
import type { AttendeeAnalytics } from '@/lib/types/attendee-analytics';
import { SummarySection } from './SummarySection';
import { BreakdownSection } from './BreakdownSection';
import { DemographicsSection } from './DemographicsSection';
import { AcquisitionSection } from './AcquisitionSection';

async function fetchAttendeeAnalytics(): Promise<{ analytics: AttendeeAnalytics }> {
  const res = await fetch('/api/admin/attendee-analytics');
  if (!res.ok) throw new Error('Failed to fetch attendee analytics');
  return res.json();
}

function buildRawContext(analytics: AttendeeAnalytics): string {
  const { summary, byCategory, byStage, demographics, acquisition } = analytics;

  const lines: string[] = [];

  lines.push('=== ZurichJS Conference 2026 - Attendee Analytics ===');
  lines.push('');
  lines.push(`Confirmed attendees: ${summary.confirmedAttendees}`);
  lines.push(`Checked in: ${summary.checkedIn}`);
  lines.push(`Avg ticket price: CHF ${(summary.avgTicketPrice / 100).toFixed(0)}`);
  lines.push(`Companies represented: ${summary.companiesRepresented}`);
  lines.push(`Countries represented: ${summary.countriesRepresented}`);

  lines.push('');
  lines.push('--- By Category ---');
  for (const [key, data] of Object.entries(byCategory).sort(([, a], [, b]) => b.count - a.count)) {
    lines.push(`${key}: ${data.count}`);
  }

  lines.push('');
  lines.push('--- By Pricing Stage ---');
  for (const [key, data] of Object.entries(byStage).sort(([, a], [, b]) => b.count - a.count)) {
    lines.push(`${key}: ${data.count}`);
  }

  lines.push('');
  lines.push('--- Top Companies ---');
  for (const c of demographics.topCompanies) {
    lines.push(`${c.company}: ${c.count} attendees`);
  }
  lines.push(`(${demographics.companyProvided} of ${summary.confirmedAttendees} provided company info)`);

  lines.push('');
  lines.push('--- Top Job Titles ---');
  for (const j of demographics.topJobTitles) {
    lines.push(`${j.jobTitle}: ${j.count}`);
  }
  lines.push(`(${demographics.jobTitleProvided} of ${summary.confirmedAttendees} provided job title)`);

  lines.push('');
  lines.push('--- Top Countries ---');
  for (const c of demographics.topCountries) {
    lines.push(`${c.country}: ${c.count}`);
  }

  lines.push('');
  lines.push('--- Top Cities ---');
  for (const c of demographics.topCities) {
    lines.push(`${c.city}: ${c.count}`);
  }

  lines.push('');
  lines.push('--- Acquisition ---');
  lines.push(`Individual: ${acquisition.byChannel.individual}`);
  lines.push(`B2B / Corporate: ${acquisition.byChannel.b2b}`);
  lines.push(`Complimentary: ${acquisition.byChannel.complimentary}`);
  lines.push(`With coupon: ${acquisition.withCoupon}`);
  lines.push(`From partnerships: ${acquisition.fromPartnerships}`);

  if (acquisition.topCoupons.length > 0) {
    lines.push('');
    lines.push('Top coupons:');
    for (const c of acquisition.topCoupons) {
      lines.push(`  ${c.code}: ${c.count}`);
    }
  }

  lines.push('');
  lines.push('--- Registration Velocity ---');
  lines.push(`This week: ${acquisition.velocity.thisWeek}`);
  lines.push(`This month: ${acquisition.velocity.thisMonth}`);
  lines.push(`Avg per week: ${acquisition.velocity.avgPerWeek}`);

  return lines.join('\n');
}

function buildFullPrompt(analytics: AttendeeAnalytics): string {
  return `I'm organizing ZurichJS Conference 2026 and need to create a compelling sponsor report summarizing our attendee demographics. Please analyze this data and write a professional summary suitable for sharing with current and potential sponsors.

${buildRawContext(analytics)}

Write a sponsor-ready summary (3-5 paragraphs) that:
- Highlights the professional profile of attendees (companies, roles, seniority)
- Emphasizes geographic reach and diversity
- Notes any interesting patterns in the data (e.g., enterprise vs startup mix, popular roles)
- Frames the data positively but honestly
- Includes specific numbers to back up claims
- Is written in a professional but approachable tone`;
}

export function AttendeeAnalyticsTab() {
  const [copiedType, setCopiedType] = useState<'raw' | 'prompt' | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    }
    if (showCopyMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCopyMenu]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'attendee-analytics'],
    queryFn: fetchAttendeeAnalytics,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const analytics = data?.analytics;

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        No attendee analytics data available
      </div>
    );
  }

  const handleCopy = (type: 'raw' | 'prompt') => {
    const text = type === 'raw'
      ? buildRawContext(analytics)
      : buildFullPrompt(analytics);
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setShowCopyMenu(false);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="flex items-center justify-between">
        <div />
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowCopyMenu((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {copiedType ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedType ? 'Copied!' : 'Copy for AI'}
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          {showCopyMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              <button
                onClick={() => handleCopy('raw')}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-black">Raw analytics data</p>
                <p className="text-xs text-gray-500">All metrics as plain text for your own prompt</p>
              </button>
              <button
                onClick={() => handleCopy('prompt')}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <p className="text-sm font-medium text-black">Sponsor report prompt</p>
                <p className="text-xs text-gray-500">Ready-made prompt to generate a sponsor summary</p>
              </button>
            </div>
          )}
        </div>
      </div>

      <SummarySection summary={analytics.summary} />

      <div className="border-t border-gray-100" />

      <BreakdownSection
        byCategory={analytics.byCategory}
        byStage={analytics.byStage}
        totalAttendees={analytics.summary.confirmedAttendees}
      />

      <div className="border-t border-gray-100" />

      <DemographicsSection
        demographics={analytics.demographics}
        totalAttendees={analytics.summary.confirmedAttendees}
      />

      <div className="border-t border-gray-100" />

      <AcquisitionSection
        acquisition={analytics.acquisition}
        totalAttendees={analytics.summary.confirmedAttendees}
      />
    </div>
  );
}
