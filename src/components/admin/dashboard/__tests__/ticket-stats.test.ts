import { describe, it, expect } from 'vitest';
import { computeTicketStats, TICKET_STATUSES } from '../ticket-stats';
import type { Ticket } from '../types';

const ticket = (overrides: Partial<Ticket>): Ticket =>
  ({
    id: 'tkt_1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    ticket_type: 'standard',
    ticket_category: 'standard',
    ticket_stage: 'early_bird',
    amount_paid: 69900,
    currency: 'CHF',
    status: 'confirmed',
    ...overrides,
  }) as Ticket;

describe('computeTicketStats', () => {
  it('returns zeros for an empty list', () => {
    const stats = computeTicketStats([]);
    expect(stats.total).toBe(0);
    expect(stats.byStatus).toEqual({ confirmed: 0, pending: 0, cancelled: 0, refunded: 0 });
    expect(stats.unknownStatus).toBe(0);
    expect(stats.complimentaryTotal).toBe(0);
    expect(stats.complimentaryConfirmed).toBe(0);
  });

  it('splits tickets into the four payment_status buckets', () => {
    const stats = computeTicketStats([
      ticket({ id: 'a', status: 'confirmed' }),
      ticket({ id: 'b', status: 'confirmed' }),
      ticket({ id: 'c', status: 'pending' }),
      ticket({ id: 'd', status: 'cancelled' }),
      ticket({ id: 'e', status: 'refunded' }),
    ]);

    expect(stats.byStatus).toEqual({ confirmed: 2, pending: 1, cancelled: 1, refunded: 1 });
  });

  it('status buckets plus unknown always sum to the total', () => {
    const tickets = [
      ticket({ id: 'a', status: 'confirmed' }),
      ticket({ id: 'b', status: 'pending' }),
      ticket({ id: 'c', status: 'cancelled' }),
      ticket({ id: 'd', status: 'refunded' }),
      ticket({ id: 'e', status: 'something_new' }),
    ];
    const stats = computeTicketStats(tickets);

    const bucketed =
      TICKET_STATUSES.reduce((sum, status) => sum + stats.byStatus[status], 0) +
      stats.unknownStatus;

    expect(bucketed).toBe(stats.total);
    expect(stats.total).toBe(5);
    expect(stats.unknownStatus).toBe(1);
  });

  it('normalises casing and whitespace so rows never fall out of the breakdown', () => {
    const stats = computeTicketStats([
      ticket({ id: 'a', status: 'Confirmed' }),
      ticket({ id: 'b', status: ' cancelled ' }),
      ticket({ id: 'c', status: 'REFUNDED' }),
    ]);

    expect(stats.byStatus.confirmed).toBe(1);
    expect(stats.byStatus.cancelled).toBe(1);
    expect(stats.byStatus.refunded).toBe(1);
    expect(stats.unknownStatus).toBe(0);
  });

  it('counts complimentary as a subset that overlaps the status buckets', () => {
    const stats = computeTicketStats([
      // Confirmed comp, flagged in metadata despite a non-zero amount
      ticket({ id: 'a', status: 'confirmed', amount_paid: 69900, metadata: { paymentType: 'complimentary' } }),
      // Confirmed comp via a zero amount (100%-discount checkout)
      ticket({ id: 'b', status: 'confirmed', amount_paid: 0 }),
      // Comp that was later cancelled — no longer occupies a seat
      ticket({ id: 'c', status: 'cancelled', amount_paid: 0 }),
      // Ordinary paid ticket
      ticket({ id: 'd', status: 'confirmed', amount_paid: 69900 }),
    ]);

    expect(stats.total).toBe(4);
    expect(stats.byStatus.confirmed).toBe(3);
    expect(stats.byStatus.cancelled).toBe(1);
    // The overlap: 3 comps in total, only 2 of them still valid
    expect(stats.complimentaryTotal).toBe(3);
    expect(stats.complimentaryConfirmed).toBe(2);
  });

  it('does not count a paid, cancelled ticket as complimentary', () => {
    const stats = computeTicketStats([
      ticket({ id: 'a', status: 'cancelled', amount_paid: 69900 }),
    ]);

    expect(stats.complimentaryTotal).toBe(0);
    expect(stats.byStatus.cancelled).toBe(1);
  });
});
