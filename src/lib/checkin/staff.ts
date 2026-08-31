/**
 * Door staff records.
 *
 * Reads and writes go through the service-role client, because RLS on
 * checkin_staff has no policies for client roles by design — there is
 * deliberately no update-own policy, so `is_active` stays a revocation switch a
 * scanner cannot flip.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { DoorRole, DoorStaff } from '@/lib/types/checkin';

const log = logger.scope('Door Staff');

/** Columns the door and admin panel need. Never selects with `*`. */
const STAFF_COLUMNS =
  'id, email, name, role, is_active, invited_at, invited_by, accepted_at, user_id';

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  invited_at: string;
  invited_by: string | null;
  accepted_at: string | null;
  user_id: string | null;
}

function toDoorStaff(row: StaffRow): DoorStaff {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as DoorRole,
    isActive: row.is_active,
    invitedAt: row.invited_at,
    invitedBy: row.invited_by,
    acceptedAt: row.accepted_at,
  };
}

/**
 * The active staff row for an authenticated user.
 *
 * Filters on is_active so revoking access takes effect on the volunteer's very
 * next action, with no session to expire first.
 */
export async function getStaffByUserId(userId: string): Promise<DoorStaff | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('checkin_staff')
    .select(STAFF_COLUMNS)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    log.error('Failed to look up staff by user_id', error, { userId });
    return null;
  }

  return data ? toDoorStaff(data as StaffRow) : null;
}

/** Look up an invitation by email. Emails are stored lowercased by a CHECK constraint. */
export async function getStaffByEmail(email: string): Promise<DoorStaff | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('checkin_staff')
    .select(STAFF_COLUMNS)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error) {
    log.error('Failed to look up staff by email', error);
    return null;
  }

  return data ? toDoorStaff(data as StaffRow) : null;
}

export async function listStaff(): Promise<DoorStaff[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('checkin_staff')
    .select(STAFF_COLUMNS)
    .order('invited_at', { ascending: false });

  if (error) {
    log.error('Failed to list staff', error);
    return [];
  }

  return (data as StaffRow[]).map(toDoorStaff);
}

export interface InviteStaffInput {
  email: string;
  name?: string;
  role: DoorRole;
  /** Who issued the invitation. Free text — the admin session carries no identity. */
  invitedBy?: string;
}

/**
 * Create an invitation.
 *
 * Mirrors inviteReviewer: dedupes on the lowercased email and returns a
 * message rather than throwing, so the admin panel can show it inline.
 */
export async function inviteStaff(
  input: InviteStaffInput
): Promise<{ staff: DoorStaff | null; error: string | null }> {
  const supabase = createServiceRoleClient();
  const email = input.email.toLowerCase();

  const existing = await getStaffByEmail(email);
  if (existing) {
    return { staff: null, error: 'Someone with this email has already been invited' };
  }

  const { data, error } = await supabase
    .from('checkin_staff')
    .insert({
      email,
      name: input.name || null,
      role: input.role,
      invited_by: input.invitedBy || null,
      invited_at: new Date().toISOString(),
      is_active: true,
    })
    .select(STAFF_COLUMNS)
    .single();

  if (error) {
    log.error('Failed to invite staff', error, { role: input.role });
    return { staff: null, error: error.message };
  }

  log.info('Door staff invited', { role: input.role });
  return { staff: toDoorStaff(data as StaffRow), error: null };
}

export interface UpdateStaffInput {
  role?: DoorRole;
  isActive?: boolean;
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput
): Promise<{ staff: DoorStaff | null; error: string | null }> {
  const supabase = createServiceRoleClient();

  const patch: { updated_at: string; role?: DoorRole; is_active?: boolean } = {
    updated_at: new Date().toISOString(),
  };
  if (input.role !== undefined) patch.role = input.role;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from('checkin_staff')
    .update(patch)
    .eq('id', id)
    .select(STAFF_COLUMNS)
    .single();

  if (error) {
    log.error('Failed to update staff', error, { staffId: id });
    return { staff: null, error: error.message };
  }

  return { staff: toDoorStaff(data as StaffRow), error: null };
}

/**
 * Revoke every active staff member at once.
 *
 * The teardown step after the event. A single action rather than fifteen,
 * because this is the one that always gets skipped — and it is deliberately
 * manual: no scheduled job runs it.
 */
export async function deactivateAllStaff(): Promise<{ count: number; error: string | null }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('checkin_staff')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('is_active', true)
    .select('id');

  if (error) {
    log.error('Failed to deactivate all staff', error);
    return { count: 0, error: error.message };
  }

  log.info('All door staff deactivated', { count: data?.length ?? 0 });
  return { count: data?.length ?? 0, error: null };
}

/**
 * Link an invitation to the authenticated user on first login.
 *
 * Refuses to re-point a row another account already holds — the same guard the
 * CFP reviewer flow was missing, where claiming a known reviewer's email
 * evicted the legitimate reviewer and inherited their role.
 */
export async function acceptStaffInvite(
  userId: string,
  email: string
): Promise<{ staff: DoorStaff | null; error: string | null }> {
  const supabase = createServiceRoleClient();
  const normalizedEmail = email.toLowerCase();

  const { data: row, error: fetchError } = await supabase
    .from('checkin_staff')
    .select(STAFF_COLUMNS)
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle();

  if (fetchError) {
    log.error('Failed to find staff invitation', fetchError);
    return { staff: null, error: 'Could not look up the invitation' };
  }

  if (!row) {
    return { staff: null, error: 'No door invitation found for this address' };
  }

  const existing = row as StaffRow;

  if (existing.user_id && existing.user_id !== userId) {
    log.warn('Door invitation already linked to a different user', { staffId: existing.id });
    return {
      staff: null,
      error: 'This invitation is already associated with another account',
    };
  }

  if (existing.user_id === userId) {
    return { staff: toDoorStaff(existing), error: null };
  }

  const { data, error } = await supabase
    .from('checkin_staff')
    .update({
      user_id: userId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select(STAFF_COLUMNS)
    .single();

  if (error) {
    log.error('Failed to accept door invitation', error, { staffId: existing.id });
    return { staff: null, error: error.message };
  }

  log.info('Door invitation accepted', { staffId: existing.id });
  return { staff: toDoorStaff(data as StaffRow), error: null };
}
