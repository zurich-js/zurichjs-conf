/**
 * Sponsorship Composite Types
 * Extended types with relations for API responses
 */

import type {
  Sponsor,
  SponsorshipDeal,
  SponsorshipTier,
  SponsorshipLineItem,
  SponsorshipPerk,
  SponsorshipInvoice,
} from './database';

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
