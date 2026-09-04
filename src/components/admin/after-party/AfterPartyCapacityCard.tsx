/**
 * After Party Capacity Card
 * Headcount vs. venue capacity with a meter that turns amber near the limit
 * and red once over. Purely informational — light overbooking is allowed, so
 * nothing here blocks anything. Laid out for a phone first: big number, meter,
 * one-line verdict, then a 2-up grid of source counts.
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

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function CapacityBanner({ stats, level }: { stats: AfterPartyStats; level: CapacityLevel }) {
  const styles = LEVEL_STYLES[level];
  const Icon = level === 'ok' ? CheckCircle2 : AlertTriangle;

  let message: React.ReactNode;
  if (level === 'over') {
    message = (
      <>
        <span className="font-semibold">Over capacity by {stats.over_by}.</span> The venue holds {stats.capacity};{' '}
        {stats.headcount} are expected. Nothing is blocked — light overbooking is allowed — but keep an eye on it
        before issuing more VIP tickets or plus ones.
      </>
    );
  } else if (level === 'warning') {
    message = (
      <>
        <span className="font-semibold">Getting close.</span> {plural(stats.remaining, 'spot')} left before the{' '}
        {stats.capacity}-person limit
        {stats.speakers_unanswered > 0
          ? `, and ${plural(stats.speakers_unanswered, 'speaker')} still haven't answered.`
          : '.'}
      </>
    );
  } else {
    message = (
      <>
        {plural(stats.remaining, 'spot')} left of {stats.capacity}.
        {stats.speakers_unanswered > 0
          ? ` At least ${stats.potential_headcount} if every pending speaker says yes (plus any plus ones they bring).`
          : ''}
      </>
    );
  }

  return (
    <div
      role={level === 'over' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles.banner}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
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
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-950">{value}</p>
      {hint && <p className="mt-1 text-xs leading-snug text-gray-500">{hint}</p>}
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
  const fillPercent = stats.capacity > 0 ? Math.min(100, (stats.headcount / stats.capacity) * 100) : 100;
  const asOf = new Date(generatedAt).toLocaleTimeString('en-CH', { timeZone: 'Europe/Zurich', timeStyle: 'short' });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 sm:text-sm">
          <span className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 shrink-0" aria-hidden="true" />
            VIP After Party · Fri Sep 11
          </span>
          <span className="shrink-0">
            as of <time dateTime={generatedAt}>{asOf}</time>
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-4xl font-semibold text-gray-950 sm:text-5xl">
            {stats.headcount}
            <span className="ml-1 text-base font-normal text-gray-500 sm:text-lg">/ {stats.capacity}</span>
          </p>
          <p className={`text-right text-sm font-medium ${styles.text}`}>
            {level === 'over' ? `${stats.over_by} over` : `${stats.remaining} left`}
          </p>
        </div>

        <div
          className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100"
          role="meter"
          aria-label="After party headcount against capacity"
          aria-valuemin={0}
          aria-valuemax={stats.capacity}
          aria-valuenow={stats.headcount}
        >
          <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${fillPercent}%` }} />
        </div>

        <div className="mt-3">
          <CapacityBanner stats={stats} level={level} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <SourceStat
          icon={Mic2}
          label="Speakers"
          value={stats.by_source.speaker}
          hint={`${stats.speakers_unanswered} unanswered · ${stats.speakers_declined} declined`}
        />
        <SourceStat
          icon={UserPlus}
          label="Speaker +1s"
          value={stats.by_source.speaker_plus_one}
          hint={
            stats.plus_ones_needing_ticket > 0
              ? `${stats.plus_ones_needing_ticket} still need a VIP ticket`
              : 'all have a VIP ticket'
          }
        />
        <SourceStat
          icon={Users}
          label="Extra guests"
          value={stats.by_source.activity_guest}
          hint="from Speakers → Logistics"
        />
        <SourceStat
          icon={Ticket}
          label="VIP tickets"
          value={stats.by_source.vip_ticket}
          hint={`${stats.vip_tickets_total} confirmed (${stats.vip_tickets_complimentary} comp)${
            stats.vip_tickets_merged > 0 ? ` · ${stats.vip_tickets_merged} held by people above` : ''
          }`}
        />
      </div>
    </div>
  );
}
