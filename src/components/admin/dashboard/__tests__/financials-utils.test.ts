import { describe, it, expect } from 'vitest';
import { formatAmount, getCombinedByCurrency, getGrandTotal } from '../financials-utils';
import type { FinancialData } from '../types';

describe('formatAmount', () => {
  it('formats zero cents', () => {
    expect(formatAmount(0)).toBe('0.00');
  });

  it('formats whole CHF amounts', () => {
    expect(formatAmount(10000)).toBe('100.00');
  });

  it('formats cents correctly', () => {
    expect(formatAmount(26550)).toBe('265.50');
  });

  it('formats large amounts', () => {
    // 1500000 cents = 15000.00
    const result = formatAmount(1500000);
    expect(parseFloat(result.replace(/[^0-9.]/g, ''))).toBe(15000.00);
  });
});

describe('getCombinedByCurrency', () => {
  const baseSummary: FinancialData['summary'] = {
    grossRevenue: 50000,
    totalStripeFees: 1500,
    netRevenue: 48500,
    totalRevenue: 50000,
    confirmedTickets: 10,
    totalRefunded: 0,
    refundedTickets: 0,
    totalTickets: 10,
  };

  it('returns CHF-only breakdown when no per-currency data and no sponsorships', () => {
    const result = getCombinedByCurrency(baseSummary);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      currency: 'CHF',
      ticketGross: 50000,
      sponsorPaid: 0,
      sponsorPending: 0,
      fees: 1500,
      combinedGross: 50000,
      combinedNet: 48500,
    });
  });

  it('uses per-currency revenue data when available', () => {
    const summary = {
      ...baseSummary,
      revenueByCurrency: { CHF: 40000, EUR: 10000 },
      stripeFeesByCurrency: { CHF: 1200, EUR: 300 },
    };

    const result = getCombinedByCurrency(summary);

    expect(result).toHaveLength(2);
    expect(result[0].currency).toBe('CHF');
    expect(result[0].ticketGross).toBe(40000);
    expect(result[0].fees).toBe(1200);
    expect(result[1].currency).toBe('EUR');
    expect(result[1].ticketGross).toBe(10000);
    expect(result[1].fees).toBe(300);
  });

  it('adds CHF sponsorship revenue to CHF combined gross and net', () => {
    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 2,
      paidDeals: 1,
      pendingDeals: 1,
      revenueByCurrency: {
        CHF: { paid: 200000, pending: 100000 },
        EUR: { paid: 0, pending: 0 },
      },
      byTier: {},
    };

    const result = getCombinedByCurrency(baseSummary, sponsorshipSummary);

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe('CHF');
    expect(result[0].ticketGross).toBe(50000);
    expect(result[0].sponsorPaid).toBe(200000);
    expect(result[0].sponsorPending).toBe(100000);
    expect(result[0].combinedGross).toBe(250000); // 50000 + 200000
    expect(result[0].combinedNet).toBe(248500); // 250000 - 1500
  });

  it('adds EUR sponsorship as separate currency row', () => {
    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 3,
      paidDeals: 2,
      pendingDeals: 1,
      revenueByCurrency: {
        CHF: { paid: 100000, pending: 0 },
        EUR: { paid: 150000, pending: 50000 },
      },
      byTier: {},
    };

    const result = getCombinedByCurrency(baseSummary, sponsorshipSummary);

    expect(result).toHaveLength(2);

    // CHF row: tickets + CHF sponsors
    const chf = result.find(r => r.currency === 'CHF')!;
    expect(chf.ticketGross).toBe(50000);
    expect(chf.sponsorPaid).toBe(100000);
    expect(chf.combinedGross).toBe(150000);
    expect(chf.combinedNet).toBe(148500); // 150000 - 1500 fees

    // EUR row: only sponsors (no EUR tickets)
    const eur = result.find(r => r.currency === 'EUR')!;
    expect(eur.ticketGross).toBe(0);
    expect(eur.sponsorPaid).toBe(150000);
    expect(eur.sponsorPending).toBe(50000);
    expect(eur.fees).toBe(0);
    expect(eur.combinedGross).toBe(150000);
    expect(eur.combinedNet).toBe(150000); // no fees on EUR sponsors
  });

  it('sorts CHF first, then alphabetical', () => {
    const summary = {
      ...baseSummary,
      revenueByCurrency: { EUR: 5000, USD: 3000, CHF: 40000 },
      stripeFeesByCurrency: { EUR: 100, USD: 50, CHF: 1000 },
    };

    const result = getCombinedByCurrency(summary);

    expect(result.map(r => r.currency)).toEqual(['CHF', 'EUR', 'USD']);
  });

  it('handles mixed ticket currencies with multi-currency sponsors', () => {
    const summary = {
      ...baseSummary,
      revenueByCurrency: { CHF: 30000, EUR: 20000 },
      stripeFeesByCurrency: { CHF: 900, EUR: 600 },
    };

    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 2,
      paidDeals: 2,
      pendingDeals: 0,
      revenueByCurrency: {
        CHF: { paid: 100000, pending: 0 },
        EUR: { paid: 80000, pending: 0 },
      },
      byTier: {},
    };

    const result = getCombinedByCurrency(summary, sponsorshipSummary);

    expect(result).toHaveLength(2);

    const chf = result.find(r => r.currency === 'CHF')!;
    expect(chf.ticketGross).toBe(30000);
    expect(chf.sponsorPaid).toBe(100000);
    expect(chf.combinedGross).toBe(130000);
    expect(chf.combinedNet).toBe(129100); // 130000 - 900

    const eur = result.find(r => r.currency === 'EUR')!;
    expect(eur.ticketGross).toBe(20000);
    expect(eur.sponsorPaid).toBe(80000);
    expect(eur.combinedGross).toBe(100000);
    expect(eur.combinedNet).toBe(99400); // 100000 - 600
  });

  it('ignores sponsorship currencies with zero paid and pending', () => {
    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 1,
      paidDeals: 1,
      pendingDeals: 0,
      revenueByCurrency: {
        CHF: { paid: 50000, pending: 0 },
        EUR: { paid: 0, pending: 0 },
      },
      byTier: {},
    };

    const result = getCombinedByCurrency(baseSummary, sponsorshipSummary);

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe('CHF');
  });

  it('includes currency with only pending sponsorship revenue', () => {
    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 1,
      paidDeals: 0,
      pendingDeals: 1,
      revenueByCurrency: {
        CHF: { paid: 0, pending: 0 },
        EUR: { paid: 0, pending: 75000 },
      },
      byTier: {},
    };

    const result = getCombinedByCurrency(baseSummary, sponsorshipSummary);

    expect(result).toHaveLength(2);
    const eur = result.find(r => r.currency === 'EUR')!;
    expect(eur.sponsorPending).toBe(75000);
    expect(eur.combinedGross).toBe(0); // pending doesn't count in gross
    expect(eur.combinedNet).toBe(0);
  });
});

