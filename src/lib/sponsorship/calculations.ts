/**
 * Sponsorship Calculations
 * Pure functions for computing invoice totals and currency formatting
 */

import type {
  SponsorshipLineItem,
  SponsorshipTier,
  SponsorshipInvoiceTotals,
  SponsorshipCurrency,
} from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsorship Calculations');

/**
 * Compute sponsorship invoice totals
 *
 * Rules:
 * - subtotal = tierBase + sum(add-ons)
 * - creditApplied = min(addonCredit, sum(add-ons where usesCredit))
 * - adjustmentsTotal = sum(adjustments amounts) (negative allowed)
 * - total = subtotal - creditApplied + adjustmentsTotal
 * - Never allow total < 0. Clamp at 0 and log a warning.
 *
 * @param lineItems - Array of line items for the deal
 * @param tier - Sponsorship tier for credit calculation
 * @param currency - Currency for the deal
 * @returns Calculated totals
 */
export function computeSponsorshipInvoiceTotals(
  lineItems: SponsorshipLineItem[],
  tier: SponsorshipTier,
  currency: SponsorshipCurrency
): SponsorshipInvoiceTotals {
  // Calculate tier base
  const tierBaseItems = lineItems.filter((li) => li.type === 'tier_base');
  const tierBase = tierBaseItems.reduce(
    (sum, li) => sum + li.unit_price * li.quantity,
    0
  );

  // Calculate add-ons total
  const addonItems = lineItems.filter((li) => li.type === 'addon');
  const addonTotal = addonItems.reduce(
    (sum, li) => sum + li.unit_price * li.quantity,
    0
  );

  // Calculate creditable add-ons total (add-ons that can use tier credit)
  const creditableAddons = addonItems
    .filter((li) => li.uses_credit)
    .reduce((sum, li) => sum + li.unit_price * li.quantity, 0);

  // Get credit available from tier
  const creditAvailable = currency === 'CHF' ? tier.addon_credit_chf : tier.addon_credit_eur;

  // Apply credit (capped at creditable add-ons amount)
  const creditApplied = Math.min(creditAvailable, creditableAddons);

  // Calculate adjustments total (can be negative)
  const adjustmentItems = lineItems.filter((li) => li.type === 'adjustment');
  const adjustmentsTotal = adjustmentItems.reduce(
    (sum, li) => sum + li.unit_price * li.quantity,
    0
  );

  // Calculate subtotal and total
  const subtotal = tierBase + addonTotal;
  let total = subtotal - creditApplied + adjustmentsTotal;

  // Clamp total at 0 and log warning if negative
  if (total < 0) {
    log.warn('Invoice total calculated as negative, clamping to 0', {
      subtotal,
      creditApplied,
      adjustmentsTotal,
      calculatedTotal: total,
    });
    total = 0;
  }

  return {
    tierBase,
    addonTotal,
    creditAvailable,
    creditApplied,
    adjustmentsTotal,
    subtotal,
    total,
  };
}

/**
 * Format currency amount from cents to display string
 *
 * @param cents - Amount in cents
 * @param currency - Currency code
 * @returns Formatted currency string (e.g., "CHF 1'234.56")
 */
export function formatCurrency(cents: number, currency: SponsorshipCurrency): string {
  const amount = cents / 100;

  // Use Swiss number formatting (apostrophe as thousands separator)
  const formatter = new Intl.NumberFormat('de-CH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currency} ${formatter.format(amount)}`;
}

/**
 * Parse a currency string back to cents
 *
 * @param value - String value (e.g., "1234.56" or "1'234.56")
 * @returns Amount in cents
 */
export function parseToCents(value: string): number {
  // Remove non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

/**
 * Calculate line item total
 *
 * @param unitPrice - Unit price in cents
 * @param quantity - Quantity
 * @returns Total in cents
 */
export function calculateLineItemTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}
