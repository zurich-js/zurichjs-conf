/**
 * Discount queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { DiscountStatusResponse } from '@/lib/discount';

/**
 * Fetch discount status from the API
 */
async function fetchDiscountStatus(): Promise<DiscountStatusResponse> {
  const res = await fetch('/api/discount/status');
  if (!res.ok) {
    throw new Error('Failed to fetch discount status');
  }
  return res.json();
}

/**
 * Query options for discount status
 * Used to restore minimized state on page reload
 */
export const discountStatusQueryOptions = queryOptions({
  queryKey: queryKeys.discount.status(),
  queryFn: fetchDiscountStatus,
  staleTime: Infinity, // Status doesn't change during session
  gcTime: 0, // Don't cache between sessions
  retry: false, // Don't retry on failure
});
