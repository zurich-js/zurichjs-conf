/**
 * Sponsor Detail Modal - Shared types and utilities
 */

import type { SponsorshipDealWithRelations } from '../types';

export type TabId = 'details' | 'pricing' | 'perks' | 'invoice';

export interface SponsorDetailModalProps {
  deal: SponsorshipDealWithRelations;
  onClose: () => void;
  onUpdate: () => void;
}

export interface EditFormData {
  companyName: string;
  companyWebsite: string;
  vatId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  billingAddressStreet: string;
  billingAddressCity: string;
  billingAddressPostalCode: string;
  billingAddressCountry: string;
  internalNotes: string;
}

export interface ConversionState {
  payInEur: boolean;
  conversionRate: string;
  convertedAmount: string;
  conversionJustification: string;
  conversionRateSource: 'ecb' | 'bank' | 'manual' | 'other';
}

export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function getInitialEditForm(sponsor: SponsorshipDealWithRelations['sponsor']): EditFormData {
  return {
    companyName: sponsor.company_name,
    companyWebsite: sponsor.company_website || '',
    vatId: sponsor.vat_id || '',
    contactName: sponsor.contact_name,
    contactEmail: sponsor.contact_email,
    contactPhone: sponsor.contact_phone || '',
    billingAddressStreet: sponsor.billing_address_street,
    billingAddressCity: sponsor.billing_address_city,
    billingAddressPostalCode: sponsor.billing_address_postal_code,
    billingAddressCountry: sponsor.billing_address_country,
    internalNotes: sponsor.internal_notes || '',
  };
}

export function calculateConvertedAmount(rate: string, baseAmount: number): string {
  const rateNum = parseFloat(rate);
  if (isNaN(rateNum) || rateNum <= 0) return '';
  return ((baseAmount / 100) * rateNum).toFixed(2);
}

export function calculateRateFromAmount(amount: string, baseAmount: number): string {
  const amountNum = parseFloat(amount);
  const baseInUnits = baseAmount / 100;
  if (isNaN(amountNum) || amountNum <= 0 || baseInUnits <= 0) return '';
  return (amountNum / baseInUnits).toFixed(4);
}

export function isConversionValid(state: ConversionState): boolean {
  if (!state.payInEur) return true;
  const rate = parseFloat(state.conversionRate);
  const amount = parseFloat(state.convertedAmount);
  return rate > 0.1 && rate < 10 && amount > 0 && state.conversionJustification.trim().length > 0;
}

export async function apiCall(
  url: string,
  options: RequestInit | undefined,
  setError: (e: string | null) => void,
  setIsUpdating: (b: boolean) => void,
  onUpdate: () => void
): Promise<unknown> {
  setError(null);
  setIsUpdating(true);
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Request failed');
    }
    onUpdate();
    return await response.json();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Request failed');
    throw err;
  } finally {
    setIsUpdating(false);
  }
}
