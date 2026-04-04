/**
 * CFP Admin Types
 * Admin-specific types for CFP management
 */

import type {
  CfpSubmissionType,
  CfpTalkLevel,
  CfpSubmissionStatus,
} from './base';
import type { CfpSpeaker, CfpTag, CfpSubmission } from './entities';
import type {
  CfpSpeakerTravel,
  CfpSpeakerFlight,
  CfpSpeakerAccommodation,
} from './travel';

/**
 * Submission list filters for admin
 */
export interface CfpSubmissionFilters {
  status?: CfpSubmissionStatus | CfpSubmissionStatus[];
  submission_type?: CfpSubmissionType | CfpSubmissionType[];
  talk_level?: CfpTalkLevel | CfpTalkLevel[];
  travel_assistance_required?: boolean;
  company_can_cover_travel?: boolean;
  tag_ids?: string[];
  search?: string;
  sort_by?: 'created_at' | 'avg_score' | 'review_count' | 'title' | 'coverage' | 'last_reviewed';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  min_review_count?: number;
  shortlist_only?: boolean;
}

/**
 * Submission with review stats for admin list
 */
export interface CfpSubmissionWithStats extends CfpSubmission {
  speaker: CfpSpeaker;
  tags: CfpTag[];
  stats: {
    submission_id: string;
    review_count: number;
    avg_overall: number | null;
    avg_relevance: number | null;
    avg_technical_depth: number | null;
    avg_clarity: number | null;
    avg_diversity: number | null;
    total_reviewers: number;
    coverage_ratio: number;
    coverage_percent: number;
    last_reviewed_at: string | null;
    shortlist_status: string;
  };
}

/**
 * Admin travel dashboard entry
 */
export interface CfpTravelDashboardEntry {
  speaker: CfpSpeaker;
  travel: CfpSpeakerTravel | null;
  inbound_flight: CfpSpeakerFlight | null;
  outbound_flight: CfpSpeakerFlight | null;
  accommodation: CfpSpeakerAccommodation | null;
  pending_reimbursements_count: number;
  total_reimbursements_amount: number;
}

/**
 * CFP statistics for admin dashboard
 */
export interface CfpStats {
  total_submissions: number;
  submissions_by_status: Record<CfpSubmissionStatus, number>;
  submissions_by_type: Record<CfpSubmissionType, number>;
  submissions_by_level: Record<CfpTalkLevel, number>;
  total_speakers: number;
  total_reviews: number;
  total_reviewers: number;
  active_reviewers_7d: number;
  avg_reviews_per_submission: number;
  travel_assistance_requested: number;
  accepted_speakers_count: number;
  travel_confirmed_count: number;
}

/**
 * Admin request to create a speaker manually (not through CFP flow)
 */
export interface AdminCreateSpeakerRequest {
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  company?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  twitter_handle?: string;
  bluesky_handle?: string;
  mastodon_handle?: string;
  profile_image_url?: string;
  header_image_url?: string;
  is_visible?: boolean;
}

/**
 * Admin request to create a session for a speaker
 */
export interface AdminCreateSessionRequest {
  speaker_id: string;
  title: string;
  abstract: string;
  submission_type: CfpSubmissionType;
  talk_level: CfpTalkLevel;
  tags?: string[];
  status?: CfpSubmissionStatus;
  // Scheduling (all optional for TBD)
  scheduled_date?: string;
  scheduled_start_time?: string;
  scheduled_duration_minutes?: number;
  room?: string;
  // Workshop fields
  workshop_duration_hours?: number;
  workshop_max_participants?: number;
}

/**
 * Admin request to update session scheduling
 */
export interface AdminUpdateSessionScheduleRequest {
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_duration_minutes?: number | null;
  room?: string | null;
}
