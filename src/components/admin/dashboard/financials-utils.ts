/**
 * Financials utility functions
 * Pure logic extracted for testability
 */

import type { FinancialData } from './types';

export interface CurrencyBreakdown {
  currency: string;
  ticketGross: number;
  sponsorPaid: number;
  sponsorPending: number;
  fees: number;
  combinedGross: number;
  combinedNet: number;
}

export interface GrandTotal {
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalRefunded: number;
  totalPending: number;
}

/**
 * Format cents to locale string (e.g. 26500 -> "265.00")
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Merge ticket and sponsorship revenue into per-currency breakdowns.
 * CHF is always sorted first, then alphabetical.
 */
export function getCombinedByCurrency(
  summary: FinancialData['summary'],
  sponsorshipSummary?: FinancialData['sponsorshipSummary']
): CurrencyBreakdown[] {
  const currencies = new Set<string>();
  const ticketRevenue: Record<string, number> = {
    ...(summary.revenueByCurrency || { CHF: summary.grossRevenue }),
  };
  const ticketFees: Record<string, number> = {
    ...(summary.stripeFeesByCurrency || { CHF: summary.totalStripeFees }),
  };
  const sponsorPaid: Record<string, number> = {};
  const sponsorPending: Record<string, number> = {};

  for (const cur of Object.keys(ticketRevenue)) {
    currencies.add(cur);
  }

  if (sponsorshipSummary) {
    for (const [cur, data] of Object.entries(sponsorshipSummary.revenueByCurrency)) {
      if (data.paid > 0 || data.pending > 0) {
        currencies.add(cur);
        sponsorPaid[cur] = data.paid;
        sponsorPending[cur] = data.pending;
      }
    }
  }

  return Array.from(currencies)
    .sort((a, b) => (a === 'CHF' ? -1 : b === 'CHF' ? 1 : a.localeCompare(b)))
    .map((cur) => {
      const tGross = ticketRevenue[cur] || 0;
      const sPaid = sponsorPaid[cur] || 0;
      const f = ticketFees[cur] || 0;
      return {
        currency: cur,
        ticketGross: tGross,
        sponsorPaid: sPaid,
        sponsorPending: sponsorPending[cur] || 0,
        fees: f,
        combinedGross: tGross + sPaid,
        combinedNet: tGross + sPaid - f,
      };
    });
}

/**
 * Sum all currencies into a single grand total (mixed-currency sum).
 * Useful for a quick "how much money total" view.
 */
export function getGrandTotal(
  byCurrency: CurrencyBreakdown[],
  summary: FinancialData['summary']
): GrandTotal {
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;
  let totalPending = 0;
  let totalRefunded = 0;

  for (const row of byCurrency) {
    totalGross += row.combinedGross;
    totalFees += row.fees;
    totalNet += row.combinedNet;
    totalPending += row.sponsorPending;
  }

  // Refunds: sum all currencies
  if (summary.refundedByCurrency) {
    totalRefunded = Object.values(summary.refundedByCurrency).reduce((s, v) => s + v, 0);
  } else {
    totalRefunded = summary.totalRefunded;
  }

  return { totalGross, totalFees, totalNet, totalRefunded, totalPending };
}
