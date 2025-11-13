/**
 * Hook to fetch workshop vouchers from Stripe API using TanStack Query
 */

import { useQuery } from '@tanstack/react-query';
import { workshopVouchersQueryOptions, type WorkshopVoucher } from '@/lib/queries/workshops';

/**
 * Hook state
 */
interface UseWorkshopVouchersResult {
  vouchers: WorkshopVoucher[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch workshop vouchers from the API using TanStack Query
 * Provides automatic caching, refetching, and background updates
 *
 * Returns empty vouchers ONLY during loading.
 * After loading completes, if there's an error or no data, error will be set.
 *
 * @example
 * const { vouchers, isLoading, error } = useWorkshopVouchers();
 */
export const useWorkshopVouchers = (): UseWorkshopVouchersResult => {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery(workshopVouchersQueryOptions);

  // Determine error state
  let errorMessage: string | null = null;
  if (queryError) {
    errorMessage = queryError.message;
  } else if (!isLoading && (!data?.vouchers || data.vouchers.length === 0)) {
    errorMessage = 'No workshop vouchers available';
  }

  return {
    vouchers: data?.vouchers ?? [],
    isLoading,
    error: errorMessage,
    refetch: () => {
      refetch();
    },
  };
};
