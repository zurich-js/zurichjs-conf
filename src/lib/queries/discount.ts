/**
 * Discount queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { DiscountStatusResponse, DiscountClientConfigResponse } from '@/lib/discount';

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

/**
 * Fetch the public client config (admin-managed, replaces NEXT_PUBLIC_ env vars)
 */
async function fetchDiscountClientConfig(): Promise<DiscountClientConfigResponse> {
  const res = await fetch('/api/discount/config');
  if (!res.ok) {
    throw new Error('Failed to fetch discount config');
  }
  return res.json();
}

/**
 * Query options for the discount client config.
 * On error, useDiscount falls back to the env-based defaults.
 */
export const discountClientConfigQueryOptions = queryOptions({
  queryKey: queryKeys.discount.config(),
  queryFn: fetchDiscountClientConfig,
  staleTime: 5 * 60 * 1000, // Config rarely changes mid-session
  retry: 1,
});
