/**
 * The single authorization path to a door staff identity.
 *
 * Deliberately one shared guard rather than a per-route check. The CFP reviewer
 * equivalent is copy-pasted into four routes and has already drifted — two of
 * them omit the accepted_at check and one drops the email requirement. Every
 * door route calls this and nothing else.
 *
 * WHY THIS COSTS ONE QUERY AND NOT TWO
 * The guard resolves the staff row so a route can authorise and log before
 * touching the database. The door FUNCTIONS re-check `is_active` themselves
 * inside their transaction and are the real authority — so the guard is not
 * load-bearing for correctness, only for returning a clean 401/403 and for
 * knowing who to attribute a denial to. Mutating routes therefore pass
 * `staff.id` straight through: one guard query plus one function call, never a
 * third round trip.
 *
 * Revocation is immediate because `is_active` is filtered here AND in the
 * function. There is deliberately no caching: a cached role would keep a
 * revoked volunteer working until it expired, and a per-instance cache is
 * unreliable across serverless instances anyway.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient } from '@/lib/cfp/auth';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import { roleCan, type DoorAbility, type DoorStaff } from '@/lib/types/checkin';
import { getStaffByUserId } from './staff';

const log = logger.scope('Door Guard');

export interface DoorGuardSuccess {
  ok: true;
  staff: DoorStaff;
}

export interface DoorGuardFailure {
  ok: false;
  status: 401 | 403;
  error: string;
}

export type DoorGuardResult = DoorGuardSuccess | DoorGuardFailure;

/**
 * Resolve the authenticated door staff member, optionally requiring an ability.
 *
 * An admin cookie is NOT accepted here. The audit trail records a foreign key
 * to a named staff row, and the admin session carries no identity — accepting it
 * would reproduce the `admin_id = 'admin'` placeholder that makes
 * cfp_decision_events unable to answer "who did this". An organiser who wants to
 * work the door invites themselves from the staff panel.
 */
export async function requireDoorStaff(
  req: NextApiRequest,
  res: NextApiResponse,
  ability?: DoorAbility
): Promise<DoorGuardResult> {
  const supabase = createSupabaseApiClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Sign in to use the door station' };
  }

  const staff = await getStaffByUserId(user.id);

  if (!staff) {
    log.warn('Authenticated user is not active door staff', { userId: user.id });
    return {
      ok: false,
      status: 403,
      error: 'This account is not active door staff. Ask a lead to invite or re-enable you.',
    };
  }

  if (ability && !roleCan(staff.role, ability)) {
    log.warn('Door staff lacks the required ability', {
      staffId: staff.id,
      role: staff.role,
      ability,
    });
    return {
      ok: false,
      status: 403,
      error: `Your role (${staff.role}) cannot do that`,
    };
  }

  return { ok: true, staff };
}

/**
 * Guard for the organiser-facing views: the audit trail and the live dashboard.
 *
 * Accepts an admin cookie OR a door_lead session, because an organiser watching
 * the queue may be holding a laptop on the admin panel or a phone on the door.
 * Neither reads or writes attendee state through this path, so the
 * named-actor requirement above does not apply.
 */
export async function requireDoorOversight(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<DoorGuardResult | { ok: true; staff: null }> {
  const { authorized } = verifyAdminAccess(req);
  if (authorized) {
    return { ok: true, staff: null };
  }

  const result = await requireDoorStaff(req, res);
  if (!result.ok) return result;

  if (result.staff.role !== 'door_lead') {
    return {
      ok: false,
      status: 403,
      error: 'Only a door lead or an admin can see this',
    };
  }

  return result;
}
