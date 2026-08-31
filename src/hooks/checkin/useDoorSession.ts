/**
 * Who am I at the door, and which day is it.
 *
 * This is the first request a station makes and the smallest. It resolves the
 * volunteer's role so the UI can render the controls they actually have —
 * showing a scanner a "manual admit" button that the database will refuse is how
 * a queue stops — and it returns the occasion the SERVER thinks is active, read
 * from `door_current_occasion()` rather than the phone's clock.
 *
 * The occasion coming from the server is not pedantry. A station left open
 * across midnight, or a phone with the wrong date, would otherwise write the
 * wrong day into an append-only audit table.
 */

import { useQuery } from '@tanstack/react-query';
import { doorFetch } from '@/lib/checkin/api-fetch';
import { checkinKeys } from '@/lib/checkin/query-keys';
import type { DoorSession } from '@/lib/types/checkin';

/**
 * A role change or a deactivation must reach a station that is already open, so
 * this is short-lived — unlike the roster. It is a few hundred bytes.
 */
const SESSION_STALE_MS = 60_000;

export function useDoorSession(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: checkinKeys.session(),
    queryFn: ({ signal }) => doorFetch<DoorSession>('/api/checkin/session', { signal }),
    enabled: options.enabled ?? true,
    staleTime: SESSION_STALE_MS,
    // A phone that comes back from a dead spot should re-check whether the
    // volunteer is still authorised before it is trusted to admit anyone.
    refetchOnReconnect: true,
    // The default policy already skips retrying a 401, so a revoked volunteer
    // gets one clear answer instead of a spinner.
  });
}
