/**
 * After Party Admin API
 * Client-side fetcher for the after-party capacity view
 */

import type { AfterPartyOverviewResponse } from './types';

export async function fetchAfterPartyOverview(signal?: AbortSignal): Promise<AfterPartyOverviewResponse> {
  // Roster carries personal data — never serve it from a browser cache
  const res = await fetch('/api/admin/after-party', { signal, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch after party overview');
  return res.json();
}

export const afterPartyQueryKeys = {
  all: ['admin-after-party'] as const,
  overview: () => [...afterPartyQueryKeys.all, 'overview'] as const,
};
