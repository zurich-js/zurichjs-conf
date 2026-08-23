/**
 * The polled live dashboard.
 *
 * WHY POLLING, AND HOW IT IS KEPT CHEAP
 * Sockets were ruled out: there is no Supabase Realtime anywhere in this repo,
 * so it would be entirely new surface for one screen. Polling is the right call
 * here — but only if each tick is cheap, which is why it hits a dedicated
 * aggregate endpoint returning a fixed sub-2KB object rather than anything that
 * touches the roster.
 *
 * Three deliberate choices keep the cost honest:
 *
 *  1. 30s default, not 10s. At 10s one viewer issues 720 requests over a
 *     two-hour door; at 30s it is 240. A door queue does not change meaningfully
 *     inside 30 seconds, and the 5-minute throughput figure is what a lead
 *     actually reads.
 *  2. refetchIntervalInBackground stays false (the default), so a dashboard left
 *     open on a laptop that has been put to sleep stops polling entirely.
 *  3. Nothing here invalidates any key. invalidateQueries marks a key stale AND
 *     refetches active observers immediately -- staleTime does not suppress that
 *     -- so a poll wired to invalidation would refetch the whole attendee roster
 *     on every tick.
 */

import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api-fetch';
import { checkinKeys } from '@/lib/checkin/query-keys';
import type { DoorDashboard } from '@/lib/checkin/dashboard';
import type { DoorOccasion } from '@/lib/types/checkin';

/** Default poll interval. See the note above before lowering this. */
export const DOOR_DASHBOARD_POLL_MS = 30_000;

/** Faster tick for the minutes right around doors opening. */
export const DOOR_DASHBOARD_BUSY_POLL_MS = 15_000;

export interface UseDoorDashboardOptions {
  /** Omit to let the server decide which day it is. */
  occasion?: DoorOccasion;
  /** Pass DOOR_DASHBOARD_BUSY_POLL_MS during the rush, or 0 to stop polling. */
  pollMs?: number;
  enabled?: boolean;
}

export function useDoorDashboard({
  occasion,
  pollMs = DOOR_DASHBOARD_POLL_MS,
  enabled = true,
}: UseDoorDashboardOptions = {}) {
  const query = occasion ? `?occasion=${occasion}` : '';

  return useQuery({
    queryKey: checkinKeys.dashboard(occasion ?? null),
    queryFn: ({ signal }) =>
      adminFetch<DoorDashboard>(`/api/admin/checkin/dashboard${query}`, { signal }),
    enabled,
    // 0 disables polling, which is what the UI passes when a lead pauses it.
    refetchInterval: pollMs > 0 ? pollMs : false,
    // Every tick is a fresh read; caching a poll response would defeat the point.
    staleTime: 0,
    // A stalled door must not look like a moving one, so keep the last figures
    // visible rather than flashing a spinner on every tick.
    placeholderData: (previous) => previous,
  });
}
