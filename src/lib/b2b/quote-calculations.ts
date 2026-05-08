/**
 * B2B Quote Calculations
 * Pure functions for computing quote breakdowns, defaults, and formatting.
 * No side effects — fully testable.
 */

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
  ws: { workshopId: string; title: string; slug: string; quantity: number; unitPriceCents: number; discountPercent: number; linkedToVip: boolean },
  vipTicketCount: number,
): WorkshopLineBreakdown {
  const subtotalCents = ws.unitPriceCents * ws.quantity;
  const discountCents = Math.round(subtotalCents * ws.discountPercent / 100);

  // VIP savings: 20% off for seats covered by VIP ticket holders
  let vipSavingsCents = 0;
  if (ws.linkedToVip && vipTicketCount > 0) {
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
// ---------------------------------------------------------------------------

/** Encode quote state to a URL-safe base64 string */
export function encodeQuoteToUrl(state: B2BQuoteState): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(state)));
  } catch {
    return '';
  }
}

/** Decode a base64 URL param back to quote state. Returns null on invalid input. */
export function decodeQuoteFromUrl(encoded: string): B2BQuoteState | null {
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
