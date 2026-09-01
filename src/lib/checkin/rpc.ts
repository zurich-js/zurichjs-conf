/**
 * Typed wrappers over the door check-in Postgres functions.
 *
 * Each wrapper is one round trip and one commit: `door_resolve` returns the
 * whole panel, and `door_check_in` applies the conditional update and writes the
 * audit row together. That is why the door does not need a read-then-write pair
 * and why the audit trail costs no extra fsync.
 *
 * ERROR CONTRACT
 * Wrappers throw `DoorRpcError` with the PostgREST failure preserved on
 * `cause`. They deliberately do NOT log: every caller is an API route that
 * catches and calls `log.error`, and logging here too would report each failure
 * to PostHog twice under two different titles.
 *
 * TYPING BOUNDARY
 * The door_* functions are not in `database.generated.ts` yet, so the client is
 * created with `DoorDatabase` (see `./door-database`) — the generated schema
 * extended with the door functions' argument and payload contracts. That keeps
 * every `supabase.rpc('door_…', …)` call fully typed with no casts, and calling
 * the method ON the client (never detached) is what keeps supabase-js's `this`
 * binding intact.
 */

import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase';
import { DoorRpcError } from './errors';
import type { DoorBadgePickupRow, DoorDatabase, DoorRpcName } from './door-database';
import type {
  DoorBadgePickupResult,
  DoorCheckInResult,
  DoorGoodieResult,
  DoorOccasion,
  DoorResolveResult,
} from '@/lib/types/checkin';

function createDoorClient() {
  return createServiceRoleClient<DoorDatabase>();
}

/**
 * Turn a PostgREST response into the payload or a tagged throw.
 *
 * A SQL function returning jsonb always returns a row; a null payload means
 * something changed underneath us and is worth surfacing rather than silently
 * rendering an empty panel.
 */
function unwrap<T>(fn: DoorRpcName, response: PostgrestSingleResponse<T>): T {
  if (response.error) {
    throw new DoorRpcError(fn, response.error.message, {
      cause: response.error,
      code: response.error.code,
    });
  }

  if (response.data === null || response.data === undefined) {
    throw new DoorRpcError(fn, 'returned no payload');
  }

  return response.data;
}

/**
 * Resolve a scanned UUID to the whole door panel, across both id spaces.
 *
 * Returns `{ found: false }` for an unknown code rather than throwing, because
 * a stranger's QR is an expected event at a door, not an error.
 */
export async function doorResolve(scannedId: string): Promise<DoorResolveResult> {
  const supabase = createDoorClient();
  return unwrap('door_resolve', await supabase.rpc('door_resolve', { p_scanned_id: scannedId }));
}

export interface DoorCheckInArgs {
  scannedId: string;
  staffId: string;
  station?: string;
  /** ISO timestamp of when the scan actually happened, for queued offline writes. */
  occurredAt?: string;
  /** Admitting without a working QR. Requires a lead and a reason. */
  manual?: boolean;
  reason?: string;
  /**
   * The day the volunteer chose to work. Validated to the enum by the API; the
   * function falls back to the server clock when it is absent.
   */
  occasion?: DoorOccasion;
}

export async function doorCheckIn(args: DoorCheckInArgs): Promise<DoorCheckInResult> {
  const supabase = createDoorClient();
  return unwrap(
    'door_check_in',
    await supabase.rpc('door_check_in', {
      p_scanned_id: args.scannedId,
      p_staff_id: args.staffId,
      p_station: args.station ?? null,
      p_occurred_at: args.occurredAt ?? null,
      p_manual: args.manual ?? false,
      p_reason: args.reason ?? null,
      p_occasion: args.occasion ?? null,
    })
  );
}

export interface DoorCheckInUndoArgs {
  scannedId: string;
  staffId: string;
  station?: string;
  occurredAt?: string;
  reason?: string;
  occasion?: DoorOccasion;
}

/** Clear a mistaken check-in. `duplicate` means there was nothing to undo. */
export async function doorCheckInUndo(args: DoorCheckInUndoArgs): Promise<DoorCheckInResult> {
  const supabase = createDoorClient();
  return unwrap(
    'door_check_in_undo',
    await supabase.rpc('door_check_in_undo', {
      p_scanned_id: args.scannedId,
      p_staff_id: args.staffId,
      p_station: args.station ?? null,
      p_occurred_at: args.occurredAt ?? null,
      p_reason: args.reason ?? null,
      p_occasion: args.occasion ?? null,
    })
  );
}

export interface DoorGoodieArgs {
  ticketId: string;
  staffId: string;
  station?: string;
  occurredAt?: string;
  /** Set when only part of the entitlement was handed over. */
  note?: string;
  occasion?: DoorOccasion;
  /** Size actually handed over. Absent = that item was NOT handed. */
  tshirtSize?: string;
  hoodieSize?: string;
}

export async function doorGoodieHandover(args: DoorGoodieArgs): Promise<DoorGoodieResult> {
  const supabase = createDoorClient();
  return unwrap(
    'door_goodie_handover',
    await supabase.rpc('door_goodie_handover', {
      p_ticket_id: args.ticketId,
      p_staff_id: args.staffId,
      p_station: args.station ?? null,
      p_occurred_at: args.occurredAt ?? null,
      p_note: args.note ?? null,
      p_occasion: args.occasion ?? null,
      p_tshirt_size: args.tshirtSize ?? null,
      p_hoodie_size: args.hoodieSize ?? null,
    })
  );
}

export interface DoorBadgePickupArgs {
  scannedId: string;
  staffId: string;
  station?: string;
  occurredAt?: string;
  occasion?: DoorOccasion;
}

/** Record a badge handover — early pickup included. Never moves check-in state. */
export async function doorBadgePickup(
  args: DoorBadgePickupArgs
): Promise<DoorBadgePickupResult> {
  const supabase = createDoorClient();
  return unwrap(
    'door_badge_pickup',
    await supabase.rpc('door_badge_pickup', {
      p_scanned_id: args.scannedId,
      p_staff_id: args.staffId,
      p_station: args.station ?? null,
      p_occurred_at: args.occurredAt ?? null,
      p_occasion: args.occasion ?? null,
    })
  );
}

/** Every badge already picked up, for the roster prefetch. */
export async function doorBadgePickups(): Promise<DoorBadgePickupRow[]> {
  const supabase = createDoorClient();
  return unwrap('door_badge_pickups', await supabase.rpc('door_badge_pickups', {}));
}

/** Admin-only removal of audit rows (rehearsal and test data). */
export async function doorEventsDelete(ids: string[]): Promise<{ deleted: number }> {
  const supabase = createDoorClient();
  return unwrap('door_events_delete', await supabase.rpc('door_events_delete', { p_ids: ids }));
}

/**
 * Which occasion the SERVER considers active.
 *
 * Read from the database rather than computed here so the station, the API and
 * the audit trail cannot disagree — a device clock never decides which day an
 * action belongs to.
 */
export async function doorCurrentOccasion(): Promise<DoorOccasion> {
  const supabase = createDoorClient();
  const data = unwrap('door_current_occasion', await supabase.rpc('door_current_occasion', {}));

  // The function RETURNS TEXT; this is the runtime narrowing to the contract.
  if (data !== 'workshop_day' && data !== 'conference_day') {
    throw new DoorRpcError(
      'door_current_occasion',
      `returned an unknown occasion: ${String(data)}`
    );
  }

  return data;
}
