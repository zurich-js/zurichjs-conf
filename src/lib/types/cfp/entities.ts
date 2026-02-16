/**
 * CFP Core Entities
 * Speaker, Tag, and Submission types
 */

import type {
  CfpSubmissionType,
  CfpTalkLevel,
  CfpSubmissionStatus,
  CfpTshirtSize,
  CfpAssistanceType,
} from './base';
import type { CfpReview } from './reviews';

/**
 * Speaker profile for CFP
 */
export interface CfpSpeaker {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  city: string | null; // City for travel logistics
  country: string | null; // Country for travel logistics
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  bluesky_handle: string | null;
  mastodon_handle: string | null;
  profile_image_url: string | null;
  tshirt_size: CfpTshirtSize | null;
  travel_assistance_required: boolean | null; // Whether speaker needs travel/accommodation covered
  assistance_type: CfpAssistanceType; // What type of assistance: travel, accommodation, or both
  departure_airport: string | null; // Closest airport IATA code for travel planning
  special_requirements: string | null; // Accessibility needs, dietary restrictions, etc.
  company_interested_in_sponsoring: boolean | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Tag for categorizing submissions
 */
export interface CfpTag {
  id: string;
  name: string;
  is_suggested: boolean;
  created_at: string;
}

/**
 * Talk or workshop submission
 */
export interface CfpSubmission {
  id: string;
  speaker_id: string;

  // Common fields
  title: string;
  abstract: string;
  submission_type: CfpSubmissionType;
  talk_level: CfpTalkLevel;
  additional_notes: string | null;
  outline: string | null;
  slides_url: string | null;
  previous_recording_url: string | null;

  // Travel logistics
  travel_assistance_required: boolean;
  travel_origin: string | null; // City/location the speaker would fly from
  company_can_cover_travel: boolean;
  special_requirements: string | null;

  // Workshop-specific fields (null for talks)
  workshop_duration_hours: number | null;
  workshop_expected_compensation: string | null;
  workshop_compensation_amount: number | null;
  workshop_special_requirements: string | null;
  workshop_max_participants: number | null;

  // Scheduling fields (null = TBD)
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_duration_minutes: number | null;
  room: string | null;

  // Status
  status: CfpSubmissionStatus;
  submitted_at: string | null;
  withdrawn_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Decision fields (populated from DB, used for speaker-visible status)
  decision_status?: 'undecided' | 'accepted' | 'rejected' | null;
  decision_email_sent_at?: string | null;

  // Populated via joins (optional)
  tags?: CfpTag[];
  speaker?: CfpSpeaker;
  reviews?: CfpReview[];
}

/**
 * Submission with speaker and tags populated
 */
export interface CfpSubmissionWithDetails extends CfpSubmission {
  speaker: CfpSpeaker;
  tags: CfpTag[];
}
