/**
 * Hoodies Tab (Fulfillment)
 * Who gets a VIP hoodie and what to order. Eligibility is strict: program
 * speakers, people who bought a VIP ticket, and people who paid for a VIP
 * upgrade. Complimentary VIP tickets and complimentary upgrades are shown
 * under "Excluded" so the door team can explain a "no" — except sponsor
 * comps, which qualify.
 */

import React, { useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { HOODIE_REASON_LABELS, HOODIE_REASONS } from '@/lib/hoodies';
import { HoodieStatsCards } from './HoodieStatsCards';
import { HoodieSizeTable } from './HoodieSizeTable';
import { HoodieList, type HoodieListRow } from './HoodieList';
import { useHoodieAllocation } from './hooks';
import type { HoodieEntry, HoodieFilter } from './types';

const FILTERS: Array<{ id: HoodieFilter; label: string }> = [
  { id: 'all', label: 'Eligible' },
  ...HOODIE_REASONS.map((reason) => ({ id: reason, label: HOODIE_REASON_LABELS[reason] })),
  { id: 'missing_size', label: 'Size missing' },
  { id: 'not_handed', label: 'Not handed' },
  { id: 'excluded', label: 'Excluded VIPs' },
];

function matchesFilter(entry: HoodieEntry, filter: HoodieFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'missing_size') return !entry.hoodie_size;
  if (filter === 'not_handed') return !entry.hoodie_handed_at;
  if (filter === 'excluded') return false;
  return entry.reason === filter;
}

function matchesSearch(entry: { first_name: string; last_name: string; email: string }, query: string): boolean {
  if (!query) return true;
  return `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(query) || entry.email.includes(query);
}

export function HoodiesTab(): React.JSX.Element {
  const { data, isLoading, error, refetch, isFetching } = useHoodieAllocation();
  const [filter, setFilter] = useState<HoodieFilter>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo<HoodieListRow[]>(() => {
    const query = search.trim().toLowerCase();
    if (filter === 'excluded') {
      return (data?.excluded ?? [])
        .filter((entry) => matchesSearch(entry, query))
        .map((entry) => ({ kind: 'excluded', entry }));
    }
    return (data?.eligible ?? [])
      .filter((entry) => matchesFilter(entry, filter) && matchesSearch(entry, query))
      .map((entry) => ({ kind: 'eligible', entry }));
  }, [data?.eligible, data?.excluded, filter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading hoodie allocation</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <AdminErrorState
        message="Failed to load the hoodie allocation. Please refresh and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const totalCount = filter === 'excluded' ? data.excluded.length : data.eligible.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <HoodieStatsCards stats={data.stats} />
      <HoodieSizeTable stats={data.stats} />

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1 rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Filter people">
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
            placeholder="Search name or email"
            aria-label="Search people by name or email"
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <span className="shrink-0 text-sm text-gray-500 sm:ml-auto">
          {rows.length}
          <span className="hidden sm:inline"> of {totalCount}</span>
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

      <HoodieList rows={rows} totalCount={totalCount} />

      <p className="text-xs text-gray-500">
        One hoodie per person: program speakers, anyone who bought a VIP ticket, and anyone who paid for a VIP
        upgrade. Complimentary VIP tickets (e.g. speaker plus ones) and complimentary upgrades do not get one —
        they are listed under "Excluded VIPs" — with one exception: comps issued with the reason "Sponsor" (or a
        comp upgrade whose note mentions a sponsor) do qualify. A speaker who also holds a VIP ticket counts once.
        Handed-out status comes from the door check-in.
      </p>
    </div>
  );
}
