/**
 * Summary Section
 * High-level attendee metrics cards
 */

import { Users, Ticket, DollarSign, Building2, MapPin, UserCheck } from 'lucide-react';
import type { AttendeeSummary } from '@/lib/types/attendee-analytics';

interface SummarySectionProps {
  summary: AttendeeSummary;
}

function formatCurrency(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString('en-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function SummarySection({ summary }: SummarySectionProps) {
  const checkInRate = summary.confirmedAttendees > 0
    ? ((summary.checkedIn / summary.confirmedAttendees) * 100).toFixed(0)
    : '0';

  return (
    <section>
      <h3 className="text-lg font-semibold text-black mb-4">Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          icon={<Users className="w-4 h-4 text-blue-500" />}
          label="Total Attendees"
          value={summary.totalAttendees}
          subtitle={`${summary.confirmedAttendees} confirmed`}
        />
        <MetricCard
          icon={<UserCheck className="w-4 h-4 text-green-500" />}
          label="Checked In"
          value={summary.checkedIn}
          subtitle={`${checkInRate}% check-in rate`}
          valueColor={summary.checkedIn > 0 ? 'text-green-600' : undefined}
        />
        <MetricCard
          icon={<DollarSign className="w-4 h-4 text-amber-500" />}
          label="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          subtitle={`Avg ${formatCurrency(summary.avgTicketPrice)}/ticket`}
        />
        <MetricCard
          icon={<Ticket className="w-4 h-4 text-purple-500" />}
          label="Avg Ticket Price"
          value={formatCurrency(summary.avgTicketPrice)}
        />
        <MetricCard
          icon={<Building2 className="w-4 h-4 text-indigo-500" />}
          label="Companies"
          value={summary.companiesRepresented}
          subtitle="unique companies"
        />
        <MetricCard
          icon={<MapPin className="w-4 h-4 text-red-500" />}
          label="Countries"
          value={summary.countriesRepresented}
          subtitle="unique countries"
        />
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  valueColor = 'text-black',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
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
