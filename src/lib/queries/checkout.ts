/**
 * Checkout session queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, ApiError, endpoints } from '@/lib/api';

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
  purchase_type?: 'ticket' | 'workshop' | 'mixed';
  line_items?: Array<{
    description: string;
    quantity: number;
    amount: number;
    type: 'ticket' | 'workshop' | 'other';
  }>;
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
    enabled: !!sessionId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    // Don't retry payment failures (4xx) — only retry server errors (5xx)
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.statusCode < 500) return false;
      return failureCount < 2;
    },
  });
}
