/**
 * Hook to fetch ticket pricing from Stripe API using TanStack Query
 */

import { useQuery } from '@tanstack/react-query';
import { ticketPricingQueryOptions } from '@/lib/queries/tickets';

/**
 * Price stage types
 */
type PriceStage = 'blind_bird' | 'early_bird' | 'standard' | 'late_bird';

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
}

/**
 * Hook state
 */
interface UseTicketPricingResult {
  plans: TicketPlan[];
  currentStage: PriceStage | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch ticket pricing from the API using TanStack Query
 * Provides automatic caching, refetching, and background updates
 * 
 * Returns empty plans/stage ONLY during loading.
 * After loading completes, if there's an error or no data, error will be set.
 * 
 * @example
 * const { plans, currentStage, isLoading, error } = useTicketPricing();
 */
export const useTicketPricing = (): UseTicketPricingResult => {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery(ticketPricingQueryOptions);

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
    isLoading,
    error: errorMessage,
    refetch: () => {
      refetch();
    },
  };
};

