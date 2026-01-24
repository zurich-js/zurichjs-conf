/**
 * Sponsor and Partner queries for TanStack Query
 * Used for SSR prefetching and client-side data fetching
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';
import type { PublicSponsor } from '@/lib/types/sponsorship';
import type { PublicCommunityPartner } from '@/lib/partnerships';

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
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});

/**
 * Query options for community partners
 * Use for SSR prefetching and client-side queries
 */
export const communityPartnersQueryOptions = queryOptions({
  queryKey: queryKeys.partnerships.community(),
  queryFn: fetchCommunityPartners,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
