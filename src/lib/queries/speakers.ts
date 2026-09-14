/**
 * Speaker queries for TanStack Query.
 *
 * Archive build: reads the frozen 2026 snapshot instead of Supabase. On the
 * server the JSON is inlined at build time; in the browser it comes from the
 * mirrored static file, since the archive has no API routes.
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ARCHIVE_JSON } from '@/lib/archive/urls';
import type { PublicSpeaker } from '@/lib/types/cfp';

export interface SpeakerQueryParams {
  featured?: boolean;
}

export interface PublicSpeakersResponse {
  speakers: PublicSpeaker[];
  programSpeakerCount: number;
}

export async function fetchPublicSpeakers(
  params?: SpeakerQueryParams
): Promise<PublicSpeakersResponse> {
  const { speakers, programSpeakerCount } =
    typeof window === 'undefined'
      ? (await import('@/lib/archive/frozen')).getFrozenSpeakers()
      : ((await (await fetch(ARCHIVE_JSON.speakers)).json()) as PublicSpeakersResponse);

  return {
    speakers: params?.featured ? speakers.filter((s) => s.is_featured) : speakers,
    programSpeakerCount,
  };
}

/**
 * Query options for archived speakers.
 *
 * The snapshot cannot change for the life of the deployment, so the data is
 * never stale and is never refetched.
 */
export function publicSpeakersQueryOptions(params?: SpeakerQueryParams) {
  return queryOptions({
    queryKey: queryKeys.speakers.public(params),
    queryFn: () => fetchPublicSpeakers(params),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
