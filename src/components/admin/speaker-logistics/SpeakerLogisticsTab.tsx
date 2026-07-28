/**
 * Speaker Logistics Tab
 * Reconcile speaker event attendance: who answered, headcounts per event,
 * dietary needs, plus ones (incl. VIP tickets to issue), and each speaker's
 * unique form link (copied and shared with them manually)
 */

import React, { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { SpeakerLogisticsStatsCards } from './SpeakerLogisticsStatsCards';
import { SpeakerLogisticsTable } from './SpeakerLogisticsTable';
import { SpeakerLogisticsCardList } from './SpeakerLogisticsCardList';
import { useSpeakerLogisticsOverview } from './hooks';
import type { SpeakerLogisticsAdminRow, SpeakerLogisticsFilter } from './types';

const FILTERS: Array<{ id: SpeakerLogisticsFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'No answer yet' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'plus_ones', label: 'Plus ones' },
  { id: 'dietary', label: 'Dietary' },
];

function matchesFilter(row: SpeakerLogisticsAdminRow, filter: SpeakerLogisticsFilter): boolean {
  switch (filter) {
    case 'pending':
      return row.status !== 'submitted';
    case 'submitted':
      return row.status === 'submitted';
    case 'plus_ones':
      return row.answers?.dinner_plus_one === true || row.answers?.after_party_plus_one === true;
    case 'dietary':
      return Boolean(row.answers?.dietary_restrictions || row.answers?.dinner_plus_one_dietary_restrictions);
    default:
      return true;
  }
}

export function SpeakerLogisticsTab() {
  const toast = useToast();
  const { data, isLoading, error } = useSpeakerLogisticsOverview();

  const [filter, setFilter] = useState<SpeakerLogisticsFilter>('all');
  const [search, setSearch] = useState('');

  const filteredSpeakers = useMemo(() => {
    const speakers = data?.speakers ?? [];
    const query = search.trim().toLowerCase();
    return speakers.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!query) return true;
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query)
      );
    });
  }, [data?.speakers, filter, search]);

  const handleCopyLink = async (row: SpeakerLogisticsAdminRow) => {
    if (!row.logistics_url) return;
    try {
      await navigator.clipboard.writeText(row.logistics_url);
      toast.success('Link copied', `Unique logistics link for ${row.first_name} ${row.last_name} copied to clipboard.`);
    } catch {
      toast.error('Copy failed', 'Could not access the clipboard.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading speaker logistics overview</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6 text-sm text-red-700">
        Failed to load the speaker logistics overview. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SpeakerLogisticsStatsCards stats={data.stats} />

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Filter speakers">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            aria-label="Search speakers by name or email"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Desktop table / mobile progressive-disclosure cards */}
      <div className="hidden lg:block">
        <SpeakerLogisticsTable speakers={filteredSpeakers} onCopyLink={handleCopyLink} />
      </div>
      <div className="lg:hidden">
        <SpeakerLogisticsCardList speakers={filteredSpeakers} onCopyLink={handleCopyLink} />
      </div>

      <p className="text-xs text-gray-500">
        Each speaker gets a unique link — copy it here and send it to them yourself (no login needed on their
        side). For security the link expires once they submit; speakers are told to email hello@zurichjs.com or
        message Faris, Nadja, or Bogdan for any later changes (especially cancellations). After-party plus ones
        need a VIP ticket issued manually (with 20% off workshops).
      </p>
    </div>
  );
}
