/**
 * Sponsor Quote Types
 * TypeScript types for the sponsor quote generator system
 */

import type { SupportedCurrency } from '@/config/currency';

/** Currencies supported for sponsor quotes */
export type SponsorQuoteCurrency = SupportedCurrency;

// ---------------------------------------------------------------------------
// Quote State (serialized to URL)
// ---------------------------------------------------------------------------

/** Full sponsor quote state — top-level object persisted in the URL */
export interface SponsorQuoteState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  notes: string;
  currency: SponsorQuoteCurrency;
  validUntil: string; // ISO date string (YYYY-MM-DD) or empty
  recommendedOptionId: string; // id of the recommended option, or '' for none
  options: SponsorQuoteOption[]; // 1–3 options
}

/** Single configurable sponsor quote option */
export interface SponsorQuoteOption {
  id: string;
  title: string;
  description: string;
  highlights: string[]; // per-proposal highlights
  addOnBudgetCents: number; // total add-on credit for this option
  items: SponsorQuoteItem[];
  customDiscounts: SponsorQuoteDiscountLine[];
}

/** A single sponsorship line item */
export interface SponsorQuoteItem {
  id: string;
  category: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent: number; // 0–100
  includedInTier: boolean; // true = comes with the tier, shown as "Included"
  forgoneQty: number; // how many units of this included item were given up (0 = none)
  forgoneValuePerUnitCents: number; // credit per forgone unit added to add-on budget
  exclusive: boolean;
  exclusivityPremiumType: 'fixed' | 'percent';
  exclusivityPremiumValue: number;
  exclusivityToggleable: boolean; // sponsor can toggle exclusivity on/off on public page
  optional: boolean; // sponsor can toggle this item on/off on public page
  optionalDefault: boolean; // true = included by default, false = excluded by default
}

/** Arbitrary discount line item */
export interface SponsorQuoteDiscountLine {
  id: string;
  label: string;
  type: 'fixed' | 'percent';
  /** For fixed: discount amount in cents. For percent: the percentage (e.g. 10 = 10%). */
  value: number;
}

// ---------------------------------------------------------------------------
// Calculated Breakdown (output of pure computation)
// ---------------------------------------------------------------------------

/** Computed breakdown for a single sponsor item */
export interface SponsorItemBreakdown {
  id: string;
  category: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  includedInTier: boolean;
  forgoneQty: number;
  forgoneCreditCents: number; // forgoneQty * forgoneValuePerUnitCents
  exclusive: boolean;
  exclusivityPremiumCents: number;
  exclusivityToggleable: boolean;
  optional: boolean;
  optionalDefault: boolean;
  netCents: number;
}

/** Computed breakdown for a custom discount */
export interface SponsorDiscountBreakdown {
  id: string;
  label: string;
  amountCents: number;
}

/** Full computed breakdown for a single sponsor quote option */
export interface SponsorQuoteOptionBreakdown {
  optionId: string;
  title: string;

  items: SponsorItemBreakdown[];
  customDiscounts: SponsorDiscountBreakdown[];

  subtotalCents: number;
  totalItemDiscountCents: number;
  totalExclusivityCents: number;
  totalCustomDiscountCents: number;
  totalDiscountCents: number;
  totalCents: number;
  exclusiveItemLabels: string[];

  /** Add-on budget tracking */
  addOnBudgetCents: number;
  /** Total value of forgone included items (credited back to budget) */
  totalForgoneCents: number;
  /** Effective budget = addOnBudgetCents + totalForgoneCents */
  effectiveBudgetCents: number;
  /** Sum of net costs for non-tier-included items (excluding the tier base itself) */
  addOnSpentCents: number;
  addOnRemainingCents: number;
}

/** Full computed breakdown across all options */
export interface SponsorQuoteBreakdown {
  options: SponsorQuoteOptionBreakdown[];
  recommendedIndex: number;
  currency: SponsorQuoteCurrency;
}
