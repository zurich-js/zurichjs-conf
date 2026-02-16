/**
 * CFP Base Types
 * Enums and literal types for the CFP system
 */

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
