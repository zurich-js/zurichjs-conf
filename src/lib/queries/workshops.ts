/**
 * Workshop vouchers queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';

/**
 * Workshop voucher structure
 */
export interface WorkshopVoucher {
  id: string;
  amount: number;
  currency: string;
  priceId: string;
}

/**
 * API response structure for workshop vouchers
 */
export interface WorkshopVouchersResponse {
  vouchers: WorkshopVoucher[];
  error?: string;
}

/**
 * Fetch workshop vouchers from the API
 * Works on both server and client side using type-safe API client
 */
export async function fetchWorkshopVouchers(): Promise<WorkshopVouchersResponse> {
  const data = await apiClient.get<WorkshopVouchersResponse>(
    endpoints.workshops.vouchers()
  );

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Query options for workshop vouchers
 * Use this with useQuery or prefetchQuery
 */
export const workshopVouchersQueryOptions = queryOptions({
  queryKey: queryKeys.workshops.vouchers(),
  queryFn: fetchWorkshopVouchers,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
