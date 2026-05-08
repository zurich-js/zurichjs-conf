/**
 * B2B Quote Calculations
 * Pure functions for computing quote breakdowns, defaults, and formatting.
 * No side effects — fully testable.
 */

import LZString from 'lz-string';
import type {
  B2BQuoteState,
  B2BQuoteOption,
  QuoteBreakdown,
  QuoteOptionBreakdown,
  TicketLineBreakdown,
  WorkshopLineBreakdown,
  CustomLineBreakdown,
  CustomDiscountBreakdown,
  QuoteCurrency,
} from '@/lib/types/b2b-quote';

// ---------------------------------------------------------------------------
// VIP benefits (static labels for display)
// ---------------------------------------------------------------------------

const VIP_BENEFITS = [
  'Exclusive after-party access at Seebad Enge',
  'More direct networking with speakers & attendees',
  'Limited edition goodies',
  '20% discount on all workshops',
];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function createDefaultQuoteState(): B2BQuoteState {
  return {
    companyName: '',
    contactName: '',
    contactEmail: '',
    notes: '',
    currency: 'CHF',
    validUntil: '',
    highlights: [],
    options: [createDefaultOption('opt-1')],
  };
}

export function createDefaultOption(id: string): B2BQuoteOption {
  return {
    id,
    title: '',
    description: '',
    standardTickets: { quantity: 0, unitPriceCents: 29500, discountPercent: 0 },
    vipTickets: { quantity: 0, unitPriceCents: 49500, discountPercent: 0 },
    workshops: [],
    customLineItems: [],
    customDiscounts: [],
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  CHF: 'CHF',
  EUR: '€',
  GBP: '£',
  USD: '$',
};

/** Format cents to a human-readable price string: "CHF 1'234.50", "€ 1'234.50", etc. */
export function formatQuoteAmount(cents: number, currency: QuoteCurrency): string {
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat('en-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${formatted}`;
}

// ---------------------------------------------------------------------------
// Ticket line breakdown
// ---------------------------------------------------------------------------

function computeTicketLine(
  quantity: number,
  unitPriceCents: number,
  discountPercent: number,
): TicketLineBreakdown {
  const subtotalCents = unitPriceCents * quantity;
  const discountCents = Math.round(subtotalCents * discountPercent / 100);
  return {
    quantity,
    unitPriceCents,
    subtotalCents,
    discountPercent,
    discountCents,
    netCents: subtotalCents - discountCents,
  };
}

// ---------------------------------------------------------------------------
// Workshop line breakdown
// ---------------------------------------------------------------------------

function computeWorkshopLine(
  ws: { workshopId: string; title: string; slug: string; quantity: number; unitPriceCents: number; discountPercent: number },
  vipTicketCount: number,
): WorkshopLineBreakdown {
  const subtotalCents = ws.unitPriceCents * ws.quantity;
  const discountCents = Math.round(subtotalCents * ws.discountPercent / 100);

  // VIP savings: 20% off for seats covered by VIP ticket holders.
  // Applies automatically whenever the option includes VIP tickets.
  let vipSavingsCents = 0;
  if (vipTicketCount > 0) {
    const vipSeats = Math.min(vipTicketCount, ws.quantity);
    vipSavingsCents = Math.round(ws.unitPriceCents * vipSeats * 0.2);
  }

  const netCents = subtotalCents - discountCents - vipSavingsCents;
  return {
    workshopId: ws.workshopId,
    title: ws.title,
    slug: ws.slug,
    quantity: ws.quantity,
    unitPriceCents: ws.unitPriceCents,
    subtotalCents,
    discountPercent: ws.discountPercent,
    discountCents,
    vipSavingsCents,
    netCents: Math.max(0, netCents),
  };
}

// ---------------------------------------------------------------------------
// Custom line item breakdown
// ---------------------------------------------------------------------------

function computeCustomLine(item: { id: string; label: string; quantity: number; unitPriceCents: number }): CustomLineBreakdown {
  return {
    id: item.id,
    label: item.label,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    subtotalCents: item.unitPriceCents * item.quantity,
  };
}

// ---------------------------------------------------------------------------
// Option breakdown
// ---------------------------------------------------------------------------

export function computeOptionBreakdown(option: B2BQuoteOption): QuoteOptionBreakdown {
  const std = computeTicketLine(
    option.standardTickets.quantity,
    option.standardTickets.unitPriceCents,
    option.standardTickets.discountPercent,
  );
  const vip = computeTicketLine(
    option.vipTickets.quantity,
    option.vipTickets.unitPriceCents,
    option.vipTickets.discountPercent,
  );

  const workshops = option.workshops.map((ws) =>
    computeWorkshopLine(ws, option.vipTickets.quantity),
  );

  const customLineItems = option.customLineItems.map(computeCustomLine);

  // Subtotal before custom discounts
  const ticketNet = std.netCents + vip.netCents;
  const workshopNet = workshops.reduce((sum, w) => sum + w.netCents, 0);
  const customItemsTotal = customLineItems.reduce((sum, c) => sum + c.subtotalCents, 0);
  const preDiscountTotal = ticketNet + workshopNet + customItemsTotal;

  // Compute custom discounts
  const customDiscounts: CustomDiscountBreakdown[] = option.customDiscounts.map((d) => {
    const amountCents =
      d.type === 'fixed'
        ? d.value
        : Math.round(preDiscountTotal * d.value / 100);
    return { id: d.id, label: d.label, amountCents };
  });
  const totalCustomDiscountCents = customDiscounts.reduce((sum, d) => sum + d.amountCents, 0);

  // Totals
  const subtotalCents =
    std.subtotalCents +
    vip.subtotalCents +
    workshops.reduce((s, w) => s + w.subtotalCents, 0) +
    customItemsTotal;

  const totalDiscountCents =
    std.discountCents +
    vip.discountCents +
    workshops.reduce((s, w) => s + w.discountCents + w.vipSavingsCents, 0) +
    totalCustomDiscountCents;

  const totalCents = Math.max(0, preDiscountTotal - totalCustomDiscountCents);
  const totalPeople = std.quantity + vip.quantity;
  const perPersonCents = totalPeople > 0 ? Math.round(totalCents / totalPeople) : 0;

  const totalVipWorkshopSavingsCents = workshops.reduce((s, w) => s + w.vipSavingsCents, 0);
  const vipBenefits = vip.quantity > 0 ? [...VIP_BENEFITS] : [];

  return {
    optionId: option.id,
    title: option.title,
    standardTickets: std,
    vipTickets: vip,
    workshops,
    customLineItems,
    customDiscounts,
    subtotalCents,
    totalDiscountCents,
    totalCents,
    totalPeople,
    perPersonCents,
    vipBenefits,
    totalVipWorkshopSavingsCents,
  };
}

// ---------------------------------------------------------------------------
// Full quote breakdown
// ---------------------------------------------------------------------------

export function computeQuoteBreakdown(state: B2BQuoteState): QuoteBreakdown {
  const options = state.options.map(computeOptionBreakdown);

  // Find best value: highest total savings among options with any discount
  let bestValueIndex = -1;
  let highestSavings = 0;
  for (let i = 0; i < options.length; i++) {
    if (options[i].totalDiscountCents > highestSavings) {
      highestSavings = options[i].totalDiscountCents;
      bestValueIndex = i;
    }
  }

  return {
    options,
    bestValueIndex,
    currency: state.currency,
  };
}

// ---------------------------------------------------------------------------
// URL encode / decode
//
// Format v2 (current): a tiny tuple-based representation, then LZ-string
// compressed to URL-safe base64. Empty/default fields are dropped, so
// typical quotes shrink ~3–5× compared to the raw JSON.
//
// Format v1 (legacy): raw JSON wrapped in btoa(encodeURIComponent(...)).
// Decoder still accepts these for shared links from before the change.
// ---------------------------------------------------------------------------

type CompactTicket = [qty: number, priceCents: number, discountPct: number];
type CompactWorkshop = [
  workshopId: string,
  title: string,
  slug: string,
  qty: number,
  priceCents: number,
  discountPct: number,
];
type CompactCustomItem = [id: string, label: string, qty: number, priceCents: number];
type CompactCustomDiscount = [id: string, label: string, type: 0 | 1, value: number]; // 0=percent, 1=fixed
type CompactOption = [
  id: string,
  title: string,
  description: string,
  std: CompactTicket,
  vip: CompactTicket,
  workshops: CompactWorkshop[],
  customItems: CompactCustomItem[],
  customDiscounts: CompactCustomDiscount[],
];
type CompactQuote = [
  version: 2,
  companyName: string,
  contactName: string,
  contactEmail: string,
  notes: string,
  currency: QuoteCurrency,
  validUntil: string,
  highlights: string[],
  options: CompactOption[],
];

function toCompact(state: B2BQuoteState): CompactQuote {
  const t = (l: { quantity: number; unitPriceCents: number; discountPercent: number }): CompactTicket => [
    l.quantity, l.unitPriceCents, l.discountPercent,
  ];
  return [
    2,
    state.companyName,
    state.contactName,
    state.contactEmail,
    state.notes,
    state.currency,
    state.validUntil,
    state.highlights ?? [],
    state.options.map((o): CompactOption => [
      o.id,
      o.title,
      o.description,
      t(o.standardTickets),
      t(o.vipTickets),
      o.workshops.map((w) => [w.workshopId, w.title, w.slug, w.quantity, w.unitPriceCents, w.discountPercent]),
      o.customLineItems.map((c) => [c.id, c.label, c.quantity, c.unitPriceCents]),
      o.customDiscounts.map((d) => [d.id, d.label, d.type === 'fixed' ? 1 : 0, d.value]),
    ]),
  ];
}

function fromCompact(c: CompactQuote): B2BQuoteState {
  const t = ([qty, price, disc]: CompactTicket) => ({
    quantity: qty, unitPriceCents: price, discountPercent: disc,
  });
  return {
    companyName: c[1] ?? '',
    contactName: c[2] ?? '',
    contactEmail: c[3] ?? '',
    notes: c[4] ?? '',
    currency: c[5] ?? 'CHF',
    validUntil: c[6] ?? '',
    highlights: c[7] ?? [],
    options: (c[8] ?? []).map((o) => ({
      id: o[0],
      title: o[1] ?? '',
      description: o[2] ?? '',
      standardTickets: t(o[3]),
      vipTickets: t(o[4]),
      workshops: (o[5] ?? []).map((w) => ({
        workshopId: w[0], title: w[1], slug: w[2],
        quantity: w[3], unitPriceCents: w[4], discountPercent: w[5],
      })),
      customLineItems: (o[6] ?? []).map((ci) => ({
        id: ci[0], label: ci[1], quantity: ci[2], unitPriceCents: ci[3],
      })),
      customDiscounts: (o[7] ?? []).map((d) => ({
        id: d[0], label: d[1], type: d[2] === 1 ? 'fixed' : 'percent', value: d[3],
      })),
    })),
  };
}

function isCompactQuote(value: unknown): value is CompactQuote {
  return Array.isArray(value) && value[0] === 2 && Array.isArray(value[8]);
}

/** Encode quote state to a compact URL-safe string. */
export function encodeQuoteToUrl(state: B2BQuoteState): string {
  try {
    const json = JSON.stringify(toCompact(state));
    return LZString.compressToEncodedURIComponent(json);
  } catch {
    return '';
  }
}

/** Decode a URL param back to quote state. Accepts both v2 (compact) and v1 (legacy JSON) formats. */
export function decodeQuoteFromUrl(encoded: string): B2BQuoteState | null {
  // Try v2: lz-string compressed compact tuple
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (json) {
      const parsed = JSON.parse(json);
      if (isCompactQuote(parsed)) {
        const state = fromCompact(parsed);
        if (state.options.length >= 1) return state;
      }
    }
  } catch {
    // fall through to v1
  }

  // Try v1: legacy btoa(encodeURIComponent(JSON))
  try {
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.options) && parsed.options.length >= 1) {
      return parsed as B2BQuoteState;
    }
  } catch {
    // invalid state
  }
  return null;
}
