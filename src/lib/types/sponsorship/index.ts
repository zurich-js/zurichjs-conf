/**
 * Sponsorship Types
 * Barrel export for all sponsorship type modules
 */

// Base types (enums, literal types, billing address)
export type {
  SponsorshipDealStatus,
  SponsorshipLineItemType,
  SponsorshipPerkStatus,
  SponsorshipInvoicePDFSource,
  SponsorshipCurrency,
  SponsorshipConversionRateSource,
  SponsorBillingAddress,
} from './base';

// Database row types
export type {
  SponsorshipTier,
  Sponsor,
  SponsorshipDeal,
  SponsorshipLineItem,
  SponsorshipPerk,
  SponsorshipInvoice,
} from './database';

// Composite types (with relations)
export type {
  SponsorWithDeals,
  SponsorshipDealWithRelations,
  SponsorshipDealListItem,
} from './composite';

// API request/response types
export type {
  CreateSponsorRequest,
  UpdateSponsorRequest,
  CreateDealRequest,
  UpdateDealRequest,
  AddLineItemRequest,
  UpdateLineItemRequest,
  UpdatePerkRequest,
  CreateInvoiceRequest,
  UpdateInvoiceConversionRequest,
  ListSponsorsResponse,
  ListDealsResponse,
  ListSponsorsQuery,
  ListDealsQuery,
  SponsorshipStats,
} from './api';

// Invoice types
export type { SponsorshipInvoiceTotals, SponsorshipInvoicePDFProps } from './invoice';

// Status validation and config
export {
  VALID_DEAL_STATUS_TRANSITIONS,
  isValidDealStatusTransition,
  DEAL_STATUS_CONFIG,
  PERK_STATUS_CONFIG,
} from './status';

// Public display types
export type { PublicSponsor } from './public';
export { TIER_DISPLAY_CONFIG } from './public';
