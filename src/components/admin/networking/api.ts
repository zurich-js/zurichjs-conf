/**
 * Admin Networking Directory API
 * Client-side fetcher for /admin/networking
 */

import type { NetworkingDirectoryResponse } from './types';

export async function fetchNetworkingDirectory(signal?: AbortSignal): Promise<NetworkingDirectoryResponse> {
  // Contact emails and personal links — never serve from a browser cache
  const res = await fetch('/api/admin/networking', { signal, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch networking directory');
  return res.json();
}

export const networkingDirectoryQueryKeys = {
  all: ['admin-networking'] as const,
  directory: () => [...networkingDirectoryQueryKeys.all, 'directory'] as const,
};
