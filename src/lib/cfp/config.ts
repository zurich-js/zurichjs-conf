/**
 * CFP Configuration Constants
 * Centralized configuration for CFP-related features
 */

/**
 * Email scheduling configuration
 */
export const EMAIL_SCHEDULING = {
  /** Delay in minutes before sending scheduled emails */
  DELAY_MINUTES: 30,
} as const;

/**
 * Coupon configuration for rejection emails
 */
export const REJECTION_COUPON = {
  /** Minimum discount percentage allowed */
  MIN_DISCOUNT_PERCENT: 10,
  /** Maximum discount percentage allowed */
  MAX_DISCOUNT_PERCENT: 80,
  /** Default discount percentage */
  DEFAULT_DISCOUNT_PERCENT: 20,
  /** Minimum validity in days */
  MIN_VALIDITY_DAYS: 1,
  /** Maximum validity in days */
  MAX_VALIDITY_DAYS: 30,
  /** Default validity in days */
  DEFAULT_VALIDITY_DAYS: 14,
  /** Coupon code prefix */
  CODE_PREFIX: 'CFPTHX',
} as const;

/**
 * Conference slot configuration for rejection email transparency
 * These numbers should reflect the actual conference capacity
 */
export const CONFERENCE_SLOTS = {
  /** Total workshop slots available */
  WORKSHOPS_MIN: 4,
  WORKSHOPS_MAX: 8,
  /** Total talk slots (including keynotes, sponsor talks, etc.) */
  TALKS_TOTAL: 14,
  /** Talk slots available from CFP (excluding invited/keynote) */
  TALKS_FROM_CFP: 9,
} as const;

/**
 * Attendance confirmation configuration
 */
export const ATTENDANCE_CONFIRMATION = {
  /** Token validity in days */
  TOKEN_VALIDITY_DAYS: 30,
  /** Token length in bytes (will be hex encoded to 2x this) */
  TOKEN_LENGTH_BYTES: 32,
} as const;

/**
 * Decline reasons for attendance
 */
export const DECLINE_REASONS = {
  conflict: 'Schedule conflict',
  travel: 'Cannot travel',
  personal: 'Personal reasons',
  other: 'Other',
} as const;

export type DeclineReason = keyof typeof DECLINE_REASONS;
