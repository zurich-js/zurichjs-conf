/**
 * Sponsorship API Types
 * Request and response types for sponsorship endpoints
 */

import type {
  SponsorshipCurrency,
  SponsorshipDealStatus,
  SponsorshipLineItemType,
  SponsorshipPerkStatus,
  SponsorBillingAddress,
  SponsorshipConversionRateSource,
} from './base';
import type { Sponsor } from './database';
import type { SponsorshipDealListItem } from './composite';

// ============================================================================
// REQUEST TYPES
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
  // Multi-currency conversion (optional)
  payInEur?: boolean;
  conversionRateChfToEur?: number; // e.g., 0.95
  convertedAmountEur?: number; // in cents (auto-calculated but can be overridden)
  conversionJustification?: string;
  conversionRateSource?: SponsorshipConversionRateSource;
}

/**
 * Request to update invoice conversion
 */
export interface UpdateInvoiceConversionRequest {
  payInEur: boolean;
  conversionRateChfToEur?: number;
  convertedAmountEur?: number; // in cents
  conversionJustification?: string;
  conversionRateSource?: SponsorshipConversionRateSource;
}

// ============================================================================
// RESPONSE TYPES
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

// ============================================================================
// QUERY TYPES
// ============================================================================

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
