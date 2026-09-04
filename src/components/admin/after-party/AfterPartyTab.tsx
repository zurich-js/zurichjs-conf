/**
 * After Party Tab
 * Live headcount for the VIP after party against venue capacity, and the
 * de-duplicated list of everyone expected (speakers, their plus ones,
 * admin-added guests, VIP ticket holders). Informational only — over
 * capacity shows a warning but never blocks anything.
 *
 * Mobile first: capacity summary, a horizontally scrolling filter row, a
 * full-width search, then one card per person. The table only appears on
 * large screens.
 */

import React, { useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { AFTER_PARTY_SOURCE_LABELS, AFTER_PARTY_SOURCES } from '@/lib/after-party';
import { AfterPartyCapacityCard } from './AfterPartyCapacityCard';
import { AfterPartyAttendeeCardList } from './AfterPartyAttendeeCardList';
import { AfterPartyAttendeeTable } from './AfterPartyAttendeeTable';
import { useAfterPartyOverview } from './hooks';
import type { AfterPartyAttendee, AfterPartyFilter } from './types';

const FILTERS: Array<{ id: AfterPartyFilter; label: string }> = [
  { id: 'all', label: 'Everyone' },
  ...AFTER_PARTY_SOURCES.map((source) => ({ id: source, label: AFTER_PARTY_SOURCE_LABELS[source] })),
  { id: 'needs_ticket', label: 'Needs VIP ticket' },
];

function matchesFilter(attendee: AfterPartyAttendee, filter: AfterPartyFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'needs_ticket') return attendee.needs_vip_ticket;
  return attendee.sources.includes(filter);
}

export function AfterPartyTab() {
  const { data, isLoading, error, refetch, isFetching } = useAfterPartyOverview();
  const [filter, setFilter] = useState<AfterPartyFilter>('all');
  const [search, setSearch] = useState('');

  const filteredAttendees = useMemo(() => {
    const attendees = data?.attendees ?? [];
    const query = search.trim().toLowerCase();
    return attendees.filter((attendee) => {
      if (!matchesFilter(attendee, filter)) return false;
      if (!query) return true;
      return (
        `${attendee.first_name} ${attendee.last_name}`.toLowerCase().includes(query) ||
        (attendee.email?.includes(query) ?? false) ||
        (attendee.related_speaker_name?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [data?.attendees, filter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading after party overview</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <AdminErrorState
        message="Failed to load the after party overview. Please refresh and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <AfterPartyCapacityCard stats={data.stats} generatedAt={data.generated_at} />

      {/* Filter chips — bleed to the screen edges and scroll sideways on phones */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Filter attendees">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`min-h-10 cursor-pointer whitespace-nowrap rounded-md px-3 text-sm transition-colors ${
                filter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, speaker"
            aria-label="Search attendees by name, email, or related speaker"
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <span className="shrink-0 text-sm text-gray-500 sm:ml-auto">
          {filteredAttendees.length}
          <span className="hidden sm:inline"> of {data.attendees.length}</span>
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Refresh</span>
        </button>
      </div>

      <div className="lg:hidden">
        <AfterPartyAttendeeCardList attendees={filteredAttendees} totalCount={data.attendees.length} />
      </div>
      <div className="hidden lg:block">
        <AfterPartyAttendeeTable attendees={filteredAttendees} totalCount={data.attendees.length} />
      </div>

      <p className="text-xs text-gray-500">
        People are matched across sources by email, so a plus one whose VIP ticket has already been issued (or a
        speaker who also bought a VIP ticket) counts once. Speaker RSVPs and plus ones come from the Speakers →
        Logistics tab, where additional after-party guests are managed too. Capacity is {data.stats.capacity}; going
        over only shows a warning. Refreshes every minute.
      </p>
    </div>
  );
}
