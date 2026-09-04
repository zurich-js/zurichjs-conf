/**
 * Hoodie Allocation Admin Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '@/lib/admin/query-keys';
import { fetchHoodieAllocation } from './api';

export function useHoodieAllocation(enabled: boolean = true) {
  return useQuery({
    queryKey: adminKeys.hoodieAllocation(),
    queryFn: ({ signal }) => fetchHoodieAllocation(signal),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
