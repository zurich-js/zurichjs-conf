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

export async function fetchStats(): Promise<CfpStats> {
  const res = await fetch('/api/admin/cfp/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export interface SubmissionQueryParams {
  status?: string;
  submission_type?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
  min_review_count?: number;
  shortlist_only?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchSubmissions(
  params: SubmissionQueryParams = {}
): Promise<{ submissions: CfpAdminSubmission[]; total: number; totalUnfiltered: number }> {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.submission_type && params.submission_type !== 'all') searchParams.set('submission_type', params.submission_type);
  if (params.search) searchParams.set('search', params.search);
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.sort_order) searchParams.set('sort_order', params.sort_order);
  if (params.min_review_count && params.min_review_count > 0) searchParams.set('min_review_count', String(params.min_review_count));
  if (params.shortlist_only) searchParams.set('shortlist_only', 'true');
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
