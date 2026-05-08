/**
 * Sponsor Quote Catalog
 * Tier templates with auto-populated items, plus add-on items for the quote builder.
 * All prices are in CHF — use convertCHFToCurrency() with live FX rates for other currencies.
 */

import type { SponsorQuoteCurrency, SponsorQuoteItem } from '@/lib/types/sponsor-quote';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

// ---------------------------------------------------------------------------
// FX conversion helper
// ---------------------------------------------------------------------------

/**
 * Convert a CHF amount in cents to another currency, rounded UP to the nearest 100 (cents).
 * e.g. CHF 1500000 at rate 0.93 → EUR 1395000 → rounds up to EUR 1395000 (13'950.00)
 * For CHF, returns the amount unchanged.
 */
export function convertCHFToCurrency(
  chfCents: number,
  currency: SponsorQuoteCurrency,
  rates: ExchangeRates,
): number {
  if (currency === 'CHF') return chfCents;
  const rate = rates[currency];
  if (!rate) return chfCents; // fallback to CHF if rate unavailable
  const converted = chfCents * rate;
  // Round up to nearest 100 cents (= nearest 1.00 in display currency)
  return Math.ceil(converted / 100) * 100;
}

// ---------------------------------------------------------------------------
// Tier Templates — selecting a tier auto-populates items + add-on budget
// ---------------------------------------------------------------------------

interface TierIncludedItem {
  category: string;
  label: string;
  quantity: number;
}

export interface TierTemplate {
  id: string;
  name: string;
  basePriceCHF: number; // cents
  addOnBudgetCHF: number; // cents
  includedItems: TierIncludedItem[];
}

/** Items that ALL sponsors get regardless of tier */
const ALL_SPONSORS_ITEMS: TierIncludedItem[] = [
  { category: 'Brand Visibility', label: 'Logo Placement on Website', quantity: 1 },
  { category: 'Brand Visibility', label: 'Swag Distribution (Goodie Bags / On-Site)', quantity: 1 },
];

