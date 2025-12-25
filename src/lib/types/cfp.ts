/**
 * CFP (Call for Papers) Types
 * TypeScript types for the CFP system
 */

// ============================================
// ENUMS
// ============================================

/**
 * Submission type - lightning talk, standard talk, or workshop
 */
export type CfpSubmissionType = 'lightning' | 'standard' | 'workshop';

/**
 * Talk difficulty level
 */
export type CfpTalkLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Submission lifecycle status
 */
export type CfpSubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'waitlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

/**
 * Reviewer role for access control
 */
export type CfpReviewerRole = 'super_admin' | 'reviewer' | 'readonly';

/**
 * Flight direction
 */
export type CfpFlightDirection = 'inbound' | 'outbound';

/**
 * Flight tracking status
 */
export type CfpFlightStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'boarding'
  | 'departed'
  | 'arrived'
  | 'cancelled'
  | 'delayed';

/**
 * Reimbursement request status
 */
export type CfpReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';

/**
 * Expense type for reimbursements
 */
export type CfpReimbursementType = 'flight' | 'accommodation' | 'transport' | 'other';

// ============================================
// CORE ENTITIES
// ============================================

/**
 * T-shirt sizes available for speakers
 */
export type CfpTshirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';

/**
 * Type of travel/accommodation assistance needed
 */
export type CfpAssistanceType = 'travel' | 'accommodation' | 'both' | null;

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

// ============================================
// REVIEW ENTITIES
// ============================================

/**
 * CFP Reviewer
 */
export interface CfpReviewer {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  role: CfpReviewerRole;
  can_see_speaker_identity: boolean;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Review scores and feedback
 */
export interface CfpReview {
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

  // Populated via join (optional)
  reviewer?: CfpReviewer;
}

/**
 * Aggregated review statistics for a submission
 */
export interface CfpSubmissionStats {
  submission_id: string;
  review_count: number;
  avg_overall: number | null;
  avg_relevance: number | null;
  avg_technical_depth: number | null;
  avg_clarity: number | null;
  avg_diversity: number | null;
}

// ============================================
// TRAVEL ENTITIES
// ============================================

/**
 * Speaker travel logistics
 */
export interface CfpSpeakerTravel {
  id: string;
  speaker_id: string;
  arrival_date: string | null;
  departure_date: string | null;
  attending_speakers_dinner: boolean | null;
  attending_speakers_activities: boolean | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  flight_budget_amount: number | null;
  flight_budget_currency: string;
  travel_confirmed: boolean;
  confirmed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker flight details
 */
export interface CfpSpeakerFlight {
  id: string;
  speaker_id: string;
  direction: CfpFlightDirection;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  booking_reference: string | null;
  flight_status: CfpFlightStatus;
  tracking_url: string | null;
  last_status_update: string | null;
  cost_amount: number | null;
  cost_currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker accommodation details
 */
export interface CfpSpeakerAccommodation {
  id: string;
  speaker_id: string;
  hotel_name: string | null;
  hotel_address: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  reservation_number: string | null;
  reservation_confirmation_url: string | null;
  cost_amount: number | null;
  cost_currency: string;
  is_covered_by_conference: boolean;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker expense reimbursement
 */
export interface CfpSpeakerReimbursement {
  id: string;
  speaker_id: string;
  expense_type: CfpReimbursementType;
  description: string;
  amount: number;
  currency: string;
  receipt_url: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  iban: string | null;
  swift_bic: string | null;
  status: CfpReimbursementStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONFIG
// ============================================

/**
 * CFP configuration entry
 */
export interface CfpConfig {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

/**
 * CFP status configuration
 */
export interface CfpStatusConfig {
  enabled: boolean;
  open_date: string | null;
  close_date: string | null;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

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

// ============================================
// ADMIN TYPES
// ============================================

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
  sort_by?: 'created_at' | 'avg_score' | 'review_count' | 'title';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Submission with review stats for admin list
 */
export interface CfpSubmissionWithStats extends CfpSubmission {
  speaker: CfpSpeaker;
  tags: CfpTag[];
  stats: CfpSubmissionStats;
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
  avg_reviews_per_submission: number;
  travel_assistance_requested: number;
  accepted_speakers_count: number;
  travel_confirmed_count: number;
}

// ============================================
// PUBLIC API TYPES
// ============================================

/**
 * Session information for public display
 */
export interface PublicSession {
  id: string;
  title: string;
  abstract: string;
  type: CfpSubmissionType;
  level: CfpTalkLevel;
  schedule: {
    date: string | null;
    start_time: string | null;
    duration_minutes: number | null;
    room: string | null;
  } | null;
}

/**
 * Speaker information for public lineup display
 * Contains only publicly safe information
 */
export interface PublicSpeaker {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  profile_image_url: string | null;
  socials: {
    linkedin_url: string | null;
    github_url: string | null;
    twitter_handle: string | null;
    bluesky_handle: string | null;
    mastodon_handle: string | null;
  };
  sessions: PublicSession[];
}

// ============================================
// ADMIN MANAGEMENT TYPES
// ============================================

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
