/**
 * Sponsor and Partner queries for TanStack Query
 * Used for SSR prefetching and client-side data fetching
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';
import type { PublicSponsor } from '@/lib/types/sponsorship';
import type { PublicCommunityPartner } from '@/lib/partnerships';

const PUBLIC_PARTNER_CONTENT_STALE_TIME_MS = 6 * 60 * 60 * 1000;
const PUBLIC_PARTNER_CONTENT_GC_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * API response structure for public sponsors
 */
export interface PublicSponsorsResponse {
  sponsors: PublicSponsor[];
  error?: string;
}

/**
 * API response structure for community partners
 */
export interface CommunityPartnersResponse {
  partners: PublicCommunityPartner[];
  error?: string;
}

/**
 * Fetch public sponsors from the API
 * Works on both server and client side
 */
export async function fetchPublicSponsors(): Promise<PublicSponsorsResponse> {
  const data = await apiClient.get<PublicSponsorsResponse>(
    endpoints.public.sponsors()
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Fetch community partners from the API
 * Works on both server and client side
 */
export async function fetchCommunityPartners(): Promise<CommunityPartnersResponse> {
  const data = await apiClient.get<CommunityPartnersResponse>(
    endpoints.public.communityPartners()
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Query options for public sponsors
 * Use for SSR prefetching and client-side queries
 */
export const publicSponsorsQueryOptions = queryOptions({
  queryKey: queryKeys.sponsorships.public(),
  queryFn: fetchPublicSponsors,
  staleTime: PUBLIC_PARTNER_CONTENT_STALE_TIME_MS,
  gcTime: PUBLIC_PARTNER_CONTENT_GC_TIME_MS,
});

/**
 * Query options for community partners
 * Use for SSR prefetching and client-side queries
 */
export const communityPartnersQueryOptions = queryOptions({
  queryKey: queryKeys.partnerships.community(),
  queryFn: fetchCommunityPartners,
  staleTime: PUBLIC_PARTNER_CONTENT_STALE_TIME_MS,
  gcTime: PUBLIC_PARTNER_CONTENT_GC_TIME_MS,
});
