/**
 * The live door dashboard aggregate.
 *
 * Thin wrapper over door_dashboard(), which does the grouping in Postgres so a
 * poll costs one round trip and a fixed payload.
 */

import type { PostgrestError } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { DoorOccasion, DoorRole } from '@/lib/types/checkin';

const log = logger.scope('Door Dashboard');

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
  // generated types yet.
  const invoke = supabase.rpc as unknown as (
    name: string,
    params: Record<string, unknown>
  ) => PromiseLike<{ data: DoorDashboard | null; error: PostgrestError | null }>;

  const { data, error } = await invoke('door_dashboard', { p_occasion: occasion ?? null });

  if (error) {
    log.error('door_dashboard failed', error, { occasion });
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('door_dashboard returned no payload');
  }

  return data;
}
