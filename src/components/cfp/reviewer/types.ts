/**
 * Reviewer Types and Constants
 * Shared types for CFP reviewer components
 */

export const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning Talk (15 min)',
  standard: 'Standard Talk (30 min)',
  workshop: 'Workshop',
};

// Note: The database field is 'score_diversity' but we display it as 'Originality'
// to better reflect what we're actually evaluating
export const SCORE_LABELS = {
  score_relevance: 'Relevance',
  score_technical_depth: 'Technical Depth',
  score_clarity: 'Clarity',
  score_diversity: 'Originality',
  score_overall: 'Overall Score',
} as const;

export const SCORE_DESCRIPTIONS = {
  score_relevance: 'How relevant is this to our audience?',
  score_technical_depth: 'Quality of technical content',
  score_clarity: 'How clear is the proposal?',
  score_diversity: 'Unique perspective or fresh topic',
  score_overall: 'Your overall impression',
} as const;

export const STATUS_INFO: Record<string, { label: string; description: string; color: string }> = {
  submitted: {
    label: 'Submitted',
    description: 'New submission awaiting initial review',
    color: 'blue',
  },
  under_review: {
    label: 'In Review',
    description: 'Being actively reviewed by the committee',
    color: 'purple',
  },
  waitlisted: {
    label: 'Waitlisted',
    description: 'Good submission held for final decisions based on schedule and program balance',
    color: 'orange',
  },
  accepted: {
    label: 'Accepted',
    description: 'Selected for the conference program - speaker will be notified',
    color: 'green',
  },
  rejected: {
    label: 'Rejected',
    description: 'Not selected - speaker will receive feedback if provided',
    color: 'red',
  },
};

export const STATUS_ACTIONS: Record<string, { label: string; description: string }> = {
  under_review: {
    label: 'Mark In Review',
    description: 'Move to active review - signals committee is evaluating this submission',
  },
  waitlisted: {
    label: 'Waitlist',
    description: 'Hold for later - good candidate but need to see full picture before deciding',
  },
  accepted: {
    label: 'Accept',
    description: 'Confirm for the conference - speaker will be invited to present',
  },
  rejected: {
    label: 'Reject',
    description: 'Decline submission - speaker will be notified with any feedback provided',
  },
};

export interface ReviewScores {
  score_overall: number;
  score_relevance: number;
  score_technical_depth: number;
  score_clarity: number;
  score_diversity: number;
}

export interface ReviewData {
  id: string;
  score_overall: number | null;
  score_relevance?: number | null;
  score_technical_depth?: number | null;
  score_clarity?: number | null;
  score_diversity?: number | null;
  private_notes?: string | null;
  feedback_to_speaker?: string | null;
  created_at: string;
  reviewer?: { name: string | null; email: string };
}

export interface Speaker {
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string | null;
  company?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_handle?: string | null;
  bluesky_handle?: string | null;
  mastodon_handle?: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface SubmissionStats {
  review_count: number;
  avg_overall?: number | null;
  avg_relevance?: number | null;
  avg_technical_depth?: number | null;
  avg_clarity?: number | null;
  avg_diversity?: number | null;
}

export interface Submission {
  id: string;
  title: string;
  abstract: string;
  submission_type: string;
  talk_level: string;
  status: string;
  outline?: string | null;
  additional_notes?: string | null;
  workshop_duration_hours?: number | null;
  workshop_max_participants?: number | null;
  travel_assistance_required: boolean;
  company_can_cover_travel: boolean;
  travel_origin?: string | null;
  speaker?: Speaker | null;
  tags?: Tag[];
  my_review?: {
    score_overall: number | null;
    score_relevance?: number | null;
    score_technical_depth?: number | null;
    score_clarity?: number | null;
    score_diversity?: number | null;
    private_notes?: string | null;
    feedback_to_speaker?: string | null;
  };
  all_reviews?: ReviewData[];
  stats: SubmissionStats;
}

export interface Reviewer {
  role: 'reviewer' | 'readonly' | 'super_admin';
  name?: string | null;
  email: string;
  can_see_speaker_identity: boolean;
}

// Dashboard filter options
export const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'standard', label: 'Standard' },
  { value: 'workshop', label: 'Workshop' },
];

export const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'most_reviews', label: 'Most Reviews' },
  { value: 'least_reviews', label: 'Least Reviews' },
  { value: 'highest_avg', label: 'Highest Avg Score' },
  { value: 'lowest_avg', label: 'Lowest Avg Score' },
];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export type ReviewFilterType = 'all' | 'reviewed' | 'pending';

export interface DashboardFilters {
  reviewFilter: ReviewFilterType;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  levelFilter: string;
  sortBy: string;
}
