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
 * The door_* functions are not in `database.generated.ts` yet — they arrive with
 * the next `pnpm regen-db-types` after 20260823000001 is applied. This module is
 * the single place the call is untyped, and it is deliberately the only one: the
 * payload contracts in `@/lib/types/checkin` are hand-written because the
 * functions return `jsonb`, so they would not be covered by the generated types
 * even after a regen.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase';
import { DoorRpcError } from './errors';
import type {
  DoorCheckInResult,
  DoorGoodieResult,
  DoorOccasion,
  DoorResolveResult,
} from '@/lib/types/checkin';

type DoorRpcName =
  | 'door_resolve'
  | 'door_check_in'
  | 'door_goodie_handover'
  | 'door_current_occasion';

interface RpcResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Invoke a door function.
 *
 * TODO(types): drop the cast once door_* appears in
 * Database['public']['Functions'] after a regen. Nothing else needs to change —
 * the return types below are the real contract either way.
 */
async function callDoorRpc<T>(
  fn: DoorRpcName,
  args: Record<string, unknown>
): Promise<T> {
  const supabase = createServiceRoleClient();
  // Bound to the client: a detached `supabase.rpc` loses `this` and crashes
  // inside supabase-js with "Cannot read properties of undefined (reading 'rest')".
  const invoke = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params: Record<string, unknown>
  ) => PromiseLike<RpcResponse<T>>;

  const { data, error } = await invoke(fn, args);

  if (error) {
    throw new DoorRpcError(fn, error.message, { cause: error, code: error.code });
  }

  // A SQL function returning jsonb always returns a row; a null payload means
  // something changed underneath us and is worth surfacing rather than
  // silently rendering an empty panel.
  if (data === null || data === undefined) {
    throw new DoorRpcError(fn, 'returned no payload');
  }

  return data;
}

/**
 * Resolve a scanned UUID to the whole door panel, across both id spaces.
 *
 * Returns `{ found: false }` for an unknown code rather than throwing, because
 * a stranger's QR is an expected event at a door, not an error.
 */
export async function doorResolve(scannedId: string): Promise<DoorResolveResult> {
  return callDoorRpc<DoorResolveResult>('door_resolve', {
    p_scanned_id: scannedId,
  });
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
}

export async function doorCheckIn(args: DoorCheckInArgs): Promise<DoorCheckInResult> {
  return callDoorRpc<DoorCheckInResult>('door_check_in', {
    p_scanned_id: args.scannedId,
    p_staff_id: args.staffId,
    p_station: args.station ?? null,
    p_occurred_at: args.occurredAt ?? null,
    p_manual: args.manual ?? false,
    p_reason: args.reason ?? null,
  });
}

export interface DoorGoodieArgs {
  ticketId: string;
  staffId: string;
  station?: string;
  occurredAt?: string;
  /** Set when only part of the entitlement was handed over. */
  note?: string;
}

export async function doorGoodieHandover(args: DoorGoodieArgs): Promise<DoorGoodieResult> {
  return callDoorRpc<DoorGoodieResult>('door_goodie_handover', {
    p_ticket_id: args.ticketId,
    p_staff_id: args.staffId,
    p_station: args.station ?? null,
    p_occurred_at: args.occurredAt ?? null,
    p_note: args.note ?? null,
  });
}

/**
 * Which occasion the SERVER considers active.
 *
 * Read from the database rather than computed here so the station, the API and
 * the audit trail cannot disagree — a device clock never decides which day an
 * action belongs to.
 */
export async function doorCurrentOccasion(): Promise<DoorOccasion> {
  const data = await callDoorRpc<DoorOccasion>('door_current_occasion', {});

  if (data !== 'workshop_day' && data !== 'conference_day') {
    throw new DoorRpcError(
      'door_current_occasion',
      `returned an unknown occasion: ${String(data)}`
    );
  }

  return data;
}
