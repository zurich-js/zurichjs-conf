/**
 * Sponsorship Types
 * TypeScript types for sponsorship management system
 */

// ============================================================================
// ENUMS / LITERAL TYPES
// ============================================================================

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

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

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
 * Billing Address structure
 */
export interface SponsorBillingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
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

  // PDF
  invoice_pdf_url: string | null;
  invoice_pdf_source: SponsorshipInvoicePDFSource | null;
  invoice_pdf_uploaded_at: string | null;

  // Notes shown on invoice
  invoice_notes: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPOSITE TYPES
// ============================================================================

/**
 * Sponsor with their deals
 */
export interface SponsorWithDeals extends Sponsor {
  deals: SponsorshipDeal[];
}

/**
 * Sponsorship Deal with all related data
 */
export interface SponsorshipDealWithRelations extends SponsorshipDeal {
  sponsor: Sponsor;
  tier: SponsorshipTier;
  line_items: SponsorshipLineItem[];
  perks: SponsorshipPerk[];
  invoice: SponsorshipInvoice | null;
}

/**
 * Simplified deal for list views
 */
export interface SponsorshipDealListItem extends SponsorshipDeal {
  sponsor: Pick<Sponsor, 'id' | 'company_name' | 'contact_name' | 'contact_email' | 'logo_url'>;
  tier: Pick<SponsorshipTier, 'id' | 'name'>;
  invoice: Pick<SponsorshipInvoice, 'id' | 'invoice_number' | 'total_amount'> | null;
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Request to create a new sponsor
 */
export interface CreateSponsorRequest {
  companyName: string;
  companyWebsite?: string;
  vatId?: string;
  billingAddress: SponsorBillingAddress;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  internalNotes?: string;
}

/**
 * Request to update a sponsor
 */
export interface UpdateSponsorRequest {
  companyName?: string;
  companyWebsite?: string | null;
  vatId?: string | null;
  billingAddress?: Partial<SponsorBillingAddress>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  internalNotes?: string | null;
  isLogoPublic?: boolean;
}

/**
 * Request to create a new deal
 */
export interface CreateDealRequest {
  sponsorId: string;
  tierId: string;
  currency: SponsorshipCurrency;
  internalNotes?: string;
}

/**
 * Request to update a deal
 */
export interface UpdateDealRequest {
  tierId?: string;
  currency?: SponsorshipCurrency;
  internalNotes?: string | null;
}

/**
 * Request to add a line item
 */
export interface AddLineItemRequest {
  type: SponsorshipLineItemType;
  description: string;
  quantity?: number;
  unitPrice: number; // in cents
  usesCredit?: boolean;
}

/**
 * Request to update a line item
 */
export interface UpdateLineItemRequest {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  usesCredit?: boolean;
}

/**
 * Request to update a perk
 */
export interface UpdatePerkRequest {
  status?: SponsorshipPerkStatus;
  notes?: string | null;
}

/**
 * Request to create an invoice
 */
export interface CreateInvoiceRequest {
  dueDate: string; // ISO date string (YYYY-MM-DD)
  invoiceNotes?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response for listing sponsors
 */
export interface ListSponsorsResponse {
  sponsors: Sponsor[];
  total: number;
}

/**
 * Response for listing deals
 */
export interface ListDealsResponse {
  deals: SponsorshipDealListItem[];
  total: number;
}

/**
 * Query parameters for listing sponsors
 */
export interface ListSponsorsQuery {
  search?: string;
  hasPublicLogo?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Query parameters for listing deals
 */
export interface ListDealsQuery {
  status?: SponsorshipDealStatus;
  tierId?: string;
  currency?: SponsorshipCurrency;
  sponsorId?: string;
  search?: string; // Search by sponsor name or deal number
  page?: number;
  limit?: number;
}

/**
 * Sponsorship statistics for dashboard
 */
export interface SponsorshipStats {
  totalSponsors: number;
  totalDeals: number;
  dealsByStatus: Record<SponsorshipDealStatus, number>;
  dealsByTier: Record<string, number>;
  revenueByCurrency: {
    CHF: { paid: number; pending: number };
    EUR: { paid: number; pending: number };
  };
  publicLogos: number;
}

// ============================================================================
// CALCULATION TYPES
// ============================================================================

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

// ============================================================================
// PDF TYPES
// ============================================================================

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

  // Notes
  invoiceNotes?: string;
}

// ============================================================================
// STATUS TRANSITIONS
// ============================================================================

/**
 * Valid deal status transitions
 * Maps current status to allowed next statuses
 */
export const VALID_DEAL_STATUS_TRANSITIONS: Record<
  SponsorshipDealStatus,
  SponsorshipDealStatus[]
> = {
  draft: ['offer_sent', 'cancelled'],
  offer_sent: ['invoiced', 'cancelled'],
  invoiced: ['invoice_sent', 'cancelled'],
  invoice_sent: ['paid', 'cancelled'],
  paid: [], // Final state - no transitions allowed
  cancelled: [], // Final state - no transitions allowed
};

/**
 * Check if a deal status transition is valid
 */
export function isValidDealStatusTransition(
  currentStatus: SponsorshipDealStatus,
  newStatus: SponsorshipDealStatus
): boolean {
  return VALID_DEAL_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Status display configuration
 */
export const DEAL_STATUS_CONFIG: Record<
  SponsorshipDealStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  offer_sent: { label: 'Offer Sent', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  invoiced: { label: 'Invoiced', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  invoice_sent: { label: 'Invoice Sent', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Perk status display configuration
 */
export const PERK_STATUS_CONFIG: Record<
  SponsorshipPerkStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: 'Pending', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  not_applicable: { label: 'N/A', color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Public sponsor data for homepage display
 */
export interface PublicSponsor {
  id: string;
  name: string;
  logo: string;
  url: string | null;
  tier: string;
  width: number;
  height: number;
}

/**
 * Tier to display size mapping for public sponsor logos
 */
export const TIER_DISPLAY_CONFIG: Record<string, { width: number; height: number }> = {
  diamond: { width: 4, height: 120 },
  platinum: { width: 4, height: 100 },
  gold: { width: 3, height: 100 },
  silver: { width: 2, height: 80 },
  bronze: { width: 2, height: 80 },
  supporter: { width: 2, height: 60 },
};
