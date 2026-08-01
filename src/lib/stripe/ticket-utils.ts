/**
 * Ticket Parsing Utilities
 * Functions for parsing and validating ticket information from Stripe prices
 */

import type Stripe from 'stripe';
import type { TicketType, TicketCategory, TicketStage } from '@/lib/types/database';
import { TICKET_CATEGORIES, LOOKUP_KEY_STAGES, STAGE_LOOKUP_MAP } from '@/lib/types/ticket-constants';

/**
 * Strip currency suffix from lookup key if present
 * Handles patterns like "standard_blind_bird_eur" -> "standard_blind_bird"
 */
export function stripCurrencySuffix(lookupKey: string): string {
  if (lookupKey.endsWith('_eur') || lookupKey.endsWith('_gbp') || lookupKey.endsWith('_usd') || lookupKey.endsWith('_chf')) {
    return lookupKey.slice(0, -4);
  }
  return lookupKey;
}

/**
 * Categories sold under the shared discounted status price. The lookup key
 * (`standard_student_unemployed`) can't distinguish them, so the approved
 * verification type is the authority — see resolveVerificationCategory().
 */
const STATUS_DISCOUNT_CATEGORIES: readonly TicketCategory[] = ['student', 'unemployed'] as const;

/**
 * Whether a category comes from the shared student/unemployed discounted price
 */
export function isStatusDiscountCategory(category: TicketCategory): boolean {
  return STATUS_DISCOUNT_CATEGORIES.includes(category);
}

/**
 * Resolve the verified status category from Stripe metadata.
 *
 * Verification payment links carry the reviewed application's type, either as
 * `verification_type` or as the legacy `type: "{student|unemployed}_verification"`.
 * Without it the shared lookup key resolves to `student` for everyone.
 *
 * @returns the verified category, or null when the metadata isn't a verification
 */
export function resolveVerificationCategory(
  metadata: Stripe.Metadata | null | undefined
): TicketCategory | null {
  const legacyType = metadata?.type?.endsWith('_verification')
    ? metadata.type.slice(0, -'_verification'.length)
    : undefined;
  const verificationType = metadata?.verification_type || legacyType;

  return verificationType === 'student' || verificationType === 'unemployed'
    ? verificationType
    : null;
}

/**
 * Parse ticket info from lookup key: {category}_{stage} or {category}_{stage}_{currency}
 * Called after isTicketProduct() validation
 * Handles multi-part stage names like "blind_bird" correctly
 * Handles currency suffix like "_eur" or "_chf"
 *
 * Note: students and unemployed attendees share one price, so a combined
 * lookup key resolves to `student`. Callers with session metadata should
 * refine it with resolveVerificationCategory().
 */
export function parseTicketInfo(lookupKey: string): {
  category: TicketCategory;
  stage: TicketStage;
} {
  const normalizedKey = stripCurrencySuffix(lookupKey);

  // Special cases
  if (normalizedKey.includes('student')) {
    return { category: 'student', stage: 'general_admission' };
  }
  if (normalizedKey.includes('unemployed')) {
    return { category: 'unemployed', stage: 'general_admission' };
  }

  // Parse category_stage pattern
  const firstUnderscoreIndex = normalizedKey.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    return {
      category: normalizedKey as TicketCategory,
      stage: 'general_admission',
    };
  }

  const category = normalizedKey.substring(0, firstUnderscoreIndex);
  const stageKey = normalizedKey.substring(firstUnderscoreIndex + 1);

  return {
    category: category as TicketCategory,
    stage: STAGE_LOOKUP_MAP[stageKey] || 'general_admission',
  };
}

/**
 * Get display name for ticket
 */
export function getTicketDisplayName(category: string, stage: string): string {
  if (category === 'vip') return 'VIP Ticket';
  if (category === 'student') return 'Student Ticket';
  if (category === 'unemployed') return 'Unemployed Ticket';

  const stageNames: Record<string, string> = {
    blind_bird: 'Blind Bird',
    early_bird: 'Early Bird',
    general_admission: 'Standard',
    late_bird: 'Late Bird',
    last_minute: 'Last Minute',
  };

  return stageNames[stage] || 'Conference Ticket';
}

/**
 * Map category/stage to legacy ticket type (for database compatibility)
 */
export function toLegacyType(category: TicketCategory, stage: TicketStage): TicketType {
  if (category === 'vip') return 'vip';
  if (category === 'student') return 'student';
  if (category === 'unemployed') return 'unemployed';
  if (stage === 'blind_bird') return 'blind_bird';
  if (stage === 'early_bird') return 'early_bird';
  // Legacy enum has no last_minute value — map to late_bird (closest period)
  if (stage === 'late_bird' || stage === 'last_minute') return 'late_bird';
  return 'standard';
}

/**
 * Check if a price is a valid conference ticket product
 * Validates based on lookup key pattern: {category}_{stage} or {category}_{stage}_{currency}
 */
export function isTicketProduct(price: Stripe.Price | undefined): boolean {
  if (!price?.lookup_key) return false;

  const lookupKey = stripCurrencySuffix(price.lookup_key);

  // Special cases: student/unemployed tickets
  if (lookupKey === 'standard_student_unemployed' ||
      lookupKey.includes('student') ||
      lookupKey.includes('unemployed')) {
    return true;
  }

  // Standard pattern: category_stage
  const firstUnderscoreIndex = lookupKey.indexOf('_');
  if (firstUnderscoreIndex === -1) {
    return (TICKET_CATEGORIES as readonly string[]).includes(lookupKey);
  }

  const category = lookupKey.substring(0, firstUnderscoreIndex);
  const stageKey = lookupKey.substring(firstUnderscoreIndex + 1);

  return (TICKET_CATEGORIES as readonly string[]).includes(category) &&
         (LOOKUP_KEY_STAGES as readonly string[]).includes(stageKey);
}

/**
 * Check if a price is a sellable workshop offering.
 * Identified by a `_workshop_` segment or `workshop_` prefix on the
 * (currency-stripped) lookup key.
 */
export const WORKSHOP_LOOKUP_KEY_PREFIX = 'workshop_';

export function isWorkshopPrice(price: Stripe.Price | undefined): boolean {
  if (!price?.lookup_key) return false;
  const key = stripCurrencySuffix(price.lookup_key);
  return key.startsWith(WORKSHOP_LOOKUP_KEY_PREFIX) || key.includes('_workshop_');
}
