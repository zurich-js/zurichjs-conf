/**
 * Hoodie Allocation Admin API
 */

import type { HoodieAllocationResponse } from './types';

export async function fetchHoodieAllocation(signal?: AbortSignal): Promise<HoodieAllocationResponse> {
  // Names, emails and sizes — never serve them from a browser cache
  const res = await fetch('/api/admin/hoodies', { signal, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch hoodie allocation');
  return res.json();
}
