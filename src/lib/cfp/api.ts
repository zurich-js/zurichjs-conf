/**
 * CFP Admin API Functions
 * Fetch functions for CFP admin dashboard
 */

import type {
  CfpStats,
  CfpAdminSubmission,
  CfpAdminSpeaker,
  CfpAdminReviewer,
  CfpAdminReviewerWithActivity,
  CfpReviewerActivity,
  CfpAdminTag,
  CfpInsights,
} from '@/lib/types/cfp-admin';
import type { CfpAnalytics } from '@/lib/types/cfp-analytics';
import type { SubmissionSortRule } from '@/lib/types/cfp/admin';

export async function fetchStats(): Promise<CfpStats> {
  const res = await fetch('/api/admin/cfp/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export interface SubmissionQueryParams {
  statuses?: string[];
  types?: string[];
  shortlistStatuses?: string[];
  decisionStatuses?: string[];
  emailStates?: string[];
  status?: string;
  submission_type?: string;
  search?: string;
  sort?: SubmissionSortRule[];
  sort_by?: string;
  sort_order?: string;
  min_review_count?: number;
  shortlist_only?: boolean;
  coverage_min?: number;
  coverage_max?: number;
  limit?: number;
  offset?: number;
}

export async function fetchSubmissions(
  params: SubmissionQueryParams = {}
): Promise<{ submissions: CfpAdminSubmission[]; total: number; totalUnfiltered: number }> {
  const searchParams = new URLSearchParams();
  if (params.statuses?.length) {
    params.statuses.forEach((status) => searchParams.append('statuses', status));
  }
  if (params.types?.length) {
    params.types.forEach((type) => searchParams.append('types', type));
  }
  if (params.shortlistStatuses?.length) {
    params.shortlistStatuses.forEach((status) => searchParams.append('shortlistStatuses', status));
  }
  if (params.decisionStatuses?.length) {
    params.decisionStatuses.forEach((status) => searchParams.append('decisionStatuses', status));
  }
  if (params.emailStates?.length) {
    params.emailStates.forEach((state) => searchParams.append('emailStates', state));
  }
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.submission_type && params.submission_type !== 'all') searchParams.set('submission_type', params.submission_type);
  if (params.search) searchParams.set('search', params.search);
  if (params.sort?.length) searchParams.set('sort', JSON.stringify(params.sort));
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.sort_order) searchParams.set('sort_order', params.sort_order);
  if (params.min_review_count && params.min_review_count > 0) searchParams.set('min_review_count', String(params.min_review_count));
  if (params.shortlist_only) searchParams.set('shortlist_only', 'true');
  if (typeof params.coverage_min === 'number') searchParams.set('coverage_min', String(params.coverage_min));
  if (typeof params.coverage_max === 'number') searchParams.set('coverage_max', String(params.coverage_max));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));
  const res = await fetch(`/api/admin/cfp/submissions?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
}

export async function fetchSpeakers(): Promise<{ speakers: CfpAdminSpeaker[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

export async function fetchReviewers(): Promise<{ reviewers: CfpAdminReviewer[] }> {
  const res = await fetch('/api/admin/cfp/reviewers');
  if (!res.ok) throw new Error('Failed to fetch reviewers');
  return res.json();
}

export async function fetchTags(): Promise<{ tags: CfpAdminTag[] }> {
  const res = await fetch('/api/admin/cfp/tags');
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function updateSubmissionStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export interface BulkDecisionResult {
  success: number;
  failed: number;
  errors: Array<{ submission_id: string; error: string }>;
}

export async function bulkDecideSubmissions(
  submissionIds: string[],
  decision: 'accepted' | 'rejected',
  notes?: string
): Promise<BulkDecisionResult> {
  const res = await fetch('/api/admin/cfp/submissions/bulk-decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_ids: submissionIds, decision, notes }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to apply bulk decision');
  }
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch('/api/admin/cfp/tags', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete tag');
  }
}

export async function fetchReviewersWithActivity(): Promise<{ reviewers: CfpAdminReviewerWithActivity[] }> {
  const res = await fetch('/api/admin/cfp/reviewers?withActivity=true');
  if (!res.ok) throw new Error('Failed to fetch reviewers with activity');
  return res.json();
}

export async function fetchReviewerActivity(
  reviewerId: string,
  dateRange?: '7d' | '30d' | 'all'
): Promise<{ activities: CfpReviewerActivity[]; total: number }> {
  const params = new URLSearchParams();
  if (dateRange) params.set('dateRange', dateRange);
  const res = await fetch(`/api/admin/cfp/reviewers/${reviewerId}/activity?${params}`);
  if (!res.ok) throw new Error('Failed to fetch reviewer activity');
  return res.json();
}

export async function fetchInsights(): Promise<{ insights: CfpInsights }> {
  const res = await fetch('/api/admin/cfp/insights');
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchAnalytics(): Promise<{ analytics: CfpAnalytics }> {
  const res = await fetch('/api/admin/cfp/analytics');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}
