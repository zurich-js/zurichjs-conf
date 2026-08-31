/**
 * Door Staff Admin API
 * GET  /api/admin/checkin/staff — list the crew
 * POST /api/admin/checkin/staff — invite a volunteer with a role
 *
 * Admin-gated, not door-gated: this is how the first staff row comes into
 * existence, so it cannot itself require a staff row.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { inviteStaff, listStaff } from '@/lib/checkin/staff';
import { sendDoorStaffInvitationEmail } from '@/lib/email/door-emails';
import { doorStaffInviteSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorStaff } from '@/lib/types/checkin';

const log = logger.scope('Door Staff Admin API');

interface ListResponse {
  staff: DoorStaff[];
}

interface InviteResponse {
  staff: DoorStaff;
  /** Set when the row was created but the invitation email did not go out. */
  warning?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | InviteResponse | { error: string; issues?: unknown }>
) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const staff = await listStaff();
    return res.status(200).json({ staff });
  }

  if (req.method === 'POST') {
    const parsed = doorStaffInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    }

    const { email, name, role } = parsed.data;

    const { staff, error } = await inviteStaff({ email, name, role });
    if (error || !staff) {
      return res.status(400).json({ error: error ?? 'Could not create the invitation' });
    }

    // The row is the access grant; the email is only how the volunteer finds the
    // sign-in page. So a send failure is reported as a warning on a 201 rather
    // than rolling the invitation back — mirrors the reviewer invite flow, and
    // means a lead can resend instead of re-inviting.
    const emailResult = await sendDoorStaffInvitationEmail({ to: email, staffName: name, role });

    if (!emailResult.success) {
      log.warn('Door staff invited but the email failed', { role, error: emailResult.error });
      return res.status(201).json({
        staff,
        warning: 'Invitation created, but the email did not send. Try resending it.',
      });
    }

    return res.status(201).json({ staff });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
