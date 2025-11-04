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

  return {
    plans: data?.plans ?? [],
    currentStage: data?.currentStage as PriceStage | null ?? null,
    isLoading,
    error: queryError ? queryError.message : null,
    refetch: () => {
      refetch();
    },
  };
};

