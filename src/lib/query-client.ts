/**
 * TanStack Query client configuration
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Non-transient HTTP client errors (auth, validation, not-found) should not
 * be retried — a retry just repeats the same failing DB/API work. 408
 * (timeout) and 429 (rate limit) are excluded because they can succeed on a
 * later attempt. Applies to any thrown error carrying a numeric `status`
 * (e.g. `AdminApiError` from `@/lib/admin/api-fetch`).
 */
function isNonRetryableClientError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) return false;
  const status = (error as { status: unknown }).status;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
}

/**
 * Default query client configuration
 */
export const defaultQueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: unknown) =>
        !isNonRetryableClientError(error) && failureCount < 1,
    },
  },
};

/**
 * Create a new query client instance
 * Use this for server-side and client-side query clients
 */
export function createQueryClient(): QueryClient {
  return new QueryClient(defaultQueryClientConfig);
}

/**
 * Global query client instance for client-side
 * Initialized once and reused across the application
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get the query client for the browser
 * Creates a singleton instance on first call
 */
export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return createQueryClient();
  }

  // Browser: create query client if it doesn't exist
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  
  return browserQueryClient;
}

