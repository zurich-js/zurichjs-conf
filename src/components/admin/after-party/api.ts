/**
 * After Party Admin API
 * Client-side fetcher for the after-party capacity view
 */

import type { AfterPartyOverviewResponse } from './types';

export async function fetchAfterPartyOverview(signal?: AbortSignal): Promise<AfterPartyOverviewResponse> {
  const res = await fetch('/api/admin/after-party', { signal });
  if (!res.ok) throw new Error('Failed to fetch after party overview');
  return res.json();
}

export const afterPartyQueryKeys = {
  all: ['admin-after-party'] as const,
  overview: () => [...afterPartyQueryKeys.all, 'overview'] as const,
};
