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
  DoorCheckInResult,
  DoorGoodieResult,
  DoorOccasion,
  DoorResolveResult,
} from '@/lib/types/checkin';
import type { DoorDashboard } from './dashboard';

// A `type`, not an `interface`: interfaces have no implicit index signature, so
// an interface here would fail supabase-js's `Record<string, GenericFunction>`
// schema constraint and silently degrade every rpc call's typing to `never`.
type DoorFunctions = {
  /** RETURNS TEXT — narrowed to DoorOccasion at runtime by the wrapper. */
  door_current_occasion: {
    Args: Record<PropertyKey, never>;
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
      p_station?: string | null;
      p_occurred_at?: string | null;
      p_manual?: boolean;
      p_reason?: string | null;
    };
    Returns: DoorCheckInResult;
  };
  door_goodie_handover: {
    Args: {
      p_ticket_id: string;
      p_staff_id: string;
      p_station?: string | null;
      p_occurred_at?: string | null;
      p_note?: string | null;
    };
    Returns: DoorGoodieResult;
  };
  door_dashboard: {
    Args: { p_occasion?: DoorOccasion | null };
    Returns: DoorDashboard;
  };
};

export type DoorDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & DoorFunctions;
  };
};

export type DoorRpcName = keyof DoorFunctions & string;
