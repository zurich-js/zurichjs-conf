/**
 * CFP Submission Hooks
 * Hooks for managing CFP submissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { submissionsQueryOptions, submissionQueryOptions, suggestedTagsQueryOptions } from '@/lib/queries/cfp';
import { endpoints } from '@/lib/api';
import { trackCfpSubmissionError } from '@/lib/analytics/helpers';
import type { CfpSubmission } from '@/lib/types/cfp';

/**
 * Hook to fetch speaker's submissions
 */
export function useCfpSubmissions() {
  const query = useQuery(submissionsQueryOptions);

  return {
    submissions: query.data?.submissions ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single submission
 */
export function useCfpSubmission(id: string) {
  const query = useQuery(submissionQueryOptions(id));

  return {
    submission: query.data?.submission ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to create a new submission
 */
export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSubmission> & { tags?: string[] }) => {
      const response = await fetch(endpoints.cfp.submissions(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to create submission');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submissions() });
    },
    onError: (error) => {
      trackCfpSubmissionError({
        action: 'create',
        errorMessage: error instanceof Error ? error.message : 'Failed to create submission',
      });
    },
  });
}

/**
 * Hook to update a submission
 */
export function useUpdateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CfpSubmission> & { tags?: string[] } }) => {
      const response = await fetch(endpoints.cfp.submission(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update submission');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submission(variables.id) });
    },
    onError: (error, variables) => {
      trackCfpSubmissionError({
        action: 'update',
        submissionId: variables.id,
        errorMessage: error instanceof Error ? error.message : 'Failed to update submission',
      });
    },
  });
}

/**
 * Hook to submit a submission for review
 */
export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(endpoints.cfp.submitForReview(id), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to submit for review');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submission(id) });
    },
    onError: (error, id) => {
      trackCfpSubmissionError({
        action: 'submit',
        submissionId: id,
        errorMessage: error instanceof Error ? error.message : 'Failed to submit for review',
      });
    },
  });
}

/**
 * Hook to withdraw a submission
 */
export function useWithdrawSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(endpoints.cfp.withdrawSubmission(id), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to withdraw submission');
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submission(id) });
    },
    onError: (error, id) => {
      trackCfpSubmissionError({
        action: 'withdraw',
        submissionId: id,
        errorMessage: error instanceof Error ? error.message : 'Failed to withdraw submission',
      });
    },
  });
}

/**
 * Hook to delete a submission
 */
export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(endpoints.cfp.submission(id), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to delete submission');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.submissions() });
    },
    onError: (error, id) => {
      trackCfpSubmissionError({
        action: 'delete',
        submissionId: id,
        errorMessage: error instanceof Error ? error.message : 'Failed to delete submission',
      });
    },
  });
}

/**
 * Hook to fetch suggested tags
 */
export function useCfpSuggestedTags() {
  const query = useQuery(suggestedTagsQueryOptions);

  return {
    tags: query.data?.tags ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
