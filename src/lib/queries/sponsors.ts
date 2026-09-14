/**
 * Sponsor and partner queries for TanStack Query.
 *
 * Archive build: reads the frozen 2026 snapshot instead of the sponsors API.
 * On the server the JSON is inlined at build time; in the browser it comes from
 * the mirrored static file.
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ARCHIVE_JSON } from '@/lib/archive/urls';
import type { PublicCommunityPartner } from '@/lib/partnerships/public';
import type { PublicSponsor } from '@/lib/types/sponsorship';

export interface PublicSponsorsResponse {
  sponsors: PublicSponsor[];
}

export interface CommunityPartnersResponse {
  partners: PublicCommunityPartner[];
}

export async function fetchPublicSponsors(): Promise<PublicSponsorsResponse> {
  if (typeof window === 'undefined') {
    const { getFrozenSponsors } = await import('@/lib/archive/frozen');
    return { sponsors: getFrozenSponsors() };
  }
  const sponsors = (await (await fetch(ARCHIVE_JSON.sponsors)).json()) as PublicSponsor[];
  return { sponsors };
}

export async function fetchCommunityPartners(): Promise<CommunityPartnersResponse> {
  if (typeof window === 'undefined') {
    const { getFrozenCommunityPartners } = await import('@/lib/archive/frozen');
    return { partners: getFrozenCommunityPartners() };
  }
  const partners = (await (
    await fetch(ARCHIVE_JSON.communityPartners)
  ).json()) as PublicCommunityPartner[];
  return { partners };
}

// The snapshot cannot change for the life of the deployment.
export const publicSponsorsQueryOptions = queryOptions({
  queryKey: queryKeys.sponsorships.public(),
  queryFn: fetchPublicSponsors,
  staleTime: Infinity,
  gcTime: Infinity,
});

export const communityPartnersQueryOptions = queryOptions({
  queryKey: queryKeys.partnerships.community(),
  queryFn: fetchCommunityPartners,
  staleTime: Infinity,
  gcTime: Infinity,
});
