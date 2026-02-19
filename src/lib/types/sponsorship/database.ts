/**
 * Sponsorship Database Types
 * Database row types for sponsorship tables
 */

import type {
  SponsorshipCurrency,
  SponsorshipDealStatus,
  SponsorshipLineItemType,
  SponsorshipPerkStatus,
  SponsorshipInvoicePDFSource,
  SponsorshipConversionRateSource,
} from './base';

/**
 * Sponsorship Tier - Reference data for tier configurations
 */
export interface SponsorshipTier {
  id: string; // 'diamond', 'platinum', etc.
  name: string;
  description: string;
  price_chf: number; // in cents
  price_eur: number; // in cents
  addon_credit_chf: number; // in cents
  addon_credit_eur: number; // in cents
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sponsor - Company and contact information
 */
export interface Sponsor {
  id: string;

  // Company Information
  company_name: string;
  company_website: string | null;
  vat_id: string | null;

  // Billing Address
  billing_address_street: string;
  billing_address_city: string;
  billing_address_postal_code: string;
  billing_address_country: string;

  // Contact Person
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;

  // Logo Management
  logo_url: string | null;
  logo_url_color: string | null
  is_logo_public: boolean;

  // Internal Notes
  internal_notes: string | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Sponsorship Deal - Tier assignment and status tracking
 */
export interface SponsorshipDeal {
  id: string;
  sponsor_id: string;
  tier_id: string;

  // Deal Number
  deal_number: string;

  // Currency
  currency: SponsorshipCurrency;

  // Status Pipeline
  status: SponsorshipDealStatus;

  // Status Timestamps
  offer_sent_at: string | null;
  invoiced_at: string | null;
  invoice_sent_at: string | null;
  paid_at: string | null;
  paid_by: string | null;

  // Internal Notes
  internal_notes: string | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Sponsorship Line Item - Pricing breakdown
 */
export interface SponsorshipLineItem {
  id: string;
  deal_id: string;

  // Line Item Details
  type: SponsorshipLineItemType;
  description: string;
  quantity: number;
  unit_price: number; // in cents (can be negative for adjustments)
  uses_credit: boolean;
  display_order: number;

  created_at: string;
  updated_at: string;
}

/**
 * Sponsorship Perk - Checklist item with status
 */
export interface SponsorshipPerk {
  id: string;
  deal_id: string;

  // Perk Details
  name: string;
  description: string | null;

  // Status Tracking
  status: SponsorshipPerkStatus;
  notes: string | null;
  completed_at: string | null;

  // Display Order
  display_order: number;

  created_at: string;
  updated_at: string;
}

/**
 * Sponsorship Invoice - Invoice record with totals
 */
export interface SponsorshipInvoice {
  id: string;
  deal_id: string;

  // Invoice Number
  invoice_number: string;

  // Invoice Dates
  issue_date: string;
  due_date: string;

  // Calculated Totals (snapshot)
  subtotal: number; // tier_base + addons (in cents)
  credit_applied: number; // credit used (in cents)
  adjustments_total: number; // sum of adjustments (in cents)
  total_amount: number; // final total (in cents)
  currency: SponsorshipCurrency;

  // Multi-currency support (CHF base -> EUR payable)
  base_currency: 'CHF';
  base_amount_chf: number | null; // Base total in CHF cents
  payable_currency: SponsorshipCurrency | null; // Currency sponsor pays in (EUR when conversion enabled)
  conversion_rate_chf_to_eur: number | null; // e.g., 0.95 means 1 CHF = 0.95 EUR
  converted_amount_eur: number | null; // Amount payable in EUR cents
  conversion_justification: string | null; // Reason for the rate
  conversion_rate_source: SponsorshipConversionRateSource | null;
  conversion_updated_by: string | null;
  conversion_updated_at: string | null;

  // PDF
  invoice_pdf_url: string | null;
  invoice_pdf_source: SponsorshipInvoicePDFSource | null;
  invoice_pdf_uploaded_at: string | null;

  // Notes shown on invoice
  invoice_notes: string | null;

  created_at: string;
  updated_at: string;
}
