/**
 * CFP Decision Types
 * Types for the CFP decision workflow (accept/reject submissions)
 */

/**
 * Decision status for a submission
 */
export type CfpDecisionStatus = 'undecided' | 'accepted' | 'rejected';

/**
 * Email type for scheduled emails
 */
export type CfpEmailType = 'acceptance' | 'rejection';

/**
 * Status of a scheduled email
 */
export type CfpScheduledEmailStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

/**
 * Attendance confirmation status
 */
export type CfpAttendanceStatus = 'pending' | 'confirmed' | 'declined';

/**
 * Decision record for a submission
 * Stored in cfp_submissions table as additional columns
 */
export interface CfpDecision {
  submission_id: string;
  decision_status: CfpDecisionStatus;
  decision_at: string | null;
  decision_by: string | null; // admin email or identifier
  decision_notes: string | null;
  // For rejections
  coupon_code: string | null;
  coupon_generated_at: string | null;
  // Email tracking
  decision_email_sent_at: string | null;
  decision_email_id: string | null;
}

/**
 * Decision event for audit log
 */
export interface CfpDecisionEvent {
  id: string;
  submission_id: string;
  event_type: 'decision_made' | 'email_sent' | 'coupon_generated' | 'decision_changed';
  previous_status: CfpDecisionStatus | null;
  new_status: CfpDecisionStatus;
  admin_id: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Request to make a decision on a submission
 */
export interface MakeDecisionRequest {
  submission_id: string;
  decision: 'accepted' | 'rejected';
  notes?: string;
  // For rejections
  generate_coupon?: boolean;
  coupon_discount_percent?: number;
  // For email
  send_email?: boolean;
  personal_message?: string;
}

/**
 * Result of making a decision
 */
export interface MakeDecisionResult {
  success: boolean;
  error?: string;
  decision_status?: CfpDecisionStatus;
  coupon_code?: string;
  email_sent?: boolean;
}

/**
 * Data for acceptance email
 */
export interface CfpAcceptanceEmailData {
  to: string;
  speaker_name: string;
  first_name: string;
  talk_title: string;
  submission_type: 'lightning' | 'standard' | 'workshop';
  conference_name: string;
  conference_date: string;
  personal_message?: string;
  // URL to speaker dashboard where they can confirm attendance
  confirmation_url: string;
}

/**
 * Data for rejection email (enhanced with transparency stats)
 */
export interface CfpRejectionEmailData {
  to: string;
  speaker_name: string;
  talk_title: string;
  conference_name: string;
  personal_message?: string;
  coupon_code?: string;
  coupon_discount_percent?: number;
  coupon_expires_at?: string;
  tickets_url: string;
  // Transparency stats
  total_submissions?: number;
  total_reviews?: number;
  // Slot info
  workshop_slots_min?: number;
  workshop_slots_max?: number;
  talks_total?: number;
  talks_from_cfp?: number;
  // Committee feedback (optional inclusion)
  include_feedback?: boolean;
  feedback_text?: string;
  // Multi-submission note
  has_other_pending_submissions?: boolean;
}

/**
 * Scheduled email record
 */
export interface CfpScheduledEmail {
  id: string;
  submission_id: string;
  email_type: CfpEmailType;
  scheduled_for: string;
  resend_email_id: string | null;
  status: CfpScheduledEmailStatus;
  sent_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  recipient_email: string;
  recipient_name: string;
  talk_title: string;
  personal_message: string | null;
  coupon_code: string | null;
  coupon_discount_percent: number | null;
  coupon_expires_at: string | null;
  include_feedback: boolean;
  feedback_text: string | null;
  scheduled_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to schedule an email
 */
export interface ScheduleEmailRequest {
  submission_id: string;
  email_type: CfpEmailType;
  personal_message?: string;
  // For rejection emails
  coupon_discount_percent?: number;
  coupon_validity_days?: number;
  include_feedback?: boolean;
  feedback_text?: string;
}

/**
 * Result of scheduling an email
 */
export interface ScheduleEmailResult {
  success: boolean;
  error?: string;
  scheduled_email?: CfpScheduledEmail;
  scheduled_for?: string;
}

/**
 * Speaker attendance confirmation record
 */
export interface CfpSpeakerAttendance {
  id: string;
  speaker_id: string;
  submission_id: string;
  status: CfpAttendanceStatus;
  responded_at: string | null;
  decline_reason: string | null;
  decline_notes: string | null;
  confirmation_token: string;
  token_expires_at: string;
  token_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request to confirm/decline attendance
 */
export interface AttendanceResponseRequest {
  token: string;
  response: 'confirm' | 'decline';
  decline_reason?: string;
  decline_notes?: string;
}
