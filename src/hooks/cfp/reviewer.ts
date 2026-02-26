/**
 * CFP Reviewer Hooks
 * Hooks for reviewer dashboard and review submission
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { reviewerDashboardQueryOptions, reviewerSubmissionQueryOptions } from '@/lib/queries/cfp';
import { endpoints } from '@/lib/api';
import { trackCfpReviewError } from '@/lib/analytics/helpers';
import type {
  CfpSpeaker,
  CfpTag,
  CfpReviewer,
  CfpReview,
  CfpSubmissionStats,
  CfpSubmission,
} from '@/lib/types/cfp';

export interface ReviewerDashboardData {
  reviewer: CfpReviewer | null;
  submissions: Array<CfpSubmission & {
    tags?: CfpTag[];
    speaker?: CfpSpeaker | null;
    my_review?: CfpReview | null;
    stats: CfpSubmissionStats;
  }>;
  stats: {
    total: number;
    reviewed: number;
    pending: number;
  };
}

/**
 * Hook to fetch reviewer dashboard
 * Uses session-based authentication
 */
export function useCfpReviewerDashboard(search?: string) {
  const query = useQuery(reviewerDashboardQueryOptions(search));

  return {
    reviewer: query.data?.reviewer ?? null,
    submissions: query.data?.submissions ?? [],
    stats: query.data?.stats ?? { total: 0, reviewed: 0, pending: 0 },
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export interface ReviewerSubmissionData {
  submission: (CfpSubmission & {
    speaker?: CfpSpeaker | null;
    tags?: CfpTag[];
    my_review?: CfpReview | null;
    all_reviews?: CfpReview[];
    stats: CfpSubmissionStats;
  }) | null;
  reviewer: CfpReviewer | null;
}

/**
 * Hook to fetch a submission for reviewer
 * Uses session-based authentication
 */
export function useCfpReviewerSubmission(id: string) {
  const query = useQuery(reviewerSubmissionQueryOptions(id));

  return {
    submission: query.data?.submission ?? null,
    reviewer: query.data?.reviewer ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to submit a review
 * Uses session-based authentication
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      data,
      isUpdate = false,
    }: {
      submissionId: string;
      data: Partial<CfpReview>;
      isUpdate?: boolean;
    }) => {
      const response = await fetch(endpoints.cfp.reviewerSubmitReview(submissionId), {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to submit review');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reviewer.dashboardBase() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reviewer.submission(variables.submissionId) });
    },
    onError: (error, variables) => {
      trackCfpReviewError({
        action: variables.isUpdate ? 'update' : 'submit',
        submissionId: variables.submissionId,
        errorMessage: error instanceof Error ? error.message : 'Failed to submit review',
      });
    },
  });
}
