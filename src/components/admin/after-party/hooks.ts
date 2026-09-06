/**
 * After Party Admin Hooks
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { afterPartyQueryKeys, fetchAfterPartyOverview } from './api';
import type { AfterPartyOverviewResponse } from './types';

/**
 * The roster changes as speakers answer their form and VIP tickets sell, so
 * keep it fresh: refetch on focus and every minute while the tab is open.
 */
export function useAfterPartyOverview(
  enabled: boolean = true
): UseQueryResult<AfterPartyOverviewResponse, Error> {
  return useQuery({
    queryKey: afterPartyQueryKeys.overview(),
    queryFn: ({ signal }) => fetchAfterPartyOverview(signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
