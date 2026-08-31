/**
 * Admin Query Persister
 *
 * Provides offline caching for admin dashboard queries using localforage.
 * This dramatically improves perceived performance by serving cached data
 * instantly while revalidating in the background.
 *
 * Cache strategy:
 * - Admin data is cached for 24 hours in IndexedDB via localforage
 * - On page load, cached data is shown immediately (stale-while-revalidate)
 * - Background refresh happens automatically based on staleTime
 * - Cache is cleared on logout (via queryClient.clear() in useAdminAuth)
 *
 * Keys that are persisted:
 * - All keys under ['admin', ...] (admin dashboard data)
 * - All keys under ['sponsorships', ...] (sponsorship management)
 * - All keys under ['cfp', ...] (CFP admin data)
 */

import localforage from 'localforage';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

/**
 * localforage instance configured for admin query cache
 */
const adminCacheStore = localforage.createInstance({
  name: 'zurichjs-admin',
  storeName: 'query-cache',
  description: 'TanStack Query cache for admin dashboard',
});

/**
 * Cache duration: 24 hours
 * Admin data doesn't change frequently and benefits from aggressive caching.
 * The staleTime on individual queries controls when background refetch happens.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Buster version - increment to invalidate all cached data
 * Use when making breaking changes to query response shapes
 */
const CACHE_BUSTER = 'v1';

/**
 * Storage key for the persisted query client state
 */
const STORAGE_KEY = `admin-query-cache-${CACHE_BUSTER}`;

/**
 * Query key prefixes that should be persisted to offline storage.
 * Only admin-related queries benefit from persistence; user-facing
 * queries have different freshness requirements.
 */
const PERSISTED_KEY_PREFIXES = ['admin', 'sponsorships', 'cfp', 'partnerships'];

/**
 * Check if a query key should be persisted based on its prefix
 */
function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const prefix = queryKey[0];
  return typeof prefix === 'string' && PERSISTED_KEY_PREFIXES.includes(prefix);
}

/**
 * Create a localforage-based persister for TanStack Query
 *
 * This persister stores query cache in IndexedDB, which:
 * - Survives page refreshes and browser restarts
 * - Has much larger storage limits than localStorage (~50MB+)
 * - Doesn't block the main thread (async operations)
 */
export function createAdminPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      // Filter to only persist admin-related queries
      const filteredClient: PersistedClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: client.clientState.queries.filter((query) =>
            shouldPersistQuery(query.queryKey)
          ),
        },
      };

      // Only persist if we have queries to store
      if (filteredClient.clientState.queries.length > 0) {
        await adminCacheStore.setItem(STORAGE_KEY, filteredClient);
      }
    },

    restoreClient: async () => {
      const client = await adminCacheStore.getItem<PersistedClient>(STORAGE_KEY);

      if (!client) return undefined;

      // Check if cache is expired
      const age = Date.now() - client.timestamp;
      if (age > MAX_AGE_MS) {
        await adminCacheStore.removeItem(STORAGE_KEY);
        return undefined;
      }

      return client;
    },

    removeClient: async () => {
      await adminCacheStore.removeItem(STORAGE_KEY);
    },
  };
}

/**
 * Clear all admin cache data
 * Called on logout to ensure no admin data persists into unauthenticated sessions
 */
export async function clearAdminCache(): Promise<void> {
  await adminCacheStore.clear();
}

/**
 * Admin-specific query options with extended cache times
 *
 * These defaults are optimized for admin dashboards where:
 * - Data changes infrequently (compared to user-facing pages)
 * - Users benefit from instant loads on repeated visits
 * - Background refresh keeps data fresh without blocking UI
 */
export const adminQueryDefaults = {
  /**
   * Data considered fresh for 10 minutes
   * During this time, no background refetch happens
   */
  staleTime: 10 * 60 * 1000,

  /**
   * Keep unused queries in memory for 30 minutes
   * Supports quick navigation between admin tabs
   */
  gcTime: 30 * 60 * 1000,

  /**
   * Don't refetch on window focus for admin pages
   * Prevents jarring updates during multitasking
   */
  refetchOnWindowFocus: false,

  /**
   * Don't refetch on reconnect - let staleTime handle it
   */
  refetchOnReconnect: false,
} as const;

/**
 * Query options for detail views (single sponsor, single deal, etc.)
 * These are accessed frequently and benefit from longer cache times
 */
export const adminDetailQueryDefaults = {
  ...adminQueryDefaults,
  staleTime: 15 * 60 * 1000, // 15 minutes - details change less often
  gcTime: 60 * 60 * 1000, // 1 hour - keep in memory longer
} as const;

/**
 * Query options for list views with filters
 * Shorter staleTime since filtered results may need more frequent updates
 */
export const adminListQueryDefaults = {
  ...adminQueryDefaults,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Query options for stats/aggregates
 * These are expensive to compute, cache aggressively
 */
export const adminStatsQueryDefaults = {
  ...adminQueryDefaults,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
} as const;