describe('getGrandTotal', () => {
  const baseSummary: FinancialData['summary'] = {
    grossRevenue: 50000,
    totalStripeFees: 1500,
    netRevenue: 48500,
    totalRevenue: 50000,
    confirmedTickets: 10,
    totalRefunded: 5000,
    refundedTickets: 1,
    totalTickets: 11,
  };

  it('sums a single currency', () => {
    const byCurrency = getCombinedByCurrency(baseSummary);
    const grand = getGrandTotal(byCurrency, baseSummary);

    expect(grand.totalGross).toBe(50000);
    expect(grand.totalFees).toBe(1500);
    expect(grand.totalNet).toBe(48500);
    expect(grand.totalRefunded).toBe(5000);
    expect(grand.totalPending).toBe(0);
  });

  it('sums multiple currencies', () => {
    const summary = {
      ...baseSummary,
      revenueByCurrency: { CHF: 30000, EUR: 20000 },
      stripeFeesByCurrency: { CHF: 900, EUR: 600 },
      refundedByCurrency: { CHF: 3000, EUR: 2000 },
    };

    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 2,
      paidDeals: 2,
      pendingDeals: 0,
      revenueByCurrency: {
        CHF: { paid: 100000, pending: 0 },
        EUR: { paid: 80000, pending: 0 },
      },
      byTier: {},
    };

    const byCurrency = getCombinedByCurrency(summary, sponsorshipSummary);
    const grand = getGrandTotal(byCurrency, summary);

    // CHF gross: 30000 + 100000 = 130000
    // EUR gross: 20000 + 80000 = 100000
    expect(grand.totalGross).toBe(230000);
    expect(grand.totalFees).toBe(1500); // 900 + 600
    expect(grand.totalNet).toBe(228500); // 230000 - 1500
    expect(grand.totalRefunded).toBe(5000); // 3000 + 2000
    expect(grand.totalPending).toBe(0);
  });

  it('includes pending sponsorship in total', () => {
    const sponsorshipSummary: FinancialData['sponsorshipSummary'] = {
      totalDeals: 2,
      paidDeals: 1,
      pendingDeals: 1,
      revenueByCurrency: {
        CHF: { paid: 50000, pending: 25000 },
        EUR: { paid: 0, pending: 75000 },
      },
      byTier: {},
    };

    const byCurrency = getCombinedByCurrency(baseSummary, sponsorshipSummary);
    const grand = getGrandTotal(byCurrency, baseSummary);

    expect(grand.totalPending).toBe(100000); // 25000 + 75000
  });

  it('uses totalRefunded fallback when no refundedByCurrency', () => {
    const byCurrency = getCombinedByCurrency(baseSummary);
    const grand = getGrandTotal(byCurrency, baseSummary);

    expect(grand.totalRefunded).toBe(5000); // from baseSummary.totalRefunded
  });
});
