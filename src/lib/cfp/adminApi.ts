/**
 * CFP Admin API Functions
 * Shared API fetching functions for CFP admin components
 */

import type {
  CfpStats,
  CfpAdminSubmission,
  CfpAdminSpeaker,
  CfpAdminReviewer,
  CfpAdminTag,
  CfpReviewWithReviewer,
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

export async function fetchSubmissionDetail(id: string): Promise<{
  submission: CfpAdminSubmission;
  reviews: CfpReviewWithReviewer[];
}> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch submission detail');
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

export async function updateSubmission(
  id: string,
  data: Partial<CfpAdminSubmission>
): Promise<{ submission: CfpAdminSubmission }> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update submission');
  return res.json();
}

export async function deleteSubmission(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete submission');
}

export async function inviteReviewer(data: {
  email: string;
  name?: string;
  role: string;
}): Promise<{ reviewer: CfpAdminReviewer }> {
  const res = await fetch('/api/admin/cfp/reviewers/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to invite reviewer');
  }
  return res.json();
}

export async function updateReviewer(
  id: string,
  data: Partial<CfpAdminReviewer>
): Promise<{ reviewer: CfpAdminReviewer }> {
  const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update reviewer');
  return res.json();
}

export async function deleteReviewer(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete reviewer');
}

export async function resendReviewerInvite(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/reviewers/${id}/resend`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to resend invite');
}

export async function createTag(name: string, isSuggested: boolean): Promise<{ tag: CfpAdminTag }> {
  const res = await fetch('/api/admin/cfp/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, is_suggested: isSuggested }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create tag');
  }
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/tags?id=${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete tag');
}

export async function updateSpeaker(
  id: string,
  data: Partial<CfpAdminSpeaker>
): Promise<{ speaker: CfpAdminSpeaker }> {
  const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update speaker');
  return res.json();
}

export async function deleteSpeaker(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete speaker');
}

export async function createSpeaker(data: {
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  company?: string;
  bio?: string;
}): Promise<{ speaker: CfpAdminSpeaker }> {
  const res = await fetch('/api/admin/cfp/speakers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create speaker');
  }
  return res.json();
}
