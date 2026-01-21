/**
 * Sponsorship Base Types
 * Enums and literal types for sponsorship system
 */

/**
 * Sponsorship Deal Status - Lifecycle stages of a sponsorship deal
 * - draft: Deal created but not sent to sponsor
 * - offer_sent: Offer/proposal sent to sponsor
 * - invoiced: Invoice generated
 * - invoice_sent: Invoice sent to sponsor
 * - paid: Payment received
 * - cancelled: Deal cancelled
 */
export type SponsorshipDealStatus =
  | 'draft'
  | 'offer_sent'
  | 'invoiced'
  | 'invoice_sent'
  | 'paid'
  | 'cancelled';

/**
 * Line Item Type - Categories of pricing line items
 * - tier_base: The base tier price
 * - addon: Additional services/perks purchased
 * - adjustment: Price adjustments (discounts or additions)
 */
export type SponsorshipLineItemType = 'tier_base' | 'addon' | 'adjustment';

/**
 * Perk Status - Fulfillment status of agreed perks
 */
export type SponsorshipPerkStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'not_applicable';

/**
 * Invoice PDF source - How the PDF was attached
 */
export type SponsorshipInvoicePDFSource = 'generated' | 'uploaded';

/**
 * Currency type
 */
export type SponsorshipCurrency = 'CHF' | 'EUR';

/**
 * Conversion rate source - Where the exchange rate came from
 */
export type SponsorshipConversionRateSource = 'ecb' | 'bank' | 'manual' | 'other';

/**
 * Billing Address structure
 */
export interface SponsorBillingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}
