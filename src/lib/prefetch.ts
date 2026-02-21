/**
 * SSR Prefetch Utility
 *
 * Wraps TanStack Query prefetching with timeout, error reporting to PostHog,
 * and critical/optional query semantics.
 *
 * - Critical queries throw on failure (blocks page render → error boundary)
 * - Optional queries return null on failure (client recovers via useQuery)
 */

import {
  dehydrate as reactQueryDehydrate,
  type QueryClient,
  type FetchQueryOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { serverAnalytics } from '@/lib/analytics/server';

type PrefetchSuccess<TData> = { type: 'data'; data: TData };
type PrefetchError = { type: 'error'; error: Error };
type PrefetchResult<TData> = PrefetchSuccess<TData> | PrefetchError;

const timeout = (ms: number) =>
  new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));

export const createPrefetch = (queryClient: QueryClient, timeoutDuration = 1000) => {
  const prefetch = async <
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<PrefetchResult<TData>> => {
    try {
      const fetchPromise = queryClient.fetchQuery(options);
      const data = (await Promise.race([fetchPromise, timeout(timeoutDuration)])) as TData;
      return { type: 'data', data };
    } catch (error) {
      serverAnalytics.captureException(error, {
        type: 'network',
        severity: 'medium',
        flow: 'ssr_prefetch',
        action: 'prefetch_query',
        queryKey: JSON.stringify(options.queryKey),
      });
      return {
        type: 'error',
        error: error instanceof Error ? error : new Error('Request failed.'),
      };
    }
  };

  const criticalQuery = async <
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData> => {
    const result = await prefetch(options);
    if (result.type === 'error') {
      throw result.error;
    }
    return result.data;
  };

  const optionalQuery = async <
    TQueryFnData = unknown,
    TError = unknown,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ): Promise<TData | null> => {
    const result = await prefetch(options);
    if (result.type === 'error') {
      return null;
    }
    return result.data;
  };

  const dehydrate = () => reactQueryDehydrate(queryClient);

  return { prefetch, criticalQuery, optionalQuery, dehydrate };
};

export type Prefetch = ReturnType<typeof createPrefetch>;
