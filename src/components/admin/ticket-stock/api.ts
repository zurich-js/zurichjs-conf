/**
 * Ticket Stock Admin API
 * Client-side API functions for the ticket stock limits
 */

import { adminFetch } from '@/lib/admin/api-fetch';
import { adminKeys } from '@/lib/admin/query-keys';
import type { TicketStockConfigResponse, TicketStockConfigUpdateInput } from './types';

export const ticketStockQueryKeys = {
  config: adminKeys.ticketStockConfig,
};

export function fetchTicketStockConfigApi(signal?: AbortSignal): Promise<TicketStockConfigResponse> {
  return adminFetch<TicketStockConfigResponse>('/api/admin/tickets/stock-config', { signal });
}

export function updateTicketStockConfigApi(
  data: TicketStockConfigUpdateInput
): Promise<TicketStockConfigResponse> {
  return adminFetch<TicketStockConfigResponse>('/api/admin/tickets/stock-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
