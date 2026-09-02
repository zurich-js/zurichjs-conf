/**
 * The generated `Database` type, extended with the door_* Postgres functions.
 *
 * WHY THIS FILE EXISTS
 * The door functions (migrations 20260823000001 and 20260823000003) are not in
 * `database.generated.ts` yet, and hand-editing that file is forbidden — it is
 * overwritten by `pnpm regen-db-types`. Extending the type HERE gives the door
 * modules a fully typed `supabase.rpc('door_…', …)` call with no casts: the
 * function names, argument shapes and return payloads below are the single
 * declared contract, checked at every call site.
 *
 * The functions return `jsonb`, so even a regen would only ever type them as
 * `Json` — the payload contracts in `@/lib/types/checkin` are hand-written
 * either way. Once a regen adds the door functions (as `Json`), the entries
 * here still win the intersection and keep the precise payload types.
 *
 * Args mirror the SQL signatures exactly (see the migrations); optional keys
 * are the parameters with SQL `DEFAULT`s.
 */

import type { Database } from '@/lib/types/database';
import type {
  DoorBadgePickupResult,
  DoorCheckInResult,
  DoorGoodieResult,
  DoorGoodieUndoResult,
  DoorOccasion,
  DoorResolveResult,
} from '@/lib/types/checkin';
import type { DoorDashboard } from './dashboard';

/** One badge already handed over, from door_badge_pickups(). */
export interface DoorBadgePickupRow {
  /** Ticket id or workshop registration id — the same id space a scan resolves. */
  subjectId: string;
  pickedUpAt: string;
}

// A `type`, not an `interface`: interfaces have no implicit index signature, so
// an interface here would fail supabase-js's `Record<string, GenericFunction>`
// schema constraint and silently degrade every rpc call's typing to `never`.
type DoorFunctions = {
  /** RETURNS TEXT — narrowed to DoorOccasion at runtime by the wrapper. */
  door_current_occasion: {
    Args: never;
    Returns: string;
  };
  door_resolve: {
    Args: { p_scanned_id: string };
    Returns: DoorResolveResult;
  };
  door_check_in: {
    Args: {
      p_scanned_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_manual?: boolean;
      p_reason?: string;
      p_occasion?: DoorOccasion;
    };
    Returns: DoorCheckInResult;
  };
  door_check_in_undo: {
    Args: {
      p_scanned_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_reason?: string;
      p_occasion?: DoorOccasion;
    };
    Returns: DoorCheckInResult;
  };
  door_goodie_handover: {
    Args: {
      p_ticket_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_note?: string;
      p_occasion?: DoorOccasion;
      p_tshirt_size?: string;
      p_hoodie_size?: string;
    };
    Returns: DoorGoodieResult;
  };
  door_badge_pickup: {
    Args: {
      p_scanned_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_occasion?: DoorOccasion;
    };
    Returns: DoorBadgePickupResult;
  };
  door_badge_pickup_undo: {
    Args: {
      p_scanned_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_occasion?: DoorOccasion;
      p_reason?: string;
    };
    Returns: DoorBadgePickupResult;
  };
  door_goodie_undo: {
    Args: {
      p_ticket_id: string;
      p_staff_id: string;
      p_station?: string;
      p_occurred_at?: string;
      p_occasion?: DoorOccasion;
      p_reason?: string;
      p_undo_tshirt?: boolean;
      p_undo_hoodie?: boolean;
    };
    Returns: DoorGoodieUndoResult;
  };
  door_badge_pickups: {
    Args: never;
    Returns: DoorBadgePickupRow[];
  };
  door_events_delete: {
    Args: { p_ids: string[] };
    Returns: { deleted: number };
  };
  door_dashboard: {
    Args: { p_occasion?: DoorOccasion };
    Returns: DoorDashboard;
  };
};

export type DoorDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & DoorFunctions;
  };
};

export type DoorRpcName = keyof DoorFunctions & string;
