/**
 * Door Auth Callback API
 * POST /api/checkin/auth/callback — link an invitation to the signed-in account
 *
 * Runs once, on a volunteer's first sign-in. After this their `checkin_staff` row
 * carries a `user_id` and `requireDoorStaff` can resolve them from a session
 * alone.
 *
 * THE INVITATION IS CLAIMED AGAINST THE SESSION'S EMAIL, NEVER THE BODY'S.
 * The body value exists only so a mismatch produces a clear error. Trusting it
 * would let any authenticated user claim a colleague's invitation and inherit
 * their role — which for a `door_lead` invitation means manual admission and
 * attendee contact details. The equivalent CFP route shipped without this check.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createSupabaseApiClient } from '@/lib/cfp/auth';
import { acceptStaffInvite } from '@/lib/checkin/staff';
import { logger } from '@/lib/logger';
import type { DoorStaff } from '@/lib/types/checkin';

const log = logger.scope('Door Auth Callback API');

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ staff: DoorStaff } | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const supabase = createSupabaseApiClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Sign in first' });
  }

  if (user.id !== parsed.data.userId) {
    log.warn('Door callback user id mismatch', { actualUserId: user.id });
    return res.status(403).json({ error: 'Session does not match the request' });
  }

  const email = user.email;
  if (!email) {
    log.warn('Door callback for an account with no email', { userId: user.id });
    return res.status(403).json({ error: 'This account has no email address' });
  }

  if (email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    log.warn('Door callback email mismatch', { userId: user.id });
    return res.status(403).json({ error: 'Session does not match the request' });
  }

  try {
    const { staff, error } = await acceptStaffInvite(user.id, email);

    if (error || !staff) {
      log.warn('Door invitation could not be accepted', { userId: user.id, reason: error });
      return res
        .status(403)
        .json({ error: error ?? 'No door invitation found for this address' });
    }

    log.info('Door invitation accepted', { staffId: staff.id, role: staff.role });
    return res.status(200).json({ staff });
  } catch (error) {
    log.error('Door auth callback failed', error, { userId: user.id });
    return res.status(500).json({ error: 'Could not complete sign-in' });
  }
}
