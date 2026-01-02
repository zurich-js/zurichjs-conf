/**
 * CFP Auth Constants and Pure Utilities
 * These can be safely imported in client-side code (no server dependencies)
 */

import type { CfpSpeaker } from '@/lib/types/cfp';

// ============================================
// CONSTANTS
// ============================================

/**
 * PostgreSQL error code for unique constraint violation
 * Used to detect race conditions during speaker/reviewer creation
 */
export const POSTGRES_DUPLICATE_KEY_ERROR = '23505';

/**
 * Patterns that indicate an expired or invalid magic link
 */
export const EXPIRED_LINK_PATTERNS = [
  'invalid or has expired',
  'link is invalid',
  'link has expired',
  'otp_expired',
  'invalid_grant',
  'expired',
  'code verifier',
] as const;

// ============================================
// ERROR DETECTION
// ============================================

/**
 * Check if an error message indicates an expired or invalid magic link
 * Used to show appropriate UI (expired vs generic error)
 */
export function isExpiredLinkError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return EXPIRED_LINK_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if a Supabase/Postgres error is a duplicate key violation
 * Indicates a race condition where another request already created the record
 */
export function isDuplicateKeyError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === POSTGRES_DUPLICATE_KEY_ERROR ||
    error.message?.includes('duplicate key') ||
    false
  );
}

// ============================================
// SPEAKER PROFILE UTILITIES
// ============================================

/**
 * Check if speaker profile is complete (has required fields)
 */
export function isSpeakerProfileComplete(speaker: CfpSpeaker): boolean {
  return !!(
    speaker.first_name &&
    speaker.last_name &&
    speaker.job_title &&
    speaker.company &&
    speaker.city &&
    speaker.country &&
    speaker.bio &&
    speaker.tshirt_size
  );
}

/**
 * Get list of missing required profile fields
 */
export function getMissingProfileFields(speaker: CfpSpeaker): string[] {
  const missing: string[] = [];
  if (!speaker.first_name) missing.push('First name');
  if (!speaker.last_name) missing.push('Last name');
  if (!speaker.job_title) missing.push('Job title');
  if (!speaker.company) missing.push('Company');
  if (!speaker.city) missing.push('City');
  if (!speaker.country) missing.push('Country');
  if (!speaker.bio) missing.push('Bio');
  if (!speaker.tshirt_size) missing.push('T-shirt size');
  return missing;
}
