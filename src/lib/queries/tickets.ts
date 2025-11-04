/**
 * Ticket pricing queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';
import type { TicketPlan } from '@/hooks/useTicketPricing';

/**
 * API response structure for ticket pricing
 */
export interface TicketPricingResponse {
  plans: TicketPlan[];
  currentStage: string;
  error?: string;
}

/**
 * Fetch ticket pricing from the API
 * Works on both server and client side using type-safe API client
 */
export async function fetchTicketPricing(): Promise<TicketPricingResponse> {
  const data = await apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing()
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Query options for ticket pricing
 * Use this with useQuery or prefetchQuery
 */
export const ticketPricingQueryOptions = queryOptions({
  queryKey: queryKeys.tickets.pricing(),
  queryFn: fetchTicketPricing,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});

