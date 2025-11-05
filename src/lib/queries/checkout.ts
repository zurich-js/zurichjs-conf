/**
 * Checkout session queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';

/**
 * Checkout session details returned from Stripe
 */
export interface CheckoutSessionDetails {
  customer_email?: string;
  customer_name?: string;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  session_id?: string;
  error?: string;
}

/**
 * Fetch checkout session details from the API
 * Works on both server and client side using type-safe API client
 */
export async function fetchCheckoutSession(sessionId: string): Promise<CheckoutSessionDetails> {
  const data = await apiClient.get<CheckoutSessionDetails>(
    endpoints.checkout.session(sessionId)
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Query options for checkout session
 * Use this with useQuery
 */
export function checkoutSessionQueryOptions(sessionId: string) {
  return queryOptions({
    queryKey: queryKeys.checkout.session(sessionId),
    queryFn: () => fetchCheckoutSession(sessionId),
    enabled: !!sessionId, // Only run query if sessionId is provided
    staleTime: Infinity, // Session data doesn't change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 2, // Retry failed requests twice
  });
}
