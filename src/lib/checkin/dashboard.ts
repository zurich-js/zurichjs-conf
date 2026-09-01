/**
 * The live door dashboard aggregate.
 *
 * Thin wrapper over door_dashboard(), which does the grouping in Postgres so a
 * poll costs one round trip and a fixed payload.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { DoorRpcError } from './errors';
import type { DoorDatabase } from './door-database';
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
  /** Every action this volunteer performed, whatever the outcome. */
  scans: number;
  admitted: number;
  manualAdmits: number;
  undos: number;
  badgePickups: number;
  refusals: number;
  duplicates: number;
  lastSeenAt: string | null;
}

export interface DoorAnomalies {
  refusals: number;
  notFound: number;
  manualAdmits: number;
  undos: number;
  duplicates: number;
}

export interface DoorDashboard {
  occasion: DoorOccasion;
  generatedAt: string;
  expected: number;
  arrived: number;
  remaining: number;
  goodieHandedOver: number;
  /** Badges collected, early pickups included — not scoped to one occasion. */
  badgesPickedUp: number;
  arrivalsLast15Min: number;
  arrivalsLast5Min: number;
  /** Only rows old enough to carry a station label; the volunteer list leads now. */
  stations: DoorStationStat[];
  volunteers: DoorVolunteerStat[];
  anomalies: DoorAnomalies;
}

export async function doorDashboard(occasion?: DoorOccasion): Promise<DoorDashboard> {
  // Typed via DoorDatabase (see ./door-database) — door_* is not in the
  // generated types yet. The rpc call stays ON the client: detaching the
  // method loses `this` and crashes inside supabase-js.
  const supabase = createServiceRoleClient<DoorDatabase>();

  const { data, error } = await supabase.rpc('door_dashboard', {
    p_occasion: occasion ?? null,
  });

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
