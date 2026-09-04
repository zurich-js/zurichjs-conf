/**
 * After Party Admin Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { afterPartyQueryKeys, fetchAfterPartyOverview } from './api';

/**
 * The roster changes as speakers answer their form and VIP tickets sell, so
 * keep it fresh: refetch on focus and every minute while the tab is open.
 */
export function useAfterPartyOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: afterPartyQueryKeys.overview(),
    queryFn: ({ signal }) => fetchAfterPartyOverview(signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
