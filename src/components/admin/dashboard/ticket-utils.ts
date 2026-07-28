/**
 * Pure helpers for admin ticket data.
 */

import type { Ticket } from './types';

/**
 * A ticket counts as complimentary when it was manually issued as a comp
 * (metadata.paymentType) or nothing was paid for it — amount_paid of 0 also
 * covers 100%-discount checkouts and VIP comps that lack the metadata flag.
 */
export function isComplimentaryTicket(ticket: Pick<Ticket, 'amount_paid' | 'metadata'>): boolean {
  return ticket.metadata?.paymentType === 'complimentary' || ticket.amount_paid === 0;
}
