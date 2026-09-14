/**
 * Workshop queries for TanStack Query.
 *
 * Archive build: the 2026 workshop timeline is frozen program history. Stripe
 * pricing and booking state are gone with the API routes, so `offerings` is
 * always empty and nothing is purchasable.
 */

import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { ARCHIVE_JSON } from '@/lib/archive/urls';
import type { FrozenWorkshops } from '@/lib/archive/frozen';

export type WorkshopsScheduleResponse = FrozenWorkshops;

export async function fetchWorkshopsSchedule(): Promise<WorkshopsScheduleResponse> {
  if (typeof window === 'undefined') {
    const { getFrozenWorkshops } = await import('@/lib/archive/frozen');
    return getFrozenWorkshops();
  }
  return (await (await fetch(ARCHIVE_JSON.workshops)).json()) as WorkshopsScheduleResponse;
}

export const createWorkshopsScheduleQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.workshops.schedule(),
    queryFn: fetchWorkshopsSchedule,
    staleTime: Infinity,
    gcTime: Infinity,
  });
