/**
 * Sponsor Quote Calculations
 * Pure functions for computing sponsor quote breakdowns, defaults, and URL encoding.
 * No side effects — fully testable.
 */

import LZString from 'lz-string';
import type { SponsorQuoteCurrency } from '@/lib/types/sponsor-quote';
import type {
  SponsorQuoteState,
  SponsorQuoteOption,
  SponsorQuoteItem,
  SponsorQuoteBreakdown,
  SponsorQuoteOptionBreakdown,
  SponsorItemBreakdown,
  SponsorDiscountBreakdown,
} from '@/lib/types/sponsor-quote';

// Re-export formatQuoteAmount for convenience
export { formatQuoteAmount } from '@/lib/b2b/quote-calculations';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function createDefaultSponsorQuoteState(): SponsorQuoteState {
  return {
    companyName: '',
    contactName: '',
    contactEmail: '',
    notes: '',
    currency: 'CHF',
    validUntil: '',
    recommendedOptionId: '',
    options: [createDefaultSponsorOption('opt-1')],
  };
}

export function createDefaultSponsorOption(id: string): SponsorQuoteOption {
  return {
    id,
    title: '',
    description: '',
    highlights: [],
    addOnBudgetCents: 0,
    items: [],
    customDiscounts: [],
  };
}

// ---------------------------------------------------------------------------
// Item breakdown
// ---------------------------------------------------------------------------

function computeItemBreakdown(item: SponsorQuoteItem): SponsorItemBreakdown {
  const forgoneQty = item.includedInTier ? Math.min(item.forgoneQty, item.quantity) : 0;
  const forgoneCreditCents = forgoneQty * item.forgoneValuePerUnitCents;
  const effectiveQty = item.quantity - forgoneQty;

  // Fully forgone included items contribute nothing
  if (item.includedInTier && effectiveQty <= 0) {
    return {
      id: item.id, category: item.category, label: item.label,
      quantity: item.quantity, unitPriceCents: 0,
      subtotalCents: 0, discountPercent: 0, discountCents: 0,
      includedInTier: true, forgoneQty, forgoneCreditCents,
      exclusive: false, exclusivityPremiumCents: 0, netCents: 0,
    };
  }

  const subtotalCents = item.unitPriceCents * (item.includedInTier ? effectiveQty : item.quantity);
  const discountCents = Math.round(subtotalCents * item.discountPercent / 100);

  let exclusivityPremiumCents = 0;
  if (item.exclusive) {
    exclusivityPremiumCents =
      item.exclusivityPremiumType === 'fixed'
        ? item.exclusivityPremiumValue
        : Math.round(subtotalCents * item.exclusivityPremiumValue / 100);
  }

  const netCents = Math.max(0, subtotalCents - discountCents + exclusivityPremiumCents);

  return {
    id: item.id, category: item.category, label: item.label,
    quantity: item.quantity, unitPriceCents: item.unitPriceCents,
    subtotalCents, discountPercent: item.discountPercent, discountCents,
    includedInTier: item.includedInTier, forgoneQty, forgoneCreditCents,
    exclusive: item.exclusive, exclusivityPremiumCents, netCents,
  };
}

// ---------------------------------------------------------------------------
// Option breakdown
// ---------------------------------------------------------------------------

