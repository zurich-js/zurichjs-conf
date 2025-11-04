/**
 * TanStack Query client configuration
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Default query client configuration
 */
export const defaultQueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
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

