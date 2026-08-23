/**
 * Ticket Apparel Types
 * Centralized contract for ticket holder apparel preferences (admin dashboard)
 */

/**
 * Apparel preferences for a ticket holder.
 * Used by both the admin API response and client hooks.
 */
export interface TicketApparel {
  tshirtSize: string | null;
  hoodieSize: string | null;
}
