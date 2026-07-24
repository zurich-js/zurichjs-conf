/**
 * Apparel Tab
 * Admin overview of attendee/speaker apparel sizes: who has provided sizes,
 * who is missing, per-size order totals, and bulk reminder emails
 */

import React, { useMemo, useState } from 'react';
import { Loader2, Mail, Search } from 'lucide-react';
import { ApparelStatsCards } from './ApparelStatsCards';
import { SizeBreakdownTable } from './SizeBreakdownTable';
import { ApparelTicketsTable } from './ApparelTicketsTable';
import { useApparelOverview, useSendApparelReminders } from './hooks';
import type { ApparelFilter, ApparelTicketRow } from './types';

const FILTERS: Array<{ id: ApparelFilter; label: string }> = [
  { id: 'missing', label: 'Missing sizes' },
  { id: 'complete', label: 'Complete' },
  { id: 'all', label: 'All' },
];

function matchesFilter(ticket: ApparelTicketRow, filter: ApparelFilter): boolean {
  if (filter === 'missing') return ticket.missing;
  if (filter === 'complete') return !ticket.missing;
  return true;
}

export function ApparelTab() {
  const { data, isLoading, error } = useApparelOverview();
  const sendReminders = useSendApparelReminders();

  const [filter, setFilter] = useState<ApparelFilter>('missing');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTickets = useMemo(() => {
    const tickets = data?.tickets ?? [];
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (!matchesFilter(ticket, filter)) return false;
      if (!query) return true;
      return (
        `${ticket.first_name} ${ticket.last_name}`.toLowerCase().includes(query) ||
        ticket.email.toLowerCase().includes(query)
      );
    });
  }, [data?.tickets, filter, search]);

  const toggleSelection = (ticketId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allVisible = filteredTickets.every((ticket) => prev.has(ticket.id));
      if (allVisible) return new Set();
      return new Set(filteredTickets.map((ticket) => ticket.id));
    });
  };

  const selectAllMissing = () => {
    const missingIds = (data?.tickets ?? []).filter((ticket) => ticket.missing).map((ticket) => ticket.id);
    setSelectedIds(new Set(missingIds));
  };

  const handleSendReminders = async () => {
    const ticketIds = Array.from(selectedIds);
    if (ticketIds.length === 0) return;
    if (
      !confirm(
        `Send an apparel size reminder email to ${ticketIds.length} ticket holder(s)? ` +
          'Holders who already provided all their sizes are skipped automatically.'
      )
    ) {
      return;
    }
    await sendReminders.mutateAsync({ ticketIds });
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading apparel overview</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6 text-sm text-red-700">
        Failed to load the apparel overview. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <ApparelStatsCards stats={data.stats} speakerStats={data.speakerStats} />

      <SizeBreakdownTable stats={data.stats} speakerStats={data.speakerStats} />

      {/* Filters + bulk actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 bg-white p-1" role="group" aria-label="Filter tickets">
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
            aria-label="Search tickets by name or email"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            onClick={selectAllMissing}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Select all missing ({data.tickets.filter((t) => t.missing).length})
          </button>
          <button
            onClick={handleSendReminders}
            disabled={selectedIds.size === 0 || sendReminders.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendReminders.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {sendReminders.isPending ? 'Sending...' : `Send reminders (${selectedIds.size})`}
          </button>
        </div>
      </div>

      <ApparelTicketsTable
        tickets={filteredTickets}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onToggleSelectAll={toggleSelectAll}
      />

      <p className="text-xs text-gray-500">
        Reminder emails include the attendee&apos;s secure manage-ticket link. Ticket holders who already provided all
        required sizes are skipped even when selected. Speaker sizes are collected via the CFP profile — nudge speakers
        through the CFP dashboard instead.
      </p>
    </div>
  );
}
