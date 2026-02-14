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

export async function fetchStats(): Promise<CfpStats> {
  const res = await fetch('/api/admin/cfp/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchSubmissions(status?: string): Promise<{ submissions: CfpAdminSubmission[] }> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  const res = await fetch(`/api/admin/cfp/submissions?${params}`);
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
