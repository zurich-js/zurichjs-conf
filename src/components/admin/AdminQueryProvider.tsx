/**
 * Admin Query Provider
 *
 * Wraps admin pages with TanStack Query persistence for offline caching.
 * This component should wrap the content of admin pages (inside _app's
 * QueryClientProvider) to enable localforage-based cache persistence.
 *
 * Usage:
 * ```tsx
 * import { AdminQueryProvider } from '@/components/admin/AdminQueryProvider';
 *
 * export default function AdminPage() {
 *   return (
 *     <AdminQueryProvider>
 *       <YourAdminContent />
 *     </AdminQueryProvider>
 *   );
 * }
 * ```
 */

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, type ReactNode } from 'react';
import { createAdminPersister } from '@/lib/admin/query-persister';

interface AdminQueryProviderProps {
  children: ReactNode;
}

/**
 * Provider that enables offline persistence for admin queries.
 *
 * Key behaviors:
 * - Restores cached queries from IndexedDB on mount
 * - Persists query cache to IndexedDB on changes (debounced)
 * - Only persists admin-related queries (filtered by key prefix)
 * - Cache survives page refreshes and browser restarts
 */
export function AdminQueryProvider({ children }: AdminQueryProviderProps) {
  const queryClient = useQueryClient();
  const [persister] = useState(() => createAdminPersister());

  // On mount, check if we have cached data and log for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Check cache status after a brief delay to allow restoration
      const timer = setTimeout(() => {
        const queryCache = queryClient.getQueryCache();
        const cachedQueries = queryCache.getAll();
        const adminQueries = cachedQueries.filter(
          (q) => Array.isArray(q.queryKey) && 
                 typeof q.queryKey[0] === 'string' &&
                 ['admin', 'sponsorships', 'cfp', 'partnerships'].includes(q.queryKey[0])
        );
        if (adminQueries.length > 0) {
          // eslint-disable-next-line no-console
          console.debug(`[AdminQueryProvider] Restored ${adminQueries.length} cached admin queries`);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        // Debounce persistence to avoid excessive writes
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist successful queries with data
            if (query.state.status !== 'success') return false;
            if (query.state.data === undefined) return false;

            // Only persist admin-related queries
            const key = query.queryKey;
            if (!Array.isArray(key) || key.length === 0) return false;
            const prefix = key[0];
            return (
              typeof prefix === 'string' &&
              ['admin', 'sponsorships', 'cfp', 'partnerships'].includes(prefix)
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
