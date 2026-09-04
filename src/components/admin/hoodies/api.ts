/**
 * Hoodie Allocation Admin API
 */

import type { HoodieAllocationResponse } from './types';

export async function fetchHoodieAllocation(signal?: AbortSignal): Promise<HoodieAllocationResponse> {
  const res = await fetch('/api/admin/hoodies', { signal });
  if (!res.ok) throw new Error('Failed to fetch hoodie allocation');
  return res.json();
}
