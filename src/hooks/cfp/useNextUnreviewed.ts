/**
 * useNextUnreviewed Hook
 * Reads TanStack Query cache to find the next unreviewed submission
 */

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/query-keys';
import type { ReviewerDashboardData } from './reviewer';

/**
 * Returns the ID of the next unreviewed submission, prioritizing those with fewest reviews.
 * Reads from the TanStack Query cache (dashboard data) — returns null if cache is unavailable.
 */
export function useNextUnreviewed(currentSubmissionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMemo(() => {
    if (!currentSubmissionId) return null;

    const data = queryClient.getQueryData<ReviewerDashboardData>(
      queryKeys.cfp.reviewer.dashboard()
    );

    if (!data?.submissions) return null;

    const candidates = data.submissions
      .filter((s) => !s.my_review && s.id !== currentSubmissionId)
      .sort((a, b) => (a.stats.review_count || 0) - (b.stats.review_count || 0));

    return candidates[0]?.id ?? null;
  }, [queryClient, currentSubmissionId]);
}
