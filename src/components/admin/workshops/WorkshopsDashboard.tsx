/**
 * Top-level container for the admin workshops page.
 * Owns data fetching, filtering, search, create-offering mutation, and drawer state.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';

import type { AdminWorkshopListItem } from '@/pages/api/admin/workshops';
import type { Workshop } from '@/lib/types/database';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/molecules';
import { WorkshopsSummaryStrip } from './WorkshopsSummaryStrip';
import { WorkshopsFilterBar, type WorkshopFilterStatus } from './WorkshopsFilterBar';
import { WorkshopCard } from './WorkshopCard';
import { WorkshopDrawer } from './WorkshopDrawer';

const adminKeys = {
  all: ['admin', 'workshops'] as const,
  list: () => [...adminKeys.all, 'list'] as const,
};

async function fetchAdminWorkshops(): Promise<AdminWorkshopListItem[]> {
  const res = await fetch('/api/admin/workshops');
  if (!res.ok) throw new Error('Failed to load workshops');
  const data = await res.json();
  return data.items as AdminWorkshopListItem[];
}

async function createOffering(input: { cfpSubmissionId: string }): Promise<Workshop> {
  const res = await fetch('/api/admin/workshops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error ?? 'Failed to create offering');
  }
  const data = await res.json();
  return data.offering as Workshop;
}

function categorize(item: AdminWorkshopListItem): WorkshopFilterStatus {
  if (!item.offering) return 'not_configured';
  const status = item.offering.status;
  if (status === 'draft') return 'draft';
  if (status === 'published') return 'published';
  if (status === 'archived' || status === 'completed' || status === 'cancelled') return 'archived';
  return 'draft';
}

function matchesSearch(item: AdminWorkshopListItem, term: string): boolean {
  if (!term) return true;
  const needle = term.toLowerCase();
  return (
    item.submissionTitle.toLowerCase().includes(needle) ||
    (item.speakerName?.toLowerCase().includes(needle) ?? false)
  );
}

export function WorkshopsDashboard() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: adminKeys.list(),
    queryFn: fetchAdminWorkshops,
  });

  const [status, setStatus] = useState<WorkshopFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [openedSubmissionId, setOpenedSubmissionId] = useState<string | null>(null);

  const items = useMemo(() => data ?? [], [data]);

  const counts = useMemo<Record<WorkshopFilterStatus, number>>(() => {
    const base: Record<WorkshopFilterStatus, number> = {
      all: items.length,
      not_configured: 0,
      draft: 0,
      published: 0,
      archived: 0,
    };
    for (const item of items) {
      const category = categorize(item);
      base[category] += 1;
    }
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (status !== 'all' && categorize(item) !== status) return false;
      return matchesSearch(item, search);
    });
  }, [items, status, search]);

  const { toasts, showToast } = useToast();

  const createMutation = useMutation({
    mutationFn: createOffering,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.list() });
      showToast('Workshop offering created', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to create offering', 'error');
    },
  });

  const openedOffering = useMemo(() => {
    if (!openedSubmissionId) return null;
    const item = items.find((i) => i.cfpSubmissionId === openedSubmissionId);
    return item?.offering ?? null;
  }, [openedSubmissionId, items]);

  return (
    <div className="space-y-5">
      <WorkshopsSummaryStrip items={items} />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">Offerings</h2>
          <p className="hidden text-sm text-gray-600 sm:block">
            Accepted CFP workshop submissions. Link a Stripe product + price lookup key and set a schedule to publish.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <WorkshopsFilterBar
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="size-4 animate-spin" /> Loading workshops…
        </div>
      )}
      {isError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error loading workshops: {(error as Error)?.message}
        </div>
      )}

      {filteredItems.length === 0 && !isLoading && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? 'No accepted workshop submissions yet.'
              : 'No workshops match the current filters.'}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:gap-4">
        {filteredItems.map((item) => (
          <WorkshopCard
            key={item.cfpSubmissionId}
            item={item}
            onOpen={() => item.offering && setOpenedSubmissionId(item.cfpSubmissionId)}
            onCreateOffering={() => createMutation.mutate({ cfpSubmissionId: item.cfpSubmissionId })}
            creatingOffering={
              createMutation.isPending && createMutation.variables?.cfpSubmissionId === item.cfpSubmissionId
            }
          />
        ))}
      </div>

      {createMutation.isError && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">
          {(createMutation.error as Error)?.message}
        </div>
      )}

      {openedOffering && (
        <WorkshopDrawer
          offering={openedOffering}
          open={Boolean(openedSubmissionId)}
          onClose={() => setOpenedSubmissionId(null)}
          onSaved={() => {
            /* keep drawer open so admin sees the saved state */
          }}
          listQueryKey={adminKeys.list()}
          onToast={showToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
