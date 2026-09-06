/**
 * Ticket count aggregation for the admin dashboard.
 *
 * The header used to show `total`, `confirmed`, `cancelled` and
 * `complimentary` side by side, which cannot reconcile:
 *
 * - `pending` and `refunded` tickets exist (the `payment_status` enum is
 *   pending | confirmed | cancelled | refunded) but had no badge, so
 *   confirmed + cancelled fell short of the total.
 * - `complimentary` is not a status at all — it is how a ticket was paid for,
 *   so it overlaps the status buckets and pushed the apparent sum past the
 *   total.
 *
 * This module splits the two dimensions: `byStatus` is mutually exclusive and
 * sums exactly to `total`, while the complimentary counts are explicitly
 * subsets that overlap it.
 */

import type { Ticket } from './types';
import { isComplimentaryTicket } from './ticket-utils';

/** Values of the `payment_status` enum, in the order they're displayed. */
export const TICKET_STATUSES = ['confirmed', 'pending', 'cancelled', 'refunded'] as const;

export type KnownTicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketStats {
  /** Every ticket row returned by the API */
  total: number;
  /**
   * Mutually exclusive status buckets. `byStatus` totals plus `unknownStatus`
   * always equal `total`.
   */
  byStatus: Record<KnownTicketStatus, number>;
  /**
   * Rows carrying a status outside the enum. Normally 0; counted separately so
   * a schema change can never make the breakdown silently under-report.
   */
  unknownStatus: number;
  /** Complimentary tickets that are confirmed — the ones that occupy a real seat */
  complimentaryConfirmed: number;
  /** Complimentary tickets in any status (what the "Complimentary Only" filter shows) */
  complimentaryTotal: number;
}

const isKnownStatus = (status: string): status is KnownTicketStatus =>
  (TICKET_STATUSES as readonly string[]).includes(status);

/**
 * Aggregate ticket rows into counts that reconcile.
 *
 * Statuses are compared case-insensitively and trimmed: the enum is lowercase,
 * but a hand-issued or imported row must not silently fall out of the
 * breakdown because of stray whitespace or casing.
 */
export function computeTicketStats(tickets: Ticket[]): TicketStats {
  const stats: TicketStats = {
    total: tickets.length,
    byStatus: { confirmed: 0, pending: 0, cancelled: 0, refunded: 0 },
    unknownStatus: 0,
    complimentaryConfirmed: 0,
    complimentaryTotal: 0,
  };

  for (const ticket of tickets) {
    const status = (ticket.status ?? '').trim().toLowerCase();

    if (isKnownStatus(status)) {
      stats.byStatus[status]++;
    } else {
      stats.unknownStatus++;
    }

    if (isComplimentaryTicket(ticket)) {
      stats.complimentaryTotal++;
      if (status === 'confirmed') {
        stats.complimentaryConfirmed++;
      }
    }
  }

  return stats;
}
