/**
 * CFP (Call for Papers) queries for TanStack Query
 * Provides data fetching with 10-minute cache for all CFP operations
 */

import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { endpoints } from '@/lib/api';
import type {
  CfpSpeaker,
  CfpSubmission,
  CfpSubmissionWithDetails,
  CfpTag,
  CfpReviewer,
  CfpReview,
  CfpSubmissionStats,
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
  CfpSpeakerReimbursement,
} from '@/lib/types/cfp';

// ============================================
// CACHE CONFIGURATION
// ============================================

/**
 * 10-minute cache times for CFP data
 * Data is expensive to load, so we cache aggressively
 */
const CFP_STALE_TIME = 10 * 60 * 1000; // 10 minutes
const CFP_GC_TIME = 10 * 60 * 1000; // 10 minutes

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SpeakerResponse {
  speaker: CfpSpeaker;
}

export interface SubmissionsResponse {
  submissions: CfpSubmissionWithDetails[];
}

export interface SubmissionResponse {
  submission: CfpSubmissionWithDetails;
}

export interface SuggestedTagsResponse {
  tags: CfpTag[];
}

export interface TravelResponse {
  travel: CfpSpeakerTravel | null;
  flights: CfpSpeakerFlight[];
  accommodation: CfpSpeakerAccommodation | null;
  reimbursements: CfpSpeakerReimbursement[];
  hasAcceptedSubmission: boolean;
}

export interface FlightsResponse {
  flights: CfpSpeakerFlight[];
}

export interface ReimbursementsResponse {
  reimbursements: CfpSpeakerReimbursement[];
}

export interface ReviewerDashboardResponse {
  reviewer: CfpReviewer;
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

export interface ReviewerSubmissionResponse {
  submission: CfpSubmission & {
    speaker?: CfpSpeaker | null;
    tags?: CfpTag[];
    my_review?: CfpReview | null;
    all_reviews?: CfpReview[];
    stats: CfpSubmissionStats;
  };
  reviewer: CfpReviewer;
}

// ============================================
// FETCH FUNCTIONS
// ============================================

/**
 * Fetch speaker profile
 */
export async function fetchSpeaker(): Promise<SpeakerResponse> {
  const response = await fetch(endpoints.cfp.speaker(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch speaker profile');
  }

  return response.json();
}

/**
 * Fetch speaker's submissions
 */
export async function fetchSubmissions(): Promise<SubmissionsResponse> {
  const response = await fetch(endpoints.cfp.submissions(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch submissions');
  }

  return response.json();
}

/**
 * Fetch a single submission by ID
 */
export async function fetchSubmission(id: string): Promise<SubmissionResponse> {
  const response = await fetch(endpoints.cfp.submission(id), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch submission');
  }

  return response.json();
}

/**
 * Fetch suggested tags for submissions
 */
export async function fetchSuggestedTags(): Promise<SuggestedTagsResponse> {
  const response = await fetch(endpoints.cfp.suggestedTags(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch suggested tags');
  }

  return response.json();
}

/**
 * Fetch travel information for speaker
 */
export async function fetchTravel(): Promise<TravelResponse> {
  const response = await fetch(endpoints.cfp.travel(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch travel information');
  }

  return response.json();
}

/**
 * Fetch speaker's flights
 */
export async function fetchFlights(): Promise<FlightsResponse> {
  const response = await fetch(endpoints.cfp.flights(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch flights');
  }

  return response.json();
}

/**
 * Fetch speaker's reimbursements
 */
export async function fetchReimbursements(): Promise<ReimbursementsResponse> {
  const response = await fetch(endpoints.cfp.reimbursements(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch reimbursements');
  }

  return response.json();
}

/**
 * Fetch reviewer dashboard data
 * Uses session-based authentication via cookies
 */
export async function fetchReviewerDashboard(search?: string): Promise<ReviewerDashboardResponse> {
  const response = await fetch(endpoints.cfp.reviewerDashboard(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ search }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch reviewer dashboard');
  }

  return response.json();
}

/**
 * Fetch a submission for reviewer
 * Uses session-based authentication via cookies
 */
export async function fetchReviewerSubmission(
  id: string
): Promise<ReviewerSubmissionResponse> {
  const response = await fetch(endpoints.cfp.reviewerSubmission(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch submission');
  }

  return response.json();
}

// ============================================
// QUERY OPTIONS
// ============================================

/**
 * Query options for speaker profile
 */
export const speakerQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.speaker(),
  queryFn: fetchSpeaker,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for speaker's submissions
 */
export const submissionsQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.submissions(),
  queryFn: fetchSubmissions,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for a single submission
 */
export function submissionQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.cfp.submission(id),
    queryFn: () => fetchSubmission(id),
    staleTime: CFP_STALE_TIME,
    gcTime: CFP_GC_TIME,
    enabled: !!id,
  });
}

/**
 * Query options for suggested tags
 */
export const suggestedTagsQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.suggestedTags(),
  queryFn: fetchSuggestedTags,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for travel information
 */
export const travelQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.travel(),
  queryFn: fetchTravel,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for flights
 */
export const flightsQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.flights(),
  queryFn: fetchFlights,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for reimbursements
 */
export const reimbursementsQueryOptions = queryOptions({
  queryKey: queryKeys.cfp.reimbursements(),
  queryFn: fetchReimbursements,
  staleTime: CFP_STALE_TIME,
  gcTime: CFP_GC_TIME,
});

/**
 * Query options for reviewer dashboard
 * Uses session-based authentication
 */
export function reviewerDashboardQueryOptions(search?: string) {
  return queryOptions({
    queryKey: queryKeys.cfp.reviewer.dashboard(search),
    queryFn: () => fetchReviewerDashboard(search),
    placeholderData: keepPreviousData,
    staleTime: CFP_STALE_TIME,
    gcTime: CFP_GC_TIME,
  });
}

/**
 * Query options for reviewer submission
 * Uses session-based authentication
 */
export function reviewerSubmissionQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.cfp.reviewer.submission(id),
    queryFn: () => fetchReviewerSubmission(id),
    staleTime: CFP_STALE_TIME,
    gcTime: CFP_GC_TIME,
    enabled: !!id,
  });
}
