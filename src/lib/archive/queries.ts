/**
 * TanStack Query options for the frozen 2026 data.
 *
 * These live apart from `@/lib/queries/*` on purpose. Those modules still serve
 * the live, API-backed site (admin tooling, the workshop purchase panel) and
 * keep working until those surfaces are removed; the archive pages read from
 * here instead, so neither side has to compromise for the other.
 */

import { queryOptions } from '@tanstack/react-query';

import { ARCHIVE_JSON } from '@/lib/archive/urls';
import type { FrozenWorkshops } from '@/lib/archive/frozen';

export async function fetchArchivedWorkshops(): Promise<FrozenWorkshops> {
  if (typeof window === 'undefined') {
    const { getFrozenWorkshops } = await import('@/lib/archive/frozen');
    return getFrozenWorkshops();
  }
  return (await (await fetch(ARCHIVE_JSON.workshops)).json()) as FrozenWorkshops;
}

/**
 * The 2026 workshop timeline. `offeringsBySubmissionId` is always empty —
 * Stripe pricing and booking went with the API routes, so nothing is on sale.
 * The snapshot cannot change for the life of the deployment, so it is never
 * stale and never refetched.
 */
export const archivedWorkshopsQueryOptions = queryOptions({
  queryKey: ['archive', 'workshops'] as const,
  queryFn: fetchArchivedWorkshops,
  staleTime: Infinity,
  gcTime: Infinity,
});
