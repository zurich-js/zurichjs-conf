/**
 * B2B Invoice Calculations
 * Pure functions for computing invoice totals and shape from ticket + workshop
 * lines. An invoice may be ticket-only, mixed, or workshop-only.
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

/**
 * Whether an invoice covers workshop seats only (no conference tickets).
 * Workshop-only invoices exist so a company that already bought tickets can be
 * invoiced for workshops separately.
 */
export function isWorkshopOnlyInvoice(ticketQuantity: number): boolean {
  return ticketQuantity <= 0;
}

/**
 * Total purchased workshop seats across all line items
 */
export function countWorkshopSeats(items: Array<{ quantity: number }> = []): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * How many attendees an invoice can hold.
 * Ticketed invoices allow one attendee per ticket; workshop-only invoices allow
 * one attendee per purchased seat (a single attendee may occupy seats in
 * several workshops, so this is an upper bound, not a target).
 */
export function maxAttendeesForInvoice(params: {
  ticketQuantity: number;
  workshopItems?: Array<{ quantity: number }>;
}): number {
  return isWorkshopOnlyInvoice(params.ticketQuantity)
    ? countWorkshopSeats(params.workshopItems)
    : params.ticketQuantity;
}

/** Current seat usage of a workshop offering, for capacity warnings */
export interface WorkshopCapacitySnapshot {
  workshopId: string;
  capacity: number;
  enrolledCount: number;
}

/**
 * Describe how the invoice's workshop lines sit against current capacity.
 *
 * Admin invoicing never blocks on capacity — seats are sold offline and the
 * organisers decide whether a room can take more people. These strings are
 * warnings only.
 */
export function buildWorkshopCapacityWarnings(
  items: Array<{ workshopId: string; title: string; quantity: number }>,
  workshops: WorkshopCapacitySnapshot[]
): string[] {
  const byId = new Map(workshops.map((workshop) => [workshop.workshopId, workshop]));
  const warnings: string[] = [];

  for (const item of items) {
    const workshop = byId.get(item.workshopId);

    if (!workshop) {
      warnings.push(`"${item.title}": workshop offering no longer exists`);
      continue;
    }

    const remaining = Math.max(0, workshop.capacity - workshop.enrolledCount);
    if (remaining < item.quantity) {
      warnings.push(
        `"${item.title}": ${item.quantity} seat(s) invoiced but only ${remaining} remaining — ` +
          `the workshop will be oversold by ${item.quantity - remaining}`
      );
    }
  }

  return warnings;
}
