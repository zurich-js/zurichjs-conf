/**
 * Sponsorship Admin UI Types
 */

import type {
  SponsorshipStats,
  SponsorshipDealListItem,
  SponsorshipDealWithRelations,
  Sponsor,
  SponsorshipTier,
  SponsorshipDealStatus,
  SponsorshipCurrency,
  SponsorshipPerkStatus,
  SponsorshipLineItem,
} from '@/lib/types/sponsorship';

// Re-export types from sponsorship module
export type {
  SponsorshipStats,
  SponsorshipDealListItem,
  SponsorshipDealWithRelations,
  Sponsor,
  SponsorshipTier,
  SponsorshipDealStatus,
  SponsorshipCurrency,
  SponsorshipPerkStatus,
  SponsorshipLineItem,
};

// UI-specific types
export interface SponsorshipsTabState {
  selectedDealId: string | null;
  isCreateModalOpen: boolean;
  searchQuery: string;
  statusFilter: SponsorshipDealStatus | 'all';
  tierFilter: string | 'all';
  currencyFilter: SponsorshipCurrency | 'all';
}

export interface CreateSponsorFormData {
  companyName: string;
  companyWebsite: string;
  vatId: string;
  billingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  internalNotes: string;
}

export interface CreateDealFormData {
  sponsorId: string;
  tierId: string;
  currency: SponsorshipCurrency;
  internalNotes: string;
}
