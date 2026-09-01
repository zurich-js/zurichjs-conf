/**
 * TanStack Query client configuration
 */

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/client';
import { emitToast } from '@/lib/toast-bus';

const log = logger.scope('Query Client');

/**
 * Non-transient HTTP client errors (auth, validation, not-found) should not
 * be retried — a retry just repeats the same failing DB/API work. 408
 * (timeout) and 429 (rate limit) are excluded because they can succeed on a
 * later attempt. Applies to any thrown error carrying a numeric `status` or
 * `statusCode` (`AdminApiError` from `@/lib/admin/api-fetch`, `ApiError`
 * from `@/lib/api`).
 */
function isNonRetryableClientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
}

function describeError(error: unknown): { message: string; requestId?: string; code?: string } {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId, code: error.code };
  }
  return { message: error instanceof Error ? error.message : 'Something went wrong' };
}

/**
 * Global error handlers — the safety net for the ~40 mutations with no
 * `onError` of their own. Every failure is logged (→ PostHog, + Sentry when
 * severe); the toast fires only when the mutation didn't register its own
 * `onError`, so hooks with bespoke handling (cfp submissions, contact form)
 * keep their UX without double-toasting. ApiError is skipped in capture:
 * `@/lib/api/client` already captured it at the fetch layer.
 */
function buildQueryCache(): QueryCache {
  return new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiError) return; // captured at the fetch layer
      log.error('Query failed', error, {
        fingerprint: `query/${JSON.stringify(query.queryKey?.[0] ?? 'unknown')}`,
        queryKey: JSON.stringify(query.queryKey),
      });
    },
  });
}

function buildMutationCache(): MutationCache {
  return new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const mutationKey = mutation.options.mutationKey
        ? JSON.stringify(mutation.options.mutationKey)
        : 'anonymous';

      if (!(error instanceof ApiError)) {
        log.error('Mutation failed', error, {
          fingerprint: `mutation/${mutationKey}`,
          mutationKey,
        });
      }

      // Respect per-mutation error UX; only the unhandled ones get the
      // fallback toast.
      if (mutation.options.onError) return;

      const { message, requestId } = describeError(error);
      emitToast({
        type: 'error',
        title: 'That didn’t work',
        message: requestId ? `${message} (ref ${requestId})` : message,
      });
    },
  });
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
  return new QueryClient({
    ...defaultQueryClientConfig,
    queryCache: buildQueryCache(),
    mutationCache: buildMutationCache(),
  });
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
