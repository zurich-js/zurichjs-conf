/**
 * Hoodie Allocation Admin Hooks
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { adminKeys } from '@/lib/admin/query-keys';
import { fetchHoodieAllocation } from './api';
import type { HoodieAllocationResponse } from './types';

export function useHoodieAllocation(
  enabled: boolean = true
): UseQueryResult<HoodieAllocationResponse, Error> {
  return useQuery({
    queryKey: adminKeys.hoodieAllocation(),
    queryFn: ({ signal }) => fetchHoodieAllocation(signal),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
