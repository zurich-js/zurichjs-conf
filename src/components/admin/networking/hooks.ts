/**
 * Admin Networking Directory Hooks
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { fetchNetworkingDirectory, networkingDirectoryQueryKeys } from './api';
import type { NetworkingDirectoryResponse } from './types';

/**
 * Attendees flip networking on and off from their ticket page, so keep the
 * list reasonably fresh while it is open.
 */
export function useNetworkingDirectory(
  enabled: boolean = true
): UseQueryResult<NetworkingDirectoryResponse, Error> {
  return useQuery({
    queryKey: networkingDirectoryQueryKeys.directory(),
    queryFn: ({ signal }) => fetchNetworkingDirectory(signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