export const TIER_TEMPLATES: TierTemplate[] = [
  {
    id: 'diamond', name: 'Diamond',
    basePriceCHF: 1_500_000, addOnBudgetCHF: 500_000,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Tickets', quantity: 10 },
      { category: 'Conference Access', label: 'Reserved Workshop Seats', quantity: 5 },
      { category: 'Stage & Content', label: '60 sec Video Ad Rotation', quantity: 1 },
      { category: 'Stage & Content', label: '5 min Stage Slot', quantity: 1 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
  {
    id: 'platinum', name: 'Platinum',
    basePriceCHF: 1_100_000, addOnBudgetCHF: 400_000,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Tickets', quantity: 8 },
      { category: 'Conference Access', label: 'Reserved Workshop Seats', quantity: 3 },
      { category: 'Stage & Content', label: '30 sec Video Ad Rotation', quantity: 1 },
      { category: 'Stage & Content', label: '2 min Stage Slot', quantity: 1 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
  {
    id: 'gold', name: 'Gold',
    basePriceCHF: 850_000, addOnBudgetCHF: 250_000,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Tickets', quantity: 6 },
      { category: 'Conference Access', label: 'Reserved Workshop Seats', quantity: 1 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
  {
    id: 'silver', name: 'Silver',
    basePriceCHF: 600_000, addOnBudgetCHF: 150_000,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Tickets', quantity: 4 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
  {
    id: 'bronze', name: 'Bronze',
    basePriceCHF: 300_000, addOnBudgetCHF: 100_000,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Tickets', quantity: 2 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
  {
    id: 'supporter', name: 'Supporter',
    basePriceCHF: 120_000, addOnBudgetCHF: 0,
    includedItems: [
      { category: 'Conference Access', label: 'Conference Ticket', quantity: 1 },
      ...ALL_SPONSORS_ITEMS,
    ],
  },
];

// ---------------------------------------------------------------------------
// Add-on catalog — items purchasable with the add-on budget (CHF prices)
// ---------------------------------------------------------------------------

export interface AddOnCatalogItem {
  id: string;
  category: string;
  label: string;
  priceCHF: number; // cents
  suggestedExclusivityPremiumCHF: number; // cents
}

export const ADD_ON_CATALOG: AddOnCatalogItem[] = [
  // Community
  { id: 'addon-meetup', category: 'Community', label: 'Meetup Sponsorship (2-8/year)', priceCHF: 100_000, suggestedExclusivityPremiumCHF: 0 },

  // Tickets & Workshops
  { id: 'addon-ticket', category: 'Tickets & Workshops', label: 'Extra Conference Ticket', priceCHF: 30_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-workshop-seat', category: 'Tickets & Workshops', label: 'Reserved Workshop Seat', priceCHF: 50_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-cobranded-workshop', category: 'Tickets & Workshops', label: 'Co-branded Workshop (2-6h)', priceCHF: 200_000, suggestedExclusivityPremiumCHF: 0 },

  // Branding
  { id: 'addon-logo-media', category: 'Branding', label: 'Logo - Media (Event Photos)', priceCHF: 300_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-venue-branding', category: 'Branding', label: 'Venue Branding (Signage/Banners)', priceCHF: 100_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-video-ads', category: 'Branding', label: 'Video Ad in Rotation (10-60s)', priceCHF: 100_000, suggestedExclusivityPremiumCHF: 0 },

  // Booths
  { id: 'addon-booth-xl', category: 'Booths', label: 'XL Booth', priceCHF: 800_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-booth-large', category: 'Booths', label: 'Large Booth', priceCHF: 600_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-booth-medium', category: 'Booths', label: 'Medium Booth', priceCHF: 400_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-booth-small', category: 'Booths', label: 'Small Booth', priceCHF: 200_000, suggestedExclusivityPremiumCHF: 0 },

  // Stage Presence
  { id: 'addon-mc-grouped', category: 'Stage Presence', label: 'Grouped MC Mention', priceCHF: 50_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-mc-individual', category: 'Stage Presence', label: 'Individual MC Shoutout', priceCHF: 100_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-stage-5', category: 'Stage Presence', label: 'Stage Slot (5 min)', priceCHF: 500_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-stage-2', category: 'Stage Presence', label: 'Stage Slot (2 min)', priceCHF: 200_000, suggestedExclusivityPremiumCHF: 0 },

  // Cause Sponsorship
  { id: 'addon-diversity', category: 'Cause Sponsorship', label: 'Diversity / Student Sponsor (Shared)', priceCHF: 200_000, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-sustainability', category: 'Cause Sponsorship', label: 'Sustainability Sponsor', priceCHF: 250_000, suggestedExclusivityPremiumCHF: 0 },

  // Experience Sponsorship
  { id: 'addon-catering', category: 'Experience Sponsorship', label: 'Catering Sponsor (Coffee, Water, Apero)', priceCHF: 0, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-activity', category: 'Experience Sponsorship', label: 'Activity Sponsor (After Party, Tours)', priceCHF: 0, suggestedExclusivityPremiumCHF: 0 },
  { id: 'addon-afterparty', category: 'Experience Sponsorship', label: 'After-party Sponsor', priceCHF: 0, suggestedExclusivityPremiumCHF: 0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _uid = 1;
function uid(): string { return `ti-${Date.now()}-${_uid++}`; }

/** Generate items from a tier template, converting to the target currency via FX rates */
export function itemsFromTier(
  tier: TierTemplate,
  currency: SponsorQuoteCurrency,
  rates: ExchangeRates,
): SponsorQuoteItem[] {
  const base: SponsorQuoteItem = {
    id: uid(),
    category: 'Sponsorship Tier',
    label: `${tier.name} Level`,
    quantity: 1,
    unitPriceCents: convertCHFToCurrency(tier.basePriceCHF, currency, rates),
    discountPercent: 0,
    includedInTier: false,
    forgoneQty: 0,
    forgoneValuePerUnitCents: 0,
    exclusive: false,
    exclusivityPremiumType: 'fixed',
    exclusivityPremiumValue: 0,
  };

  const included: SponsorQuoteItem[] = tier.includedItems.map((inc) => ({
    id: uid(),
    category: inc.category,
    label: inc.label,
    quantity: inc.quantity,
    unitPriceCents: 0,
    discountPercent: 0,
    includedInTier: true,
    forgoneQty: 0,
    forgoneValuePerUnitCents: 0,
    exclusive: false,
    exclusivityPremiumType: 'fixed' as const,
    exclusivityPremiumValue: 0,
  }));

  return [base, ...included];
}

/** Get add-on catalog grouped by category */
export function getAddOnsByCategory(): Record<string, AddOnCatalogItem[]> {
  const grouped: Record<string, AddOnCatalogItem[]> = {};
  for (const item of ADD_ON_CATALOG) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  return grouped;
}
