/**
 * CFP Request Types
 * API request types for CFP operations
 */

import type {
  CfpTalkLevel,
  CfpTshirtSize,
  CfpAssistanceType,
  CfpFlightDirection,
  CfpReimbursementType,
} from './base';

/**
 * Create speaker profile request
 */
export interface CreateCfpSpeakerRequest {
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
}

/**
 * Update speaker profile request
 */
export interface UpdateCfpSpeakerRequest {
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company?: string;
  city?: string;
  country?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  twitter_handle?: string;
  bluesky_handle?: string;
  mastodon_handle?: string;
  profile_image_url?: string;
  tshirt_size?: CfpTshirtSize | null;
  travel_assistance_required?: boolean | null;
  assistance_type?: CfpAssistanceType;
  departure_airport?: string | null;
  company_interested_in_sponsoring?: boolean | null;
  is_visible?: boolean;
}

/**
 * Create submission request (talk)
 */
export interface CreateTalkSubmissionRequest {
  title: string;
  abstract: string;
  submission_type: 'lightning' | 'standard';
  talk_level: CfpTalkLevel;
  tags: string[];
  additional_notes?: string;
  outline?: string;
  slides_url?: string;
  previous_recording_url?: string;
  // Travel fields are now at speaker profile level (deprecated)
  travel_assistance_required?: boolean;
  travel_origin?: string;
  company_can_cover_travel?: boolean;
  special_requirements?: string;
}

/**
 * Create submission request (workshop)
 */
export interface CreateWorkshopSubmissionRequest {
  title: string;
  abstract: string;
  submission_type: 'workshop';
  talk_level: CfpTalkLevel;
  tags: string[];
  additional_notes?: string;
  outline?: string;
  slides_url?: string;
  previous_recording_url?: string;
  // Travel fields are now at speaker profile level (deprecated)
  travel_assistance_required?: boolean;
  travel_origin?: string;
  company_can_cover_travel?: boolean;
  special_requirements?: string;
  workshop_duration_hours: number;
  workshop_expected_compensation?: string;
  workshop_compensation_amount?: number;
  workshop_special_requirements?: string;
  workshop_max_participants?: number;
}

/**
 * Create submission request (union type)
 */
export type CreateCfpSubmissionRequest =
  | CreateTalkSubmissionRequest
  | CreateWorkshopSubmissionRequest;

/**
 * Update submission request
 */
export interface UpdateCfpSubmissionRequest {
  title?: string;
  abstract?: string;
  talk_level?: CfpTalkLevel;
  tags?: string[];
  additional_notes?: string;
  outline?: string;
  slides_url?: string;
  previous_recording_url?: string;
  travel_assistance_required?: boolean;
  travel_origin?: string;
  company_can_cover_travel?: boolean;
  special_requirements?: string;
  // Workshop fields
  workshop_duration_hours?: number;
  workshop_expected_compensation?: string;
  workshop_compensation_amount?: number;
  workshop_special_requirements?: string;
  workshop_max_participants?: number;
}

/**
 * Create review request
 */
export interface CreateCfpReviewRequest {
  score_overall: number;
  score_relevance?: number;
  score_technical_depth?: number;
  score_clarity?: number;
  score_diversity?: number;
  private_notes?: string;
  feedback_to_speaker?: string;
}

/**
 * Invite reviewer request
 */
export interface InviteCfpReviewerRequest {
  email: string;
  name?: string;
  role?: 'reviewer' | 'readonly';
  can_see_speaker_identity?: boolean;
}

/**
 * Update speaker travel request
 */
export interface UpdateCfpSpeakerTravelRequest {
  arrival_date?: string;
  departure_date?: string;
  attending_speakers_dinner?: boolean;
  attending_speakers_activities?: boolean;
  dietary_restrictions?: string;
  accessibility_needs?: string;
}

/**
 * Create flight request
 */
export interface CreateCfpFlightRequest {
  direction: CfpFlightDirection;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  booking_reference?: string;
  cost_amount?: number;
  cost_currency?: string;
}

/**
 * Create reimbursement request
 */
export interface CreateCfpReimbursementRequest {
  expense_type: CfpReimbursementType;
  description: string;
  amount: number;
  currency?: string;
  bank_name?: string;
  bank_account_holder?: string;
  iban?: string;
  swift_bic?: string;
}
