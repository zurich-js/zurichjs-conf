/**
 * Networking Directory Panel
 * Who has set up conference networking (attendees, sponsors, manually added
 * badge rows), whether their share page is currently public, and which links
 * they chose to share. Read-only; settings are changed by the people
 * themselves (ticket page) or in the sponsor detail modal.
 *
 * Mobile first: summary tiles, scrolling filter chips, search, then cards.
 * The table only appears on large screens.
 */

import React, { useMemo, useState } from 'react';
import { Download, Loader2, Network, RefreshCw, Search } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { NETWORKING_DIRECTORY_SOURCES } from '@/lib/networking/directory';
import { downloadCsv, networkingDirectoryToCsv } from './csv';
import { useNetworkingDirectory } from './hooks';
import { NetworkingDirectoryCardList } from './NetworkingDirectoryCardList';
import { NetworkingDirectoryTable } from './NetworkingDirectoryTable';
import { SOURCE_LABELS } from './shared';
import type {
  NetworkingDirectoryEntry,
  NetworkingDirectoryStats,
  NetworkingSourceFilter,
  NetworkingStatusFilter,
} from './types';

const STATUS_FILTERS: Array<{ id: NetworkingStatusFilter; label: string }> = [
  { id: 'enabled', label: 'Public' },
  { id: 'disabled', label: 'Switched off' },
  { id: 'all', label: 'Everyone' },
];

const SOURCE_FILTERS: Array<{ id: NetworkingSourceFilter; label: string }> = [
  { id: 'all', label: 'All sources' },
  ...NETWORKING_DIRECTORY_SOURCES.map((source) => ({ id: source, label: SOURCE_LABELS[source] })),
];

function matches(
  entry: NetworkingDirectoryEntry,
  status: NetworkingStatusFilter,
  source: NetworkingSourceFilter,
  query: string
): boolean {
  if (status === 'enabled' && !entry.enabled) return false;
  if (status === 'disabled' && entry.enabled) return false;
  if (source !== 'all' && entry.source !== source) return false;
  if (!query) return true;
  return (
    entry.name.toLowerCase().includes(query) ||
    (entry.headline?.toLowerCase().includes(query) ?? false) ||
    (entry.contactEmail?.toLowerCase().includes(query) ?? false) ||
    entry.links.some((link) => link.href.toLowerCase().includes(query))
  );
}

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-1 rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className={`min-h-10 cursor-pointer whitespace-nowrap rounded-md px-3 text-sm transition-colors ${
              value === option.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatTile({ label, enabled, total }: { label: string; enabled: number; total: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{enabled}</p>
      <p className="text-xs text-gray-500">public of {total} set up</p>
    </div>
  );
}

function StatsRow({ stats }: { stats: NetworkingDirectoryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Everyone" enabled={stats.enabled} total={stats.total} />
      {NETWORKING_DIRECTORY_SOURCES.map((source) => (
        <StatTile
          key={source}
          label={SOURCE_LABELS[source]}
          enabled={stats.bySource[source].enabled}
          total={stats.bySource[source].total}
        />
      ))}
    </div>
  );
}

export function NetworkingDirectoryPanel(): React.JSX.Element {
  const { data, isLoading, error, refetch, isFetching } = useNetworkingDirectory();
  const [status, setStatus] = useState<NetworkingStatusFilter>('enabled');
  const [source, setSource] = useState<NetworkingSourceFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) => matches(entry, status, source, query));
  }, [data?.entries, status, source, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading networking directory</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <AdminErrorState
        message="Failed to load the networking directory. Please refresh and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`zurichjs-networking-${status}-${stamp}.csv`, networkingDirectoryToCsv(filtered));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatsRow stats={data.stats} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterChips label="Filter by visibility" options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <FilterChips label="Filter by source" options={SOURCE_FILTERS} value={source} onChange={setSource} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, company, email, link"
            aria-label="Search the networking directory by name, company, email, or link"
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <span className="shrink-0 text-sm text-gray-500 sm:ml-auto">
          {filtered.length}
          <span className="hidden sm:inline"> of {data.entries.length}</span>
        </span>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-60"
        >
          <Download className="size-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Export CSV</span>
        </button>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Refresh</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={<Network className="size-7" aria-hidden="true" />}
          title={data.entries.length === 0 ? 'Nobody has set up networking yet' : 'No matches'}
          description={
            data.entries.length === 0
              ? 'Attendees enable networking from their ticket page; sponsors are set up in the sponsor detail modal.'
              : 'Try a different visibility filter, source, or search term.'
          }
        />
      ) : (
        <>
          <div className="lg:hidden">
            <NetworkingDirectoryCardList entries={filtered} />
          </div>
          <div className="hidden lg:block">
            <NetworkingDirectoryTable entries={filtered} />
          </div>
        </>
      )}

      <p className="text-xs text-gray-500">
        “Public” means the share page currently shows this person&apos;s links. “Switched off” lists people who saved
        links but turned sharing off. Speakers share via their public speaker profile and are not listed here.
        Contact emails are internal and never shown on share pages. Refreshes every minute.
      </p>
    </div>
  );
}
