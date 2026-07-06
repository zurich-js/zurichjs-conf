/**
 * B2B Invoice Calculations
 * Pure functions for computing invoice totals from ticket + workshop lines.
 * No side effects — fully testable.
 */

export interface InvoiceWorkshopLine {
  quantity: number;
  unitPrice: number; // in cents
}

export interface InvoiceTotals {
  subtotal: number; // in cents
  vatAmount: number; // in cents
  totalAmount: number; // in cents
}

/**
 * Compute invoice totals: ticket line + workshop lines, then VAT on top.
 */
export function computeInvoiceTotals(params: {
  unitPrice: number;
  ticketQuantity: number;
  workshopItems?: InvoiceWorkshopLine[];
  vatRate: number; // percentage, e.g. 8.1
}): InvoiceTotals {
  const ticketSubtotal = params.unitPrice * params.ticketQuantity;
  const workshopSubtotal = (params.workshopItems ?? []).reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const subtotal = ticketSubtotal + workshopSubtotal;
  const vatAmount = Math.round(subtotal * (params.vatRate / 100));

  return {
    subtotal,
    vatAmount,
    totalAmount: subtotal + vatAmount,
  };
}
