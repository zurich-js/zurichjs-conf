/**
 * Ticket Constants
 * Runtime constants derived from TicketCategory and TicketStage types
 * This is the single source of truth (SSOT) for ticket validation
 */

import type { TicketCategory, TicketStage } from './database';

/**
 * All valid ticket categories
 */
export const TICKET_CATEGORIES: readonly TicketCategory[] = [
  'standard',
  'vip',
  'student',
  'unemployed',
] as const;

/**
 * All valid ticket stages (purchase periods)
 */
export const TICKET_STAGES: readonly TicketStage[] = [
  'blind_bird',
  'early_bird',
  'general_admission',
  'late_bird',
] as const;

/**
 * Valid lookup key stage names (used in Stripe price lookup keys)
 * Maps from lookup key stage names to TicketStage values
 */
export const LOOKUP_KEY_STAGES = [
  'blind_bird',
  'early_bird',
  'standard',
  'general',
  'late_bird',
] as const;

/**
 * Map lookup key stage names to TicketStage database values
 */
export const STAGE_LOOKUP_MAP: Record<string, TicketStage> = {
  blind_bird: 'blind_bird',
  early_bird: 'early_bird',
  standard: 'general_admission',
  general: 'general_admission',
  late_bird: 'late_bird',
} as const;
