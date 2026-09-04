/**
 * Hoodie Stats Cards
 * How many hoodies to hand out, who earns them, and what is still unknown
 * (sizes) or undone (handouts). 2-up on phones, 4-up on large screens.
 */

import React from 'react';
import { Ban, PackageCheck, Ruler, Shirt } from 'lucide-react';
import { HOODIE_EXCLUSION_LABELS, HOODIE_EXCLUSIONS } from '@/lib/hoodies';
import type { HoodieStats } from './types';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Shirt;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{value}</p>
      <p className="mt-1 text-xs leading-snug text-gray-500">{hint}</p>
    </div>
  );
}

export function HoodieStatsCards({ stats }: { stats: HoodieStats }) {
  const excludedHint = HOODIE_EXCLUSIONS.filter((key) => stats.excluded_by_reason[key] > 0)
    .map((key) => `${stats.excluded_by_reason[key]} ${HOODIE_EXCLUSION_LABELS[key].toLowerCase()}`)
    .join(' · ');

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <StatCard
        icon={Shirt}
        label="Hoodies to hand out"
        value={stats.eligible}
        hint={`${stats.by_reason.speaker} speakers · ${stats.by_reason.vip_ticket_paid} bought VIP · ${stats.by_reason.vip_upgrade_paid} paid upgrade`}
      />
      <StatCard
        icon={Ruler}
        label="Size missing"
        value={stats.missing_size}
        hint={`${stats.with_size} sizes known — order from the size table below`}
      />
      <StatCard
        icon={PackageCheck}
        label="Handed out"
        value={stats.handed}
        hint={`${stats.not_handed} still to hand over at the door`}
      />
      <StatCard
        icon={Ban}
        label="VIPs without hoodie"
        value={stats.excluded}
        hint={excludedHint || 'no complimentary VIPs'}
      />
    </div>
  );
}
