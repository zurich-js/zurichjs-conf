/**
 * Bluesky social feed queries for TanStack Query
 * Used for SSR prefetching and client-side hydration of the homepage
 * "what people are saying" section.
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { BlueskyFeedResponse } from '@/pages/api/social/bluesky-posts';

export type { BlueskyFeedPost, BlueskyFeedAuthor, BlueskyFeedResponse } from '@/pages/api/social/bluesky-posts';

export async function fetchBlueskyFeed(): Promise<BlueskyFeedResponse> {
  const baseUrl =
    typeof window === 'undefined'
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
      : '';

  const res = await fetch(`${baseUrl}/api/social/bluesky-posts`);
  if (!res.ok) {
    throw new Error(`Failed to fetch Bluesky feed: ${res.status}`);
  }
  return res.json() as Promise<BlueskyFeedResponse>;
}

export const blueskyFeedQueryOptions = queryOptions({
  queryKey: queryKeys.social.bluesky(),
  queryFn: fetchBlueskyFeed,
  staleTime: 15 * 60 * 1000, // 15 min — matches the API CDN cache
  gcTime: 30 * 60 * 1000,
});
