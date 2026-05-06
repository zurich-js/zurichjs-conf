/**
 * Workshop queries for TanStack Query
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { apiClient, endpoints } from '@/lib/api';
import type { SupportedCurrency } from '@/config/currency';
import type {
  WorkshopPricingItem,
  WorkshopPricingResponse,
} from '@/pages/api/workshops/pricing';
import type { WorkshopsScheduleResponse } from '@/pages/api/workshops/schedule';

export type { WorkshopPricingItem, WorkshopPricingResponse, WorkshopsScheduleResponse };

/**
 * Fetch workshop offering pricing (per-workshop Stripe prices scoped to a currency).
 */
export interface WorkshopPricingQueryParams {
  currency?: SupportedCurrency;
  /** Legacy: filters by Stripe lookup-key slug. New callers should prefer sessionSlug or cfpSubmissionId. */
  slug?: string;
  /** Title-derived slug used by /workshops/[slug] URLs. */
  sessionSlug?: string;
  /** CFP submission id — exact match, fastest path. */
  cfpSubmissionId?: string;
  /** Program session id — preferred match for post-CFP workshop offerings. */
  sessionId?: string;
}

export async function fetchWorkshopPricing(
  params: WorkshopPricingQueryParams = {}
): Promise<WorkshopPricingResponse> {
  const data = await apiClient.get<WorkshopPricingResponse>(
    endpoints.workshops.pricing(params),
    { skipErrorCapture: true }
  );
  if (data.error) throw new Error(data.error);
  return data;
}

export const createWorkshopPricingQueryOptions = (params: WorkshopPricingQueryParams = {}) =>
  queryOptions({
    queryKey: queryKeys.workshops.pricing(params),
    queryFn: () => fetchWorkshopPricing(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof DOMException && error.name === 'TimeoutError') return false;
      return failureCount < 2;
    },
  });

/**
 * Combined workshops schedule + offerings fetch — single query used by /workshops
 * to hydrate the entire page in one round trip.
 */
export async function fetchWorkshopsSchedule(
  currency?: SupportedCurrency
): Promise<WorkshopsScheduleResponse> {
  const data = await apiClient.get<WorkshopsScheduleResponse>(
    endpoints.workshops.schedule(currency),
    { skipErrorCapture: true }
  );
  if (data.error) throw new Error(data.error);
  return data;
}

export const createWorkshopsScheduleQueryOptions = (currency?: SupportedCurrency) =>
  queryOptions({
    queryKey: queryKeys.workshops.schedule(currency),
    queryFn: () => fetchWorkshopsSchedule(currency),
    // Short staleTime so admin publish/edit flows show up on /workshops within
    // ~30s without relying on manual invalidation from admin mutations.
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof DOMException && error.name === 'TimeoutError') return false;
      return failureCount < 2;
    },
  });
