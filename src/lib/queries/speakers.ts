/**
 * Speaker queries for TanStack Query
 * Used for SSR prefetching and client-side data fetching
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getProgramSpeakerCount, getVisibleSpeakersWithSessions } from '@/lib/cfp/speakers';
import type { PublicSpeaker } from '@/lib/types/cfp';

export interface SpeakerQueryParams {
  featured?: boolean;
}

/**
 * API response structure for public speakers
 */
export interface PublicSpeakersResponse {
  speakers: PublicSpeaker[];
  programSpeakerCount: number;
}

/**
 * Fetch public speakers from the appropriate source:
 * - Server: queries the database directly via service client (used by SSR prefetch)
 * - Client: calls the /api/speakers route (works without server-only secrets)
 *
 * Pass { featured: true } to return only featured speakers.
 */
export async function fetchPublicSpeakers(params?: SpeakerQueryParams): Promise<PublicSpeakersResponse> {
  if (typeof window === 'undefined') {
    const [visibleSpeakers, programSpeakerCount] = await Promise.all([
      getVisibleSpeakersWithSessions(),
      getProgramSpeakerCount(),
    ]);
    let speakers = visibleSpeakers;
    if (params?.featured) {
      speakers = speakers.filter((s) => s.is_featured);
    }
    return { speakers, programSpeakerCount };
  }

  const url = params?.featured ? '/api/speakers?featured=true' : '/api/speakers';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch speakers: ${res.status}`);
  }
  return res.json() as Promise<PublicSpeakersResponse>;
}

/**
 * Query options for public speakers.
 * Pass { featured: true } to fetch only featured speakers (used on the homepage).
 * With no params, returns all visible speakers (used on /speakers).
 */
export function publicSpeakersQueryOptions(params?: SpeakerQueryParams) {
  return queryOptions({
    queryKey: queryKeys.speakers.public(params),
    queryFn: () => fetchPublicSpeakers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
