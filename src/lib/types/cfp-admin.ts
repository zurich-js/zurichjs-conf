/**
 * CFP Admin Types
 * Shared types for CFP admin dashboard components
 */

import type { ShortlistStatus } from '@/lib/cfp/scoring';

// Re-export CfpStats from the canonical location
export type { CfpStats } from './cfp/admin';

export type CfpTab = 'submissions' | 'speakers' | 'reviewers' | 'tags' | 'insights';

export interface CfpAdminSpeaker {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  bluesky_handle: string | null;
  mastodon_handle: string | null;
  profile_image_url: string | null;
  is_visible: boolean;
  is_featured: boolean;
  city: string | null;
  country: string | null;
  travel_assistance_required: boolean | null;
  assistance_type: 'travel' | 'accommodation' | 'both' | null;
  departure_airport: string | null;
  special_requirements: string | null;
  company_interested_in_sponsoring: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CfpAdminSubmission {
  id: string;
  title: string;
  abstract: string;
  submission_type: string;
  talk_level: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  outline?: string | null;
  target_audience?: string | null;
  workshop_duration_hours: number | null;
  workshop_expected_compensation: string | null;
  workshop_compensation_amount: number | null;
  workshop_special_requirements: string | null;
  workshop_max_participants: number | null;
  speaker: {
    first_name: string;
    last_name: string;
    email: string;
    job_title?: string | null;
    company?: string | null;
    bio?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    twitter_handle?: string | null;
    bluesky_handle?: string | null;
    mastodon_handle?: string | null;
    profile_image_url?: string | null;
    tshirt_size?: string | null;
    company_interested_in_sponsoring?: boolean | null;
    city?: string | null;
    country?: string | null;
    travel_assistance_required?: boolean | null;
    assistance_type?: 'travel' | 'accommodation' | 'both' | null;
    departure_airport?: string | null;
    special_requirements?: string | null;
  };
  tags: Array<{ id: string; name: string }>;
  stats: CfpAdminSubmissionStats;
}

export interface CfpAdminSubmissionStats {
  review_count: number;
  avg_overall: number | null;
  total_reviewers: number;
  coverage_ratio: number;
  coverage_percent: number;
  last_reviewed_at: string | null;
  shortlist_status: ShortlistStatus;
}

export interface CfpSpeakerSubmission {
  id: string;
  title: string;
  status: string;
  submission_type: string;
}

export interface CfpAdminReviewer {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  can_see_speaker_identity: boolean;
  accepted_at: string | null;
  created_at: string;
}

export interface CfpAdminReviewerWithActivity extends CfpAdminReviewer {
  total_reviews: number;
  reviews_last_7_days: number;
  last_activity_at: string | null;
  avg_score_given: number | null;
}

export interface CfpReviewerActivity {
  id: string;
  submission_id: string;
  submission_title: string;
  score_overall: number | null;
  private_notes: string | null;
  created_at: string;
}

export interface CfpAdminTag {
  id: string;
  name: string;
  is_suggested: boolean;
  created_at: string;
}

export interface CfpReviewWithReviewer {
  id: string;
  submission_id: string;
  reviewer_id: string;
  score_overall: number | null;
  score_relevance: number | null;
  score_technical_depth: number | null;
  score_clarity: number | null;
  score_diversity: number | null;
  private_notes: string | null;
  feedback_to_speaker: string | null;
  created_at: string;
  updated_at: string;
  reviewer: {
    id: string;
    name: string | null;
    email: string;
  };
}

export type ReviewerRole = 'super_admin' | 'anonymous' | 'readonly';

export interface CfpInsights {
  byStatus: Record<ShortlistStatus, number>;
  byScoreBucket: Record<string, number>;
  byCoverageBucket: Record<string, number>;
}

// Query keys for React Query
export const cfpQueryKeys = {
  stats: ['cfp', 'stats'] as const,
  submissions: (status?: string) => ['cfp', 'submissions', status] as const,
  submissionDetail: (id: string) => ['cfp', 'submission', id] as const,
  speakers: ['cfp', 'speakers'] as const,
  reviewers: ['cfp', 'reviewers'] as const,
  reviewerActivity: (id: string, dateRange?: string) => ['cfp', 'reviewer', id, 'activity', dateRange] as const,
  tags: ['cfp', 'tags'] as const,
  insights: ['cfp', 'insights'] as const,
};

// Status action descriptions for admin actions
export const STATUS_ACTIONS: Record<string, { action: string; description: string }> = {
  shortlisted: { action: 'Shortlist', description: 'Mark as top candidate for final selection round.' },
  accepted: { action: 'Accept', description: 'Confirm this talk for the conference. Speaker will be notified.' },
  waitlisted: { action: 'Waitlist', description: 'Keep as backup. May be accepted if space opens up.' },
  rejected: { action: 'Reject', description: 'Decline this submission. Speaker will be notified of decision.' },
  under_review: { action: 'Mark for Review', description: 'Move back to review queue for committee evaluation.' },
  draft: { action: 'Revert to Draft', description: 'Allow speaker to continue editing before resubmitting.' },
  withdrawn: { action: 'Mark as Withdrawn', description: 'Speaker has withdrawn their submission.' },
};
