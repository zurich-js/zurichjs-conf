import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals } from '../invoice-calculations';

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
