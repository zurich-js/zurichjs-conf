/**
 * Bluesky social feed hook
 * TanStack Query wrapper for the homepage social-validation section.
 */

import { useQuery } from '@tanstack/react-query';
import { blueskyFeedQueryOptions } from '@/lib/queries/bluesky';

export function useBlueskyFeed() {
  return useQuery(blueskyFeedQueryOptions);
}
