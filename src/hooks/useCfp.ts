/**
 * CFP (Call for Papers) React Query Hooks
 * Custom hooks for fetching and managing CFP data with TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  speakerQueryOptions,
  submissionsQueryOptions,
  submissionQueryOptions,
  suggestedTagsQueryOptions,
  travelQueryOptions,
  flightsQueryOptions,
  reimbursementsQueryOptions,
  reviewerDashboardQueryOptions,
  reviewerSubmissionQueryOptions,
} from '@/lib/queries/cfp';
import { endpoints } from '@/lib/api';
import type {
  CfpSpeaker,
  CfpTag,
  CfpReviewer,
  CfpReview,
  CfpSubmissionStats,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerReimbursement,
  CfpSubmission,
} from '@/lib/types/cfp';

// ============================================
// SPEAKER HOOKS
// ============================================

/**
 * Hook to fetch current speaker profile
 */
export function useCfpSpeaker() {
  const query = useQuery(speakerQueryOptions);

  return {
    speaker: query.data?.speaker ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to update speaker profile
 */
export function useUpdateSpeaker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSpeaker>) => {
      const response = await fetch(endpoints.cfp.speaker(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.speaker() });
    },
  });
}

// ============================================
// SUBMISSIONS HOOKS
// ============================================

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
  });
}

// ============================================
// TAGS HOOKS
// ============================================

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

// ============================================
// TRAVEL HOOKS
// ============================================

/**
 * Hook to fetch travel information
 */
export function useCfpTravel() {
  const query = useQuery(travelQueryOptions);

  return {
    travel: query.data?.travel ?? null,
    flights: query.data?.flights ?? [],
    accommodation: query.data?.accommodation ?? null,
    reimbursements: query.data?.reimbursements ?? [],
    hasAcceptedSubmission: query.data?.hasAcceptedSubmission ?? false,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to update travel details
 */
export function useUpdateTravel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSpeakerTravel>) => {
      const response = await fetch(endpoints.cfp.travel(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to update travel details');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

/**
 * Hook to fetch flights
 */
export function useCfpFlights() {
  const query = useQuery(flightsQueryOptions);

  return {
    flights: query.data?.flights ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to add/update a flight
 */
export function useSaveFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<CfpSpeakerFlight> }) => {
      const url = id ? endpoints.cfp.flight(id) : endpoints.cfp.flights();
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to save flight');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.flights() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

/**
 * Hook to delete a flight
 */
export function useDeleteFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(endpoints.cfp.flight(id), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to delete flight');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.flights() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

/**
 * Hook to fetch reimbursements
 */
export function useCfpReimbursements() {
  const query = useQuery(reimbursementsQueryOptions);

  return {
    reimbursements: query.data?.reimbursements ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook to submit a reimbursement request
 */
export function useSubmitReimbursement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CfpSpeakerReimbursement>) => {
      const response = await fetch(endpoints.cfp.reimbursements(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to submit reimbursement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reimbursements() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.travel() });
    },
  });
}

// ============================================
// REVIEWER HOOKS
// ============================================

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
 */
export function useCfpReviewerDashboard(userId: string, email: string) {
  const query = useQuery(reviewerDashboardQueryOptions(userId, email));

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
 */
export function useCfpReviewerSubmission(id: string, userId: string, email: string) {
  const query = useQuery(reviewerSubmissionQueryOptions(id, userId, email));

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
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      data,
      userId,
      isUpdate = false,
    }: {
      submissionId: string;
      data: Partial<CfpReview>;
      userId: string;
      isUpdate?: boolean;
    }) => {
      const response = await fetch(endpoints.cfp.reviewerSubmitReview(submissionId), {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, userId }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Failed to submit review');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reviewer.dashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cfp.reviewer.submission(variables.submissionId) });
    },
  });
}
