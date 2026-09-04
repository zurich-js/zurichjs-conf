/**
 * After Party Capacity Card
 * Headcount vs. venue capacity with a meter that turns amber near the limit
 * and red once over. Purely informational — light overbooking is allowed, so
 * nothing here blocks anything.
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, Mic2, PartyPopper, Ticket, UserPlus, Users } from 'lucide-react';
import { AFTER_PARTY_WARNING_THRESHOLD } from '@/config/after-party';
import type { AfterPartyStats } from './types';

type CapacityLevel = 'ok' | 'warning' | 'over';

export function getCapacityLevel(stats: Pick<AfterPartyStats, 'headcount' | 'capacity'>): CapacityLevel {
  if (stats.headcount > stats.capacity) return 'over';
  if (stats.headcount >= stats.capacity * AFTER_PARTY_WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

const LEVEL_STYLES: Record<CapacityLevel, { bar: string; text: string; banner: string }> = {
  ok: { bar: 'bg-green-500', text: 'text-green-700', banner: 'border-green-200 bg-green-50 text-green-800' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-700', banner: 'border-amber-200 bg-amber-50 text-amber-800' },
  over: { bar: 'bg-red-500', text: 'text-red-700', banner: 'border-red-200 bg-red-50 text-red-800' },
};

function CapacityBanner({ stats, level }: { stats: AfterPartyStats; level: CapacityLevel }) {
  const styles = LEVEL_STYLES[level];
  if (level === 'over') {
    return (
      <div role="alert" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles.banner}`}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Over capacity by {stats.over_by}.</span> The venue holds{' '}
          {stats.capacity}; {stats.headcount} people are expected. Nothing is blocked — light overbooking is
          allowed — but keep an eye on it before issuing more VIP tickets or plus ones.
        </p>
      </div>
    );
  }
  if (level === 'warning') {
    return (
      <div role="status" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles.banner}`}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Getting close.</span> {stats.remaining} spot
          {stats.remaining === 1 ? '' : 's'} left before the {stats.capacity}-person limit
          {stats.speakers_unanswered > 0
            ? `, and ${stats.speakers_unanswered} speaker${stats.speakers_unanswered === 1 ? '' : 's'} still haven't answered.`
            : '.'}
        </p>
      </div>
    );
  }
  return (
    <div role="status" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles.banner}`}>
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        {stats.remaining} spot{stats.remaining === 1 ? '' : 's'} left of {stats.capacity}.
        {stats.speakers_unanswered > 0
          ? ` Worst case ${stats.potential_headcount} if every pending speaker says yes.`
          : ''}
      </p>
    </div>
  );
}

function SourceStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface AfterPartyCapacityCardProps {
  stats: AfterPartyStats;
  generatedAt: string;
}

export function AfterPartyCapacityCard({ stats, generatedAt }: AfterPartyCapacityCardProps) {
  const level = getCapacityLevel(stats);
  const styles = LEVEL_STYLES[level];
  const fillPercent = Math.min(100, (stats.headcount / stats.capacity) * 100);
  const mergedTickets =
    stats.vip_tickets_total - stats.by_source.vip_ticket;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <PartyPopper className="h-4 w-4" aria-hidden="true" />
              VIP After Party · Fri Sep 11
            </div>
            <p className="mt-1 text-4xl font-semibold text-gray-950">
              {stats.headcount}
              <span className="ml-1 text-lg font-normal text-gray-500">/ {stats.capacity}</span>
            </p>
            <p className={`mt-1 text-sm font-medium ${styles.text}`}>
              {level === 'over'
                ? `${stats.over_by} over capacity`
                : `${stats.remaining} spot${stats.remaining === 1 ? '' : 's'} remaining`}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            As of{' '}
            <time dateTime={generatedAt}>
              {new Date(generatedAt).toLocaleTimeString('en-CH', { timeZone: 'Europe/Zurich', timeStyle: 'short' })}
            </time>{' '}
            · refreshes every minute
          </p>
        </div>

        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100"
          role="meter"
          aria-label="After party headcount against capacity"
          aria-valuemin={0}
          aria-valuemax={stats.capacity}
          aria-valuenow={stats.headcount}
        >
          <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${fillPercent}%` }} />
        </div>

        <div className="mt-4">
          <CapacityBanner stats={stats} level={level} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SourceStat
          icon={Mic2}
          label="Speakers"
          value={stats.by_source.speaker}
          hint={`${stats.speakers_unanswered} unanswered · ${stats.speakers_declined} declined`}
        />
        <SourceStat
          icon={UserPlus}
          label="Speaker plus ones"
          value={stats.by_source.speaker_plus_one}
          hint={
            stats.plus_ones_needing_ticket > 0
              ? `${stats.plus_ones_needing_ticket} still need a VIP ticket issued`
              : 'all have their VIP ticket'
          }
        />
        <SourceStat
          icon={Users}
          label="Additional guests"
          value={stats.by_source.activity_guest}
          hint="added on the Speakers → Logistics tab"
        />
        <SourceStat
          icon={Ticket}
          label="VIP ticket holders"
          value={stats.by_source.vip_ticket}
          hint={`${stats.vip_tickets_total} confirmed VIP tickets (${stats.vip_tickets_complimentary} comp)${
            mergedTickets > 0 ? ` · ${mergedTickets} held by speakers/plus ones above` : ''
          }`}
        />
      </div>
    </div>
  );
}
