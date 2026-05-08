/**
 * B2B Quote Types
 * TypeScript types for the B2B quote generator system
 */

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

import type { SupportedCurrency } from '@/config/currency';

/** Supported currencies for B2B quotes — same as ticket currencies */
export type QuoteCurrency = SupportedCurrency;

// ---------------------------------------------------------------------------
// Quote State (serialized to URL)
// ---------------------------------------------------------------------------

/** Full quote state — top-level object persisted in the URL via nuqs */
export interface B2BQuoteState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  notes: string;
  currency: QuoteCurrency;
  validUntil: string; // ISO date string (YYYY-MM-DD) or empty
  highlights: string[]; // applies to all options
  options: B2BQuoteOption[]; // 1–3 options
}

/** Single configurable quote option */
export interface B2BQuoteOption {
  id: string;
  title: string;
  description: string;
  standardTickets: TicketQuoteLine;
  vipTickets: TicketQuoteLine;
  workshops: WorkshopQuoteLine[];
  customLineItems: CustomQuoteLine[];
  customDiscounts: CustomDiscountLine[];
}

/** Ticket quantity + pricing for a single ticket type */
export interface TicketQuoteLine {
  quantity: number;
  unitPriceCents: number;
  discountPercent: number; // 0–100
}

/** Workshop line within a quote option */
export interface WorkshopQuoteLine {
  workshopId: string;
  title: string;
  slug: string; // session slug for /workshops/[slug] link
  quantity: number;
  unitPriceCents: number;
  discountPercent: number;
  linkedToVip: boolean; // true = discount derives from VIP benefit (20%)
}

/** Arbitrary extra line item (e.g. "Logistics coordination") */
export interface CustomQuoteLine {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
}

/** Arbitrary discount line item */
export interface CustomDiscountLine {
  id: string;
  label: string;
  type: 'fixed' | 'percent';
  /** For fixed: discount amount in cents. For percent: the percentage (e.g. 10 = 10%). */
  value: number;
}

// ---------------------------------------------------------------------------
// Calculated Breakdown (output of pure computation)
// ---------------------------------------------------------------------------

/** Computed breakdown for a single ticket line */
export interface TicketLineBreakdown {
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  netCents: number;
}

/** Computed breakdown for a single workshop line */
export interface WorkshopLineBreakdown {
  workshopId: string;
  title: string;
  slug: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  vipSavingsCents: number;
  netCents: number;
}

/** Computed breakdown for a custom line item */
export interface CustomLineBreakdown {
  id: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

/** Computed breakdown for a custom discount */
export interface CustomDiscountBreakdown {
  id: string;
  label: string;
  amountCents: number;
}

/** Full computed breakdown for a single quote option */
export interface QuoteOptionBreakdown {
  optionId: string;
  title: string;

  standardTickets: TicketLineBreakdown;
  vipTickets: TicketLineBreakdown;

  workshops: WorkshopLineBreakdown[];
  customLineItems: CustomLineBreakdown[];
  customDiscounts: CustomDiscountBreakdown[];

  /** Sum of all line items before any discounts */
  subtotalCents: number;
  /** Sum of all discounts (ticket, workshop, custom) */
  totalDiscountCents: number;
  /** Final amount after discounts (clamped to >= 0) */
  totalCents: number;
  /** Number of ticket holders (standard + VIP) */
  totalPeople: number;
  /** totalCents / totalPeople, or 0 when no people */
  perPersonCents: number;

  /** VIP benefit labels (only present when vipTickets.quantity > 0) */
  vipBenefits: string[];
  /** Total workshop savings attributable to VIP benefits */
  totalVipWorkshopSavingsCents: number;
}

/** Full computed breakdown across all options */
export interface QuoteBreakdown {
  options: QuoteOptionBreakdown[];
  /** Index of the option with the highest total savings (-1 if no savings) */
  bestValueIndex: number;
  currency: QuoteCurrency;
}
