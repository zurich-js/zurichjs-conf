/**
 * Query key factory for the door check-in station.
 *
 * All door server-state lives under the `['checkin']` root, following the
 * convention documented in `src/lib/admin/query-keys.ts`: keys are
 * hierarchical, and every input that changes the server response belongs in
 * the key.
 *
 * The station's shape matters here. It prefetches four INDEPENDENT queries once
 * per shift and then resolves every scan from memory, so the read path makes no
 * network request at all. Separate keys are what make that work: they fire
 * concurrently, and a workshop upsell can invalidate seats without discarding
 * the roster.
 *
 * INVALIDATION RULE: after a check-in, write the changed attendee into the
 * cache and invalidate nothing. `invalidateQueries` marks a key stale AND
 * refetches active observers immediately — `staleTime` does not suppress that —
 * so invalidating the roster per scan would refetch it up to 300 times a shift
 * and undo the point of prefetching. Where an invalidation is genuinely needed,
 * pass `refetchType: 'none'`.
 */

import type { DoorOccasion } from '@/lib/types/checkin';

export interface DoorRosterParams {
  /** The roster differs per occasion: workshop day includes seat-only attendees. */
  occasion: DoorOccasion;
}

export interface DoorEventListParams {
  /** Empty string = every occasion */
  occasion: DoorOccasion | '';
  /** Empty string = every event type */
  eventType: string;
  /** Restrict to one attendee's timeline */
  subjectId: string | null;
  /** Restrict to one volunteer's actions */
  staffId: string | null;
}

export const checkinKeys = {
  all: ['checkin'] as const,

  /** Who am I, my role, and the occasion the server thinks is active. Gates the UI. */
  session: () => [...checkinKeys.all, 'session'] as const,

  /** Attendees plus apparel, narrow projection. The large one; ~40 KB gzipped. */
  roster: (params: DoorRosterParams) => [...checkinKeys.all, 'roster', params] as const,

  /** Workshop seats across both id spaces. Invalidated when a seat is sold. */
  registrations: (params: DoorRosterParams) =>
    [...checkinKeys.all, 'registrations', params] as const,

  /** Workshop catalogue: title, room, times. Rarely changes, so a long staleTime. */
  workshops: () => [...checkinKeys.all, 'workshops'] as const,

  /** One attendee, refetched only when the station needs to confirm a write. */
  attendee: (subjectId: string) => [...checkinKeys.all, 'attendee', subjectId] as const,

  /** Staff management, in the admin panel rather than at the door. */
  staff: () => [...checkinKeys.all, 'staff'] as const,
  staffList: () => [...checkinKeys.staff(), 'list'] as const,
  staffActivity: (staffId: string) => [...checkinKeys.staff(), 'activity', staffId] as const,

  /** The audit trail, filtered. Every filter belongs in the key. */
  events: () => [...checkinKeys.all, 'events'] as const,
  eventList: (params: DoorEventListParams) => [...checkinKeys.events(), 'list', params] as const,
} as const;
