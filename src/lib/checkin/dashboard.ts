/**
 * The live door dashboard aggregate.
 *
 * Thin wrapper over door_dashboard(), which does the grouping in Postgres so a
 * poll costs one round trip and a fixed payload.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase';
import { DoorRpcError } from './errors';
import type { DoorOccasion, DoorRole } from '@/lib/types/checkin';

export interface DoorStationStat {
  station: string;
  admitted: number;
  duplicates: number;
  refusals: number;
  /** Last action from this station. The signal that it is still alive. */
  lastSeenAt: string | null;
}

export interface DoorVolunteerStat {
  staffEmail: string;
  staffRole: DoorRole;
  admitted: number;
  manualAdmits: number;
  refusals: number;
  lastSeenAt: string | null;
}

export interface DoorAnomalies {
  refusals: number;
  notFound: number;
  manualAdmits: number;
  duplicates: number;
}

export interface DoorDashboard {
  occasion: DoorOccasion;
  generatedAt: string;
  expected: number;
  arrived: number;
  remaining: number;
  goodieHandedOver: number;
  arrivalsLast15Min: number;
  arrivalsLast5Min: number;
  stations: DoorStationStat[];
  volunteers: DoorVolunteerStat[];
  anomalies: DoorAnomalies;
}

export async function doorDashboard(occasion?: DoorOccasion): Promise<DoorDashboard> {
  const supabase = createServiceRoleClient();

  // Same cast boundary as src/lib/checkin/rpc.ts — door_* is not in the
  // generated types yet. Bound to the client: a detached `supabase.rpc`
  // loses `this` and crashes inside supabase-js.
  const invoke = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    params: Record<string, unknown>
  ) => PromiseLike<{ data: DoorDashboard | null; error: PostgrestError | null }>;

  const { data, error } = await invoke('door_dashboard', { p_occasion: occasion ?? null });

  // No logging here: the dashboard route catches and logs, and logging in both
  // layers reports one failure to PostHog twice under two titles.
  if (error) {
    throw new DoorRpcError('door_dashboard', error.message, {
      cause: error,
      code: error.code,
      context: { occasion },
    });
  }
  if (!data) {
    throw new DoorRpcError('door_dashboard', 'returned no payload', {
      context: { occasion },
    });
  }

  return data;
}
