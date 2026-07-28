/**
 * Speaker Logistics Stats Cards
 * Response progress + per-event headcounts for catering and capacity planning
 */

import React from 'react';
import { CalendarDays, ClipboardCheck, Salad, Shirt } from 'lucide-react';
import type { SpeakerLogisticsEventKey } from '@/data/speaker-logistics-events';
import type { SpeakerLogisticsStats, SpeakerLogisticsEventStats } from './types';

interface SpeakerLogisticsStatsCardsProps {
  stats: SpeakerLogisticsStats;
  /** Admin-added additional guests per activity (counted on top of speaker RSVPs) */
  guestCounts?: Partial<Record<SpeakerLogisticsEventKey, number>>;
}

function EventStatCard({
  label,
  stats,
  guests = 0,
}: {
  label: string;
  stats: SpeakerLogisticsEventStats;
  guests?: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-gray-950">
        {stats.headcount + guests}
        <span className="ml-1 text-sm font-normal text-gray-500">headcount</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {stats.attending} attending
        {stats.plusOnes > 0 ? ` · ${stats.plusOnes} plus one(s)` : ''}
        {guests > 0 ? ` · ${guests} additional guest(s)` : ''} · {stats.notAttending} declined ·{' '}
        {stats.unanswered} unanswered
      </p>
    </div>
  );
}

export function SpeakerLogisticsStatsCards({ stats, guestCounts }: SpeakerLogisticsStatsCardsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Responses
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-950">
            {stats.submitted}
            <span className="ml-1 text-sm font-normal text-gray-500">of {stats.totalSpeakers} speakers</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">{stats.pending} still pending</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Salad className="h-4 w-4" aria-hidden="true" />
            Dietary restrictions
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-950">{stats.withDietaryRestrictions}</p>
          <p className="mt-1 text-xs text-gray-500">
            speaker(s) flagged dietary needs · {stats.withTalkAccommodations} need talk/workshop accommodations
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shirt className="h-4 w-4" aria-hidden="true" />
            Missing t-shirt size
          </div>
          <p className="mt-1 text-2xl font-semibold text-gray-950">{stats.missingTshirtSize}</p>
          <p className="mt-1 text-xs text-gray-500">the form asks for it automatically when missing</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EventStatCard label="Warm-Up (Sep 9)" stats={stats.warmup} guests={guestCounts?.warmup} />
        <EventStatCard label="Speakers Dinner (Sep 10)" stats={stats.speakersDinner} guests={guestCounts?.speakers_dinner} />
        <EventStatCard label="After Party (Sep 11)" stats={stats.afterParty} guests={guestCounts?.after_party} />
        <EventStatCard label="Hangout (Sep 12)" stats={stats.speakerHangout} guests={guestCounts?.speaker_hangout} />
      </div>
    </div>
  );
}
