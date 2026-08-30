import { describe, it, expect } from 'vitest';
import {
  buildWorkshopCapacityWarnings,
  computeInvoiceTotals,
  countWorkshopSeats,
  isWorkshopOnlyInvoice,
  maxAttendeesForInvoice,
} from '../invoice-calculations';

describe('computeInvoiceTotals', () => {
  it('computes ticket-only totals without VAT', () => {
    const totals = computeInvoiceTotals({
      unitPrice: 29500,
      ticketQuantity: 4,
      vatRate: 0,
    });

    expect(totals.subtotal).toBe(118000);
    expect(totals.vatAmount).toBe(0);
    expect(totals.totalAmount).toBe(118000);
  });

  it('adds workshop lines to the subtotal', () => {
    const totals = computeInvoiceTotals({
      unitPrice: 29500,
      ticketQuantity: 2,
      workshopItems: [
        { quantity: 2, unitPrice: 25000 },
        { quantity: 1, unitPrice: 15000 },
      ],
      vatRate: 0,
    });

    // 2 × 29500 + 2 × 25000 + 1 × 15000
    expect(totals.subtotal).toBe(59000 + 50000 + 15000);
    expect(totals.totalAmount).toBe(124000);
  });

  it('applies VAT on the combined subtotal and rounds to whole cents', () => {
    const totals = computeInvoiceTotals({
      unitPrice: 10000,
      ticketQuantity: 1,
      workshopItems: [{ quantity: 1, unitPrice: 5555 }],
      vatRate: 8.1,
    });

    expect(totals.subtotal).toBe(15555);
    // 15555 × 0.081 = 1259.955 → 1260
    expect(totals.vatAmount).toBe(1260);
    expect(totals.totalAmount).toBe(16815);
  });

  it('treats an empty workshop list the same as no workshops', () => {
    const withEmpty = computeInvoiceTotals({
      unitPrice: 20000,
      ticketQuantity: 3,
      workshopItems: [],
      vatRate: 2.6,
    });
    const withoutField = computeInvoiceTotals({
      unitPrice: 20000,
      ticketQuantity: 3,
      vatRate: 2.6,
    });

    expect(withEmpty).toEqual(withoutField);
  });
});

describe('workshop-only invoices', () => {
  it('totals a workshop-only invoice from its workshop lines alone', () => {
    const totals = computeInvoiceTotals({
      unitPrice: 0,
      ticketQuantity: 0,
      workshopItems: [
        { quantity: 3, unitPrice: 25000 },
        { quantity: 1, unitPrice: 15000 },
      ],
      vatRate: 0,
    });

    expect(totals.subtotal).toBe(90000);
    expect(totals.totalAmount).toBe(90000);
  });

  it('treats zero tickets as workshop-only', () => {
    expect(isWorkshopOnlyInvoice(0)).toBe(true);
    expect(isWorkshopOnlyInvoice(1)).toBe(false);
  });

  it('counts purchased workshop seats', () => {
    expect(countWorkshopSeats([{ quantity: 2 }, { quantity: 5 }])).toBe(7);
    expect(countWorkshopSeats()).toBe(0);
  });

  it('caps attendees by ticket count on ticketed invoices', () => {
    expect(
      maxAttendeesForInvoice({
        ticketQuantity: 4,
        workshopItems: [{ quantity: 10 }],
      })
    ).toBe(4);
  });

  it('caps attendees by purchased seats on workshop-only invoices', () => {
    expect(
      maxAttendeesForInvoice({
        ticketQuantity: 0,
        workshopItems: [{ quantity: 2 }, { quantity: 3 }],
      })
    ).toBe(5);
  });

  it('leaves no room for attendees when nothing was purchased', () => {
    expect(maxAttendeesForInvoice({ ticketQuantity: 0 })).toBe(0);
  });
});

describe('buildWorkshopCapacityWarnings', () => {
  const workshops = [
    { workshopId: 'w1', capacity: 20, enrolledCount: 18 },
    { workshopId: 'w2', capacity: 10, enrolledCount: 10 },
  ];

  it('stays silent while every line fits', () => {
    const warnings = buildWorkshopCapacityWarnings(
      [{ workshopId: 'w1', title: 'Testing', quantity: 2 }],
      workshops
    );

    expect(warnings).toEqual([]);
  });

  it('reports how far a line oversells the workshop', () => {
    const warnings = buildWorkshopCapacityWarnings(
      [{ workshopId: 'w1', title: 'Testing', quantity: 5 }],
      workshops
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('only 2 remaining');
    expect(warnings[0]).toContain('oversold by 3');
  });

  it('counts a full workshop as zero remaining', () => {
    const warnings = buildWorkshopCapacityWarnings(
      [{ workshopId: 'w2', title: 'Full house', quantity: 1 }],
      workshops
    );

    expect(warnings[0]).toContain('only 0 remaining');
  });

  it('flags a line whose workshop offering is gone', () => {
    const warnings = buildWorkshopCapacityWarnings(
      [{ workshopId: 'missing', title: 'Deleted', quantity: 1 }],
      workshops
    );

    expect(warnings).toEqual(['"Deleted": workshop offering no longer exists']);
  });
});
