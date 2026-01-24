/**
 * Speaker queries for TanStack Query
 * Used for SSG prefetching and client-side data fetching
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';
import type { PublicSpeaker } from '@/lib/types/cfp';

/**
 * API response structure for public speakers
 */
export interface PublicSpeakersResponse {
  speakers: PublicSpeaker[];
}

/**
 * Fetch public speakers directly from the database
 * Works during build time (SSG) since it uses the service client
 */
export async function fetchPublicSpeakers(): Promise<PublicSpeakersResponse> {
  const speakers = await getVisibleSpeakersWithSessions();
  return { speakers };
}

/**
 * Query options for public speakers
 * Use for SSG prefetching and client-side queries
 */
export const publicSpeakersQueryOptions = queryOptions({
  queryKey: queryKeys.speakers.public(),
  queryFn: fetchPublicSpeakers,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
