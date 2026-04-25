/**
 * Summary strip rendered above the workshop list.
 * Four stat cards: total offerings, published count, seats sold, gross revenue.
 * Mobile: 2-column grid. Desktop: 4-column.
 */

import { CalendarCheck, Coins, GraduationCap, Users } from 'lucide-react';
import type { AdminWorkshopListItem } from '@/pages/api/admin/workshops';

interface WorkshopsSummaryStripProps {
  items: AdminWorkshopListItem[];
}

export function WorkshopsSummaryStrip({ items }: WorkshopsSummaryStripProps) {
  const totalOfferings = items.filter((i) => Boolean(i.offering)).length;
  const publishedCount = items.filter((i) => i.offering?.status === 'published').length;
  const totalRegistrations = items.reduce((sum, i) => sum + (i.registrantCount ?? 0), 0);

  const revenueByCurrency = new Map<string, number>();
  for (const item of items) {
    for (const rev of item.revenueByCurrency ?? []) {
      revenueByCurrency.set(rev.currency, (revenueByCurrency.get(rev.currency) ?? 0) + rev.grossCents);
    }
  }
  const revenueEntries = Array.from(revenueByCurrency.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      <SummaryCard
        label="Offerings"
        value={totalOfferings.toString()}
        icon={<GraduationCap className="size-4 text-brand-gray-medium" />}
        sublabel={`${items.length - totalOfferings} unlinked`}
      />
      <SummaryCard
        label="Published"
        value={publishedCount.toString()}
        icon={<CalendarCheck className="size-4 text-green-600" />}
        sublabel={`${Math.max(0, totalOfferings - publishedCount)} draft`}
      />
      <SummaryCard
        label="Seats sold"
        value={totalRegistrations.toString()}
        icon={<Users className="size-4 text-blue-600" />}
      />
      <SummaryCard
        label="Gross revenue"
        value={
          revenueEntries.length === 0
            ? '—'
            : revenueEntries
                .map(([cur, cents]) => `${(cents / 100).toFixed(0)} ${cur}`)
                .join(' · ')
        }
        icon={<Coins className="size-4 text-amber-600" />}
        compact
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  sublabel,
  compact = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sublabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-gray-lightest bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-gray-medium">
          {label}
        </span>
        {icon}
      </div>
      <div
        className={`mt-2 font-bold text-black tabular-nums ${compact ? 'text-sm sm:text-base' : 'text-2xl'}`}
      >
        {value}
      </div>
      {sublabel && <div className="mt-1 text-xs text-brand-gray-medium">{sublabel}</div>}
    </div>
  );
}
