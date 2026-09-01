/**
 * The once-per-shift prefetch, and the in-memory index built from it.
 *
 * This is the request that makes every scan free. The station pulls the roster
 * when the volunteer starts their shift, builds an index from it, and then
 * resolves every subsequent scan out of a Map with no network at all. The flow
 * it replaces costs three round trips per attendee.
 *
 * WHY THIS WAITS FOR THE SESSION
 * The roster is keyed on the occasion, which comes from `useDoorSession`, so it
 * cannot start until the session lands. That costs one round trip once per
 * shift — irrelevant next to a two-hour door — and buys two things worth more:
 *
 *  1. A correct cache key across the midnight boundary between workshop day and
 *     conference day. A bare key would serve yesterday's roster.
 *  2. A revoked volunteer never pulls 300 attendees' details onto their personal
 *     phone. The gate resolves first, so the large payload is only ever fetched
 *     by someone the server has just confirmed.
 *
 * The parallelism that matters at a door is per-scan, and per-scan there is no
 * network to parallelise.
 *
 * WHY IT REFRESHES AT ALL
 * Walk-ins buy tickets during the door. A roster frozen at shift start makes a
 * late purchaser "not found", which sends them to the problem desk for no
 * reason. A five-minute background refresh costs a handful of requests per
 * station per hour, and `refetchIntervalInBackground` stays false so a phone in
 * a pocket stops polling entirely.
 */

import { useMemo } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { doorFetch } from '@/lib/checkin/api-fetch';
import { checkinKeys } from '@/lib/checkin/query-keys';
import { buildRosterIndex, type DoorRosterIndex } from '@/lib/checkin/roster-index';
import type { DoorRoster } from '@/lib/checkin/roster';
import type { DoorOccasion } from '@/lib/types/checkin';

/** How often a station picks up walk-in purchases. See the note above. */
export const DOOR_ROSTER_REFRESH_MS = 5 * 60 * 1000;

export interface UseDoorRosterOptions {
  /** From `useDoorSession`. The query stays idle until it is known. */
  occasion: DoorOccasion | undefined;
  enabled?: boolean;
}

export function useDoorRoster({ occasion, enabled = true }: UseDoorRosterOptions) {
  return useQuery({
    // The non-null assertion is safe: `enabled` gates the fetch on the same value.
    queryKey: checkinKeys.roster({ occasion: occasion as DoorOccasion }),
    // The occasion rides along so a volunteer working the OTHER day (early
    // badge pickup, a rehearsal) gets a roster whose checked-in flags belong to
    // the day they chose rather than to the server's idea of today.
    queryFn: ({ signal }) =>
      doorFetch<DoorRoster>(
        `/api/checkin/roster?occasion=${encodeURIComponent(occasion ?? '')}`,
        { signal }
      ),
    enabled: enabled && occasion !== undefined,
    // Deliberately long: the station is expected to hold this, and a refetch
    // triggered per scan would undo the entire point of prefetching.
    staleTime: DOOR_ROSTER_REFRESH_MS,
    gcTime: 60 * 60 * 1000,
    refetchInterval: DOOR_ROSTER_REFRESH_MS,
    refetchOnReconnect: true,
    // Never blank the station while a refresh is in flight. A volunteer with an
    // attendee in front of them must keep the roster they already had.
    placeholderData: (previous) => previous,
  });
}

export interface UseDoorRosterIndexResult {
  /** Null until the first roster lands. */
  index: DoorRosterIndex | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Server time the held roster was built, so the station can show staleness. */
  generatedAt: string | null;
  refetch: () => void;
}

/**
 * The roster, plus the index built from it.
 *
 * Memoised on the roster object, so a background refresh rebuilds the index once
 * and a re-render does not. Building it for 300 attendees is a few milliseconds;
 * doing it per keystroke at the lookup desk would not be.
 */
