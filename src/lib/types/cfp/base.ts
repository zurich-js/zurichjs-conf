/**
 * CFP Base Types
 * Enums and literal types for the CFP system
 */

/**
 * Submission type - lightning talk, standard talk, workshop, or panel
 */
export type CfpSubmissionType = 'lightning' | 'standard' | 'workshop' | 'panel';

/**
 * Public role for people shown on the speakers page
 */
export type CfpSpeakerRole = 'speaker' | 'mc';

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
export const CFP_REVIEWER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMMITTEE_MEMBER: 'committee_member',
  REVIEWER: 'reviewer',
  READONLY: 'readonly',
} as const;

export const CFP_REVIEWER_ROLE_VALUES = [
  CFP_REVIEWER_ROLES.SUPER_ADMIN,
  CFP_REVIEWER_ROLES.COMMITTEE_MEMBER,
  CFP_REVIEWER_ROLES.REVIEWER,
  CFP_REVIEWER_ROLES.READONLY,
] as const;

export type CfpReviewerRole = typeof CFP_REVIEWER_ROLE_VALUES[number];

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
 * Transportation mode for admin travel planning
 */
export type CfpTransportMode = 'flight' | 'train' | 'link_only' | 'none';

/**
 * Simplified transportation tracking status for admin ops
 */
export type CfpTransportStatus = 'scheduled' | 'delayed' | 'canceled' | 'complete';

/**
 * Reimbursement request status
 */
export type CfpReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';

/**
 * Expense type for reimbursements
 */
export type CfpReimbursementType = 'flight' | 'accommodation' | 'transport' | 'other';

/**
 * T-shirt sizes available for speakers
 */
export type CfpTshirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';

/**
 * Type of travel/accommodation assistance needed
 */
export type CfpAssistanceType = 'travel' | 'accommodation' | 'both' | null;

/**
 * Speaker's travel arrangement choice
 */
export type CfpTravelOption = 'employer_covers' | 'self_managed' | 'need_assistance';
