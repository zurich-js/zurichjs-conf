/**
 * Reading the door audit trail.
 *
 * Two consumers, one query path:
 *  - the organiser's audit log in /admin/checkin (every volunteer, filterable);
 *  - a volunteer's own "my check-ins" list at the station.
 *
 * door_events deliberately stores no attendee names — the actor snapshot is the
 * only PII on the row — so names are joined in here, scoped to exactly the rows
 * being returned. The subject ids on the page cap the join at `limit` rows.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { DoorOccasion } from '@/lib/types/checkin';

const log = logger.scope('Door Events');

export type DoorEventType =
  | 'checked_in'
  | 'check_in_undone'
  | 'goodie_handed'
  | 'goodie_undone'
  | 'manual_admit'
  | 'badge_pickup'
  | 'badge_pickup_undone'
  | 'denied';

export interface DoorEventRecord {
  id: string;
  eventType: DoorEventType;
  occasion: DoorOccasion;
  outcome: 'applied' | 'duplicate' | 'denied' | 'not_found';
  staffRole: string;
  /**
   * The volunteer who performed this action. Exposed only to oversight roles
   * (admin, door lead) who already see staffEmail in door_dashboard.
   */
  staffEmail: string;
  /** Legacy label; new stations no longer send one. */
  station: string | null;
  occurredAt: string;
  recordedAt: string;
  failureReason: string | null;
  notes: string | null;
  /** Long-tail context, e.g. the sizes a goodie handover actually gave out. */
  metadata: Record<string, unknown>;
  subjectKind: 'ticket' | 'workshop_registration' | null;
  /** Joined in for display; null when the subject row was erased. */
  attendeeName: string | null;
}

export interface DoorEventFilters {
  occasion?: DoorOccasion;
  eventType?: DoorEventType;
  staffId?: string;
  subjectId?: string;
  limit: number;
}

interface DoorEventRow {
  id: string;
  event_type: string;
  occasion: string;
  outcome: string;
  ticket_id: string | null;
  workshop_registration_id: string | null;
  staff_role: string;
  staff_email: string;
  station: string | null;
  occurred_at: string;
  recorded_at: string;
  failure_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

function displayName(first: string | null, last: string | null): string | null {
  const name = [first, last].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : null;
}

export async function listDoorEvents(filters: DoorEventFilters): Promise<DoorEventRecord[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from('door_events')
    .select(
      'id, event_type, occasion, outcome, ticket_id, workshop_registration_id, staff_role, staff_email, station, occurred_at, recorded_at, failure_reason, notes, metadata'
    )
    // recorded_at is authoritative for ordering; occurred_at can be an offline
    // claim from earlier in the day.
    .order('recorded_at', { ascending: false })
    .limit(filters.limit);

  if (filters.occasion) query = query.eq('occasion', filters.occasion);
  if (filters.eventType) query = query.eq('event_type', filters.eventType);
  if (filters.staffId) query = query.eq('staff_id', filters.staffId);
  if (filters.subjectId) {
    query = query.or(
      `ticket_id.eq.${filters.subjectId},workshop_registration_id.eq.${filters.subjectId}`
    );
  }

  const { data, error } = await query;
  if (error) {
    log.error('Failed to list door events', error, { filters });
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DoorEventRow[];

  const ticketIds = [...new Set(rows.map((r) => r.ticket_id).filter((id): id is string => !!id))];
  const registrationIds = [
    ...new Set(
      rows.map((r) => r.workshop_registration_id).filter((id): id is string => !!id)
    ),
  ];

  // Names only — no emails. The log answers "who did what to whom, when";
  // contact details stay behind the roles that need them.
  const [tickets, registrations] = await Promise.all([
    ticketIds.length > 0
      ? supabase.from('tickets').select('id, first_name, last_name').in('id', ticketIds)
      : Promise.resolve({ data: [], error: null }),
    registrationIds.length > 0
      ? supabase
          .from('workshop_registrations')
          .select('id, first_name, last_name')
          .in('id', registrationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (tickets.error) {
    log.error('Failed to join ticket names onto door events', tickets.error);
    throw new Error(tickets.error.message);
  }
  if (registrations.error) {
    log.error('Failed to join registration names onto door events', registrations.error);
    throw new Error(registrations.error.message);
  }

  const nameBySubject = new Map<string, string | null>();
  for (const t of tickets.data ?? []) {
    nameBySubject.set(t.id, displayName(t.first_name, t.last_name));
  }
  for (const r of registrations.data ?? []) {
    nameBySubject.set(r.id, displayName(r.first_name, r.last_name));
  }

  return rows.map((row) => {
    const subjectId = row.ticket_id ?? row.workshop_registration_id;
    return {
      id: row.id,
      eventType: row.event_type as DoorEventType,
      occasion: row.occasion as DoorOccasion,
      outcome: row.outcome as DoorEventRecord['outcome'],
      staffRole: row.staff_role,
      staffEmail: row.staff_email,
      station: row.station,
      occurredAt: row.occurred_at,
      recordedAt: row.recorded_at,
      failureReason: row.failure_reason,
      notes: row.notes,
      metadata: row.metadata ?? {},
      subjectKind: row.ticket_id
        ? 'ticket'
        : row.workshop_registration_id
          ? 'workshop_registration'
          : null,
      attendeeName: subjectId ? (nameBySubject.get(subjectId) ?? null) : null,
    };
  });
}
