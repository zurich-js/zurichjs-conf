/**
 * Typed wrappers over the door check-in Postgres functions.
 *
 * Each wrapper is one round trip and one commit: `door_resolve` returns the
 * whole panel, and `door_check_in` applies the conditional update and writes the
 * audit row together. That is why the door does not need a read-then-write pair
 * and why the audit trail costs no extra fsync.
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
import { logger } from '@/lib/logger';
import type {
  DoorCheckInResult,
  DoorGoodieResult,
  DoorOccasion,
  DoorResolveResult,
} from '@/lib/types/checkin';

const log = logger.scope('Door RPC');

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
): Promise<RpcResponse<T>> {
  const supabase = createServiceRoleClient();
  const invoke = supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>
  ) => PromiseLike<RpcResponse<T>>;

  return invoke(fn, args);
}

/**
 * Resolve a scanned UUID to the whole door panel, across both id spaces.
 *
 * Returns `{ found: false }` for an unknown code rather than throwing, because
 * a stranger's QR is an expected event at a door, not an error.
 */
export async function doorResolve(scannedId: string): Promise<DoorResolveResult> {
  const { data, error } = await callDoorRpc<DoorResolveResult>('door_resolve', {
    p_scanned_id: scannedId,
  });

  if (error) {
    log.error('door_resolve failed', error, { scannedId });
    throw new Error(error.message);
  }

  // A SQL function returning jsonb always returns a row; a null payload means
  // something changed underneath us and is worth surfacing rather than
  // silently rendering an empty panel.
  if (!data) {
    throw new Error('door_resolve returned no payload');
  }

  return data;
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
  const { data, error } = await callDoorRpc<DoorCheckInResult>('door_check_in', {
    p_scanned_id: args.scannedId,
    p_staff_id: args.staffId,
    p_station: args.station ?? null,
    p_occurred_at: args.occurredAt ?? null,
    p_manual: args.manual ?? false,
    p_reason: args.reason ?? null,
  });

  if (error) {
    log.error('door_check_in failed', error, {
      scannedId: args.scannedId,
      staffId: args.staffId,
    });
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('door_check_in returned no payload');
  }

  return data;
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
  const { data, error } = await callDoorRpc<DoorGoodieResult>('door_goodie_handover', {
    p_ticket_id: args.ticketId,
    p_staff_id: args.staffId,
    p_station: args.station ?? null,
    p_occurred_at: args.occurredAt ?? null,
    p_note: args.note ?? null,
  });

  if (error) {
    log.error('door_goodie_handover failed', error, {
      ticketId: args.ticketId,
      staffId: args.staffId,
    });
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('door_goodie_handover returned no payload');
  }

  return data;
}

/**
 * Which occasion the SERVER considers active.
 *
 * Read from the database rather than computed here so the station, the API and
 * the audit trail cannot disagree — a device clock never decides which day an
 * action belongs to.
 */
export async function doorCurrentOccasion(): Promise<DoorOccasion> {
  const { data, error } = await callDoorRpc<DoorOccasion>('door_current_occasion', {});

  if (error) {
    log.error('door_current_occasion failed', error);
    throw new Error(error.message);
  }

  if (data !== 'workshop_day' && data !== 'conference_day') {
    throw new Error(`door_current_occasion returned an unknown occasion: ${String(data)}`);
  }

  return data;
}
