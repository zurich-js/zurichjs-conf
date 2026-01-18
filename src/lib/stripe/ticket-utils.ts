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
  if (lookupKey.endsWith('_eur') || lookupKey.endsWith('_gbp') || lookupKey.endsWith('_chf')) {
    return lookupKey.slice(0, -4);
  }
  return lookupKey;
}

/**
 * Parse ticket info from lookup key: {category}_{stage} or {category}_{stage}_{currency}
 * Called after isTicketProduct() validation
 * Handles multi-part stage names like "blind_bird" correctly
 * Handles currency suffix like "_eur" or "_chf"
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
export function getTicketDisplayName(category: TicketCategory, stage: TicketStage): string {
  if (category === 'vip') return 'VIP Ticket';
  if (category === 'student') return 'Student Ticket';
  if (category === 'unemployed') return 'Unemployed Ticket';

  const stageNames: Record<TicketStage, string> = {
    blind_bird: 'Blind Bird',
    early_bird: 'Early Bird',
    general_admission: 'Standard',
    late_bird: 'Late Bird',
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
  if (stage === 'late_bird') return 'late_bird';
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
 * Check if a price is a workshop voucher
 * Vouchers are identified by matching WORKSHOP_VOUCHER_PRODUCT_ID
 */
export function isWorkshopVoucher(price: Stripe.Price | undefined): boolean {
  if (!price) return false;

  const workshopVoucherProductId = process.env.WORKSHOP_VOUCHER_PRODUCT_ID;
  if (!workshopVoucherProductId) return false;

  const productId = typeof price.product === 'string' ? price.product : price.product?.id;
  return productId === workshopVoucherProductId;
}