export function useDoorRosterIndex(options: UseDoorRosterOptions): UseDoorRosterIndexResult {
  const query = useDoorRoster(options);
  const roster = query.data;

  const index = useMemo(() => (roster ? buildRosterIndex(roster) : null), [roster]);

  return {
    index,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    generatedAt: roster?.generatedAt ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing results back into the cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WHY THESE EXIST INSTEAD OF invalidateQueries
 *
 * `invalidateQueries` marks a key stale AND refetches every active observer
 * immediately; `staleTime` does not suppress that. Invalidating the roster after
 * each check-in would refetch the whole attendee list up to 300 times a shift,
 * per station. So a completed write is folded into the cached roster instead,
 * and nothing is invalidated.
 *
 * The result is that a re-scan of someone already admitted shows "checked in at
 * 09:14" from memory — which is the answer that stops a volunteer admitting the
 * same person twice, and it arrives with no network involved.
 */
function patchRoster(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  update: (roster: DoorRoster) => DoorRoster
): void {
  queryClient.setQueryData<DoorRoster>(checkinKeys.roster({ occasion }), (current) =>
    current ? update(current) : current
  );
}

/** Record an admission locally. `subjectId` may be a ticket id or a seat id. */
export function patchRosterCheckIn(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  subjectId: string,
  checkedInAt: string
): void {
  patchRoster(queryClient, occasion, (roster) => ({
    ...roster,
    tickets: roster.tickets.map((ticket) =>
      ticket.id === subjectId
        ? {
            ...ticket,
            // Only the column for the current occasion moves. The other day's
            // timestamp is untouched, which is what makes a person who attends
            // both days check in twice rather than once.
            ...(occasion === 'workshop_day'
              ? { checkedInWorkshopDayAt: checkedInAt }
              : { checkedInConferenceDayAt: checkedInAt }),
          }
        : ticket
    ),
    registrations: roster.registrations.map((seat) =>
      seat.id === subjectId ? { ...seat, checkedInAt } : seat
    ),
  }));
}

/** Record a goodie handover locally. Always keyed on a ticket. */
export function patchRosterGoodie(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  ticketId: string,
  handedAt: string,
  note?: string | null
): void {
  patchRoster(queryClient, occasion, (roster) => ({
    ...roster,
    tickets: roster.tickets.map((ticket) =>
      ticket.id === ticketId
        ? { ...ticket, goodieHandedAt: handedAt, goodieNote: note ?? ticket.goodieNote }
        : ticket
    ),
  }));
}

/**
 * Undo a local patch.
 *
 * Needed because the station acknowledges a write before the server has seen it.
 * If the flush comes back `denied` — a refunded ticket, a deactivated volunteer
 * — the optimistic timestamp has to come back off, or the station will refuse to
 * re-attempt an admission that never happened.
 */
export function revertRosterCheckIn(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  subjectId: string
): void {
  patchRoster(queryClient, occasion, (roster) => ({
    ...roster,
    tickets: roster.tickets.map((ticket) =>
      ticket.id === subjectId
        ? {
            ...ticket,
            ...(occasion === 'workshop_day'
              ? { checkedInWorkshopDayAt: null }
              : { checkedInConferenceDayAt: null }),
          }
        : ticket
    ),
    registrations: roster.registrations.map((seat) =>
      seat.id === subjectId ? { ...seat, checkedInAt: null } : seat
    ),
  }));
}

export function revertRosterGoodie(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  ticketId: string
): void {
  patchRoster(queryClient, occasion, (roster) => ({
    ...roster,
    tickets: roster.tickets.map((ticket) =>
      ticket.id === ticketId ? { ...ticket, goodieHandedAt: null } : ticket
    ),
  }));
}

/** Record an undo locally: the arrival comes back off, for this occasion only. */
export function patchRosterUndo(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  subjectId: string
): void {
  // Identical to reverting an optimistic check-in — the undo IS that revert,
  // just user-initiated rather than server-refused.
  revertRosterCheckIn(queryClient, occasion, subjectId);
}

/** Record a badge handover locally. `subjectId` may be a ticket or a seat id. */
export function patchRosterBadgePickup(
  queryClient: QueryClient,
  occasion: DoorOccasion,
  subjectId: string,
  pickedUpAt: string | null
): void {
  patchRoster(queryClient, occasion, (roster) => ({
    ...roster,
    tickets: roster.tickets.map((ticket) =>
      ticket.id === subjectId ? { ...ticket, badgePickedUpAt: pickedUpAt } : ticket
    ),
    registrations: roster.registrations.map((seat) =>
      seat.id === subjectId ? { ...seat, badgePickedUpAt: pickedUpAt } : seat
    ),
  }));
}