export function computeSponsorOptionBreakdown(option: SponsorQuoteOption): SponsorQuoteOptionBreakdown {
  const items = option.items.map(computeItemBreakdown);

  const subtotalCents = items.reduce((s, i) => s + i.subtotalCents, 0);
  const totalItemDiscountCents = items.reduce((s, i) => s + i.discountCents, 0);
  const totalExclusivityCents = items.reduce((s, i) => s + i.exclusivityPremiumCents, 0);

  const preCustomDiscountTotal = items.reduce((s, i) => s + i.netCents, 0);

  const customDiscounts: SponsorDiscountBreakdown[] = option.customDiscounts.map((d) => {
    const amountCents =
      d.type === 'fixed'
        ? d.value
        : Math.round(preCustomDiscountTotal * d.value / 100);
    return { id: d.id, label: d.label, amountCents };
  });
  const totalCustomDiscountCents = customDiscounts.reduce((s, d) => s + d.amountCents, 0);

  const totalItemDiscountCentsAll = totalItemDiscountCents + totalCustomDiscountCents;

  const exclusiveItemLabels = items
    .filter((i) => i.exclusive)
    .map((i) => i.label);

  // Forgone: sum of forgone credit values (credited back to budget)
  const totalForgoneCents = items.reduce((s, i) => s + i.forgoneCreditCents, 0);

  // Add-on budget: spent = sum of net costs for non-tier-included, non-tier-base items
  const addOnSpentCents = items
    .filter((i) => !i.includedInTier && i.category !== 'Sponsorship Tier')
    .reduce((s, i) => s + i.netCents, 0);
  const addOnBudgetCents = option.addOnBudgetCents;
  const effectiveBudgetCents = addOnBudgetCents + totalForgoneCents;
  const addOnRemainingCents = effectiveBudgetCents - addOnSpentCents;

  // Total: tier base + add-on overage (items beyond what the budget covers) - custom discounts
  // The add-on budget absorbs add-on item costs; only the overage is charged.
  const tierBaseCents = items
    .filter((i) => i.category === 'Sponsorship Tier')
    .reduce((s, i) => s + i.netCents, 0);
  const addOnOverageCents = Math.max(0, addOnSpentCents - effectiveBudgetCents);
  const totalDiscountCents = totalItemDiscountCentsAll;
  const totalCents = Math.max(0, tierBaseCents + addOnOverageCents - totalCustomDiscountCents);

  return {
    optionId: option.id,
    title: option.title,
    items,
    customDiscounts,
    subtotalCents,
    totalItemDiscountCents,
    totalExclusivityCents,
    totalCustomDiscountCents,
    totalDiscountCents,
    totalCents,
    exclusiveItemLabels,
    addOnBudgetCents,
    totalForgoneCents,
    effectiveBudgetCents,
    addOnSpentCents,
    addOnRemainingCents,
  };
}

// ---------------------------------------------------------------------------
// Full quote breakdown
// ---------------------------------------------------------------------------

export function computeSponsorQuoteBreakdown(state: SponsorQuoteState): SponsorQuoteBreakdown {
  const options = state.options.map(computeSponsorOptionBreakdown);

  const recommendedIndex = state.recommendedOptionId
    ? state.options.findIndex((o) => o.id === state.recommendedOptionId)
    : -1;

  return { options, recommendedIndex, currency: state.currency };
}

// ---------------------------------------------------------------------------
// URL encode / decode — v5 (adds forgoneQty/forgoneValuePerUnitCents)
// ---------------------------------------------------------------------------

type CompactItem = [
  id: string, category: string, label: string, qty: number,
  priceCents: number, discountPct: number,
  includedInTier: 0 | 1, forgoneQty: number, forgoneValuePerUnit: number,
  exclusive: 0 | 1, premiumType: 0 | 1, premiumValue: number,
];
type CompactDiscount = [id: string, label: string, type: 0 | 1, value: number];
type CompactOption = [
  id: string, title: string, description: string,
  highlights: string[], addOnBudgetCents: number,
  items: CompactItem[], discounts: CompactDiscount[],
];
type CompactSponsorQuote = [
  version: 5,
  companyName: string, contactName: string, contactEmail: string, notes: string,
  currency: SponsorQuoteCurrency, validUntil: string, recommendedOptionId: string,
  options: CompactOption[],
];

function toCompact(state: SponsorQuoteState): CompactSponsorQuote {
  return [
    5,
    state.companyName, state.contactName, state.contactEmail, state.notes,
    state.currency, state.validUntil, state.recommendedOptionId ?? '',
    state.options.map((o): CompactOption => [
      o.id, o.title, o.description,
      o.highlights ?? [], o.addOnBudgetCents ?? 0,
      o.items.map((i): CompactItem => [
        i.id, i.category, i.label, i.quantity, i.unitPriceCents, i.discountPercent,
        i.includedInTier ? 1 : 0, i.forgoneQty, i.forgoneValuePerUnitCents,
        i.exclusive ? 1 : 0, i.exclusivityPremiumType === 'fixed' ? 1 : 0, i.exclusivityPremiumValue,
      ]),
      o.customDiscounts.map((d) => [d.id, d.label, d.type === 'fixed' ? 1 : 0, d.value]),
    ]),
  ];
}

