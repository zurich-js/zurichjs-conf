/**
 * Ticket pricing queries for TanStack Query
 * Supports multi-currency (CHF/EUR) pricing
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';
import type { SupportedCurrency } from '@/config/currency';
import type { TicketPlan } from '@/hooks/useTicketPricing';

/**
 * API response structure for ticket pricing
 */
export interface TicketPricingResponse {
  plans: TicketPlan[];
  currentStage: string;
  stageDisplayName?: string;
  error?: string;
}

/**
 * Fetch ticket pricing from the API
 * Works on both server and client side using type-safe API client
 * @param currency - Currency to fetch prices in (CHF or EUR)
 */
export async function fetchTicketPricing(
  currency: SupportedCurrency = 'CHF'
): Promise<TicketPricingResponse> {
  const data = await apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing(currency)
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Factory function to create query options for ticket pricing with a specific currency
 * Use this when you need currency-specific pricing queries
 * @param currency - Currency to fetch prices in (CHF or EUR)
 */
export const createTicketPricingQueryOptions = (currency: SupportedCurrency = 'CHF') =>
  queryOptions({
    queryKey: queryKeys.tickets.pricing(currency),
    queryFn: () => fetchTicketPricing(currency),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

/**
 * Default query options for ticket pricing (CHF)
 * @deprecated Use createTicketPricingQueryOptions(currency) for currency-aware queries
 */
export const ticketPricingQueryOptions = createTicketPricingQueryOptions('CHF');

