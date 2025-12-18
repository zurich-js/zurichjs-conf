/**
 * Hook to fetch ticket pricing from Stripe API using TanStack Query
 * Automatically uses the detected currency from CurrencyContext
 */

import { useQuery } from '@tanstack/react-query';
import { createTicketPricingQueryOptions } from '@/lib/queries/tickets';
import { useCurrency } from '@/contexts/CurrencyContext';

/**
 * Price stage types
 */
type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird';

/**
 * Stock availability info
 */
export interface StockInfo {
  remaining: number | null;
  total: number | null;
  soldOut: boolean;
}

/**
 * Ticket plan from API
 */
export interface TicketPlan {
  id: string;
  title: string;
  price: number;
  comparePrice?: number;
  currency: string;
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
  stock: StockInfo;
}

/**
 * Hook state
 */
interface UseTicketPricingResult {
  plans: TicketPlan[];
  currentStage: PriceStage | null;
  stageDisplayName: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch ticket pricing from the API using TanStack Query
 * Provides automatic caching, refetching, and background updates
 *
 * Automatically uses the currency from CurrencyContext (detected server-side via geo-location).
 * Returns empty plans/stage ONLY during loading.
 * After loading completes, if there's an error or no data, error will be set.
 *
 * @example
 * const { plans, currentStage, isLoading, error } = useTicketPricing();
 */
export const useTicketPricing = (): UseTicketPricingResult => {
  // Get currency from context (detected server-side and passed via props)
  const { currency } = useCurrency();

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery(createTicketPricingQueryOptions(currency));

  // Determine error state
  let errorMessage: string | null = null;
  if (queryError) {
    errorMessage = queryError.message;
  } else if (!isLoading && (!data?.plans || data.plans.length === 0)) {
    errorMessage = 'No ticket plans available';
  } else if (!isLoading && !data?.currentStage) {
    errorMessage = 'Current price stage not available';
  }

  return {
    plans: data?.plans ?? [],
    currentStage: data?.currentStage as PriceStage | null ?? null,
    stageDisplayName: data?.stageDisplayName ?? null,
    isLoading,
    error: errorMessage,
    refetch: () => {
      refetch();
    },
  };
};

