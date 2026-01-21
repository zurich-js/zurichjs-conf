/**
 * Sponsorship Invoice Types
 * Invoice calculation and PDF generation types
 */

import type { SponsorshipCurrency, SponsorshipLineItemType, SponsorBillingAddress } from './base';

/**
 * Invoice totals calculation result
 */
export interface SponsorshipInvoiceTotals {
  /** Sum of tier base price */
  tierBase: number;
  /** Sum of all add-on line items */
  addonTotal: number;
  /** Total available add-on credit from tier */
  creditAvailable: number;
  /** Credit actually applied (min of creditAvailable and creditable add-ons) */
  creditApplied: number;
  /** Sum of adjustment line items (can be negative) */
  adjustmentsTotal: number;
  /** Subtotal before credit (tierBase + addonTotal) */
  subtotal: number;
  /** Final total (subtotal - creditApplied + adjustmentsTotal, min 0) */
  total: number;
}

/**
 * Props for generating sponsorship invoice PDF
 */
export interface SponsorshipInvoicePDFProps {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;

  // Sponsor
  companyName: string;
  vatId?: string;
  billingAddress: SponsorBillingAddress;
  contactName: string;
  contactEmail: string;

  // Tier
  tierName: string;

  // Line Items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // in cents
    total: number; // in cents
    type: SponsorshipLineItemType;
    usesCredit?: boolean;
  }>;

  // Totals (all in cents)
  subtotal: number;
  creditApplied: number;
  adjustmentsTotal: number;
  total: number;
  currency: SponsorshipCurrency;

  // Multi-currency conversion (optional)
  conversion?: {
    baseAmountChf: number; // Base amount in CHF cents
    payableCurrency: 'EUR';
    conversionRateChfToEur: number; // e.g., 0.95
    convertedAmountEur: number; // Amount in EUR cents
    justification: string;
  };

  // Notes
  invoiceNotes?: string;
}
