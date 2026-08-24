/**
 * Admin Apparel API Client
 * Fetch functions for ticket holder apparel preferences
 */

import type { TicketApparel } from '@/lib/types/ticket-apparel';
import type { ApparelSize } from '@/lib/types/ticket-constants';
import { adminFetch, AdminApiError } from './api-fetch';

/**
 * Fetch a ticket holder's apparel preferences.
 */
export async function fetchTicketApparel(ticketId: string): Promise<TicketApparel> {
  return adminFetch<TicketApparel>(`/api/admin/tickets/${ticketId}/apparel`);
}

/**
 * Update a ticket holder's t-shirt size.
 */
export async function updateTicketTshirtSize(
  ticketId: string,
  tshirtSize: ApparelSize | null
): Promise<TicketApparel> {
  return adminFetch<TicketApparel>(`/api/admin/tickets/${ticketId}/apparel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tshirtSize }),
  });
}

export { AdminApiError };
