/**
 * Public Sponsors and Partners Hooks
 * TanStack Query hooks for fetching sponsor and partner data
 */

import { useQuery } from '@tanstack/react-query';
import {
  publicSponsorsQueryOptions,
  communityPartnersQueryOptions,
} from '@/lib/queries/sponsors';

/**
 * Hook for fetching public sponsors
 * Returns sponsors with paid deals and public logos
 */
export function usePublicSponsors() {
  return useQuery(publicSponsorsQueryOptions);
}

/**
 * Hook for fetching community partners
 * Returns active community partners with logos
 */
export function useCommunityPartners() {
  return useQuery(communityPartnersQueryOptions);
}