function fromCompactV5(c: CompactSponsorQuote): SponsorQuoteState {
  return {
    companyName: c[1] ?? '', contactName: c[2] ?? '', contactEmail: c[3] ?? '',
    notes: c[4] ?? '', currency: c[5] ?? 'CHF', validUntil: c[6] ?? '',
    recommendedOptionId: c[7] ?? '',
    options: (c[8] ?? []).map((o) => ({
      id: o[0], title: o[1] ?? '', description: o[2] ?? '',
      highlights: o[3] ?? [], addOnBudgetCents: o[4] ?? 0,
      items: (o[5] ?? []).map((i) => ({
        id: i[0], category: i[1], label: i[2],
        quantity: i[3], unitPriceCents: i[4], discountPercent: i[5],
        includedInTier: i[6] === 1, forgoneQty: i[7] ?? 0, forgoneValuePerUnitCents: i[8] ?? 0,
        exclusive: i[9] === 1,
        exclusivityPremiumType: i[10] === 1 ? 'fixed' as const : 'percent' as const,
        exclusivityPremiumValue: i[11],
      })),
      customDiscounts: (o[6] ?? []).map((d) => ({
        id: d[0], label: d[1], type: d[2] === 1 ? 'fixed' as const : 'percent' as const, value: d[3],
      })),
    })),
  };
}

// v4 backward compat (no forgone fields)
function fromOlderCompact(c: unknown[]): SponsorQuoteState {
  const hasAddOnBudget = c[0] === 4;
  return {
    companyName: (c[1] as string) ?? '', contactName: (c[2] as string) ?? '',
    contactEmail: (c[3] as string) ?? '', notes: (c[4] as string) ?? '',
    currency: (c[5] as SponsorQuoteCurrency) ?? 'CHF', validUntil: (c[6] as string) ?? '',
    recommendedOptionId: (c[7] as string) ?? '',
    options: ((c[8] as unknown[][]) ?? []).map((o: unknown[]) => ({
      id: o[0] as string, title: (o[1] as string) ?? '', description: (o[2] as string) ?? '',
      highlights: (o[3] as string[]) ?? [],
      addOnBudgetCents: hasAddOnBudget ? (o[4] as number) ?? 0 : 0,
      items: ((o[hasAddOnBudget ? 5 : 4] as unknown[][]) ?? []).map((i: unknown[]) => ({
        id: i[0] as string, category: i[1] as string, label: i[2] as string,
        quantity: i[3] as number, unitPriceCents: i[4] as number, discountPercent: i[5] as number,
        includedInTier: hasAddOnBudget ? i[6] === 1 : false,
        forgoneQty: 0, forgoneValuePerUnitCents: 0,
        exclusive: i[hasAddOnBudget ? 7 : 6] === 1,
        exclusivityPremiumType: i[hasAddOnBudget ? 8 : 7] === 1 ? 'fixed' as const : 'percent' as const,
        exclusivityPremiumValue: i[hasAddOnBudget ? 9 : 8] as number,
      })),
      customDiscounts: ((o[hasAddOnBudget ? 6 : 5] as unknown[][]) ?? []).map((d: unknown[]) => ({
        id: d[0] as string, label: d[1] as string,
        type: d[2] === 1 ? 'fixed' as const : 'percent' as const, value: d[3] as number,
      })),
    })),
  };
}

/** Encode sponsor quote state to a compact URL-safe string. */
export function encodeSponsorQuoteToUrl(state: SponsorQuoteState): string {
  try {
    const json = JSON.stringify(toCompact(state));
    return LZString.compressToEncodedURIComponent(json);
  } catch { return ''; }
}

/** Decode a URL param back to sponsor quote state. */
export function decodeSponsorQuoteFromUrl(encoded: string): SponsorQuoteState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || !Array.isArray(parsed[8])) return null;

    let state: SponsorQuoteState | null = null;
    if (parsed[0] === 5) state = fromCompactV5(parsed as CompactSponsorQuote);
    else if (parsed[0] >= 2 && parsed[0] <= 4) state = fromOlderCompact(parsed);

    if (state && state.options.length >= 1) return state;
  } catch { /* invalid */ }
  return null;
}
