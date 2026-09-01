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

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { createSupabaseApiClient } from '@/lib/cfp/auth';
import { acceptStaffInvite } from '@/lib/checkin/staff';
import { ErrorCodes, HttpError } from '@/lib/errors';

const schema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export default withApiHandler(
  { scope: 'Door Auth Callback API', methods: ['POST'], bodySchema: schema },
  async (req, res, { requestId, log, body }) => {
    const supabase = createSupabaseApiClient(req, res);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new HttpError(401, 'Sign in first', { code: ErrorCodes.AUTH_REQUIRED });
    }

    if (user.id !== body.userId) {
      log.warn('Door callback user id mismatch', { actualUserId: user.id });
      throw new HttpError(403, 'Session does not match the request', {
        code: ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    const email = user.email;
    if (!email) {
      log.warn('Door callback for an account with no email', { userId: user.id });
      throw new HttpError(403, 'This account has no email address', {
        code: ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    if (email.toLowerCase() !== body.email.toLowerCase()) {
      log.warn('Door callback email mismatch', { userId: user.id });
      throw new HttpError(403, 'Session does not match the request', {
        code: ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    try {
      const { staff, error } = await acceptStaffInvite(user.id, email);

      if (error || !staff) {
        log.warn('Door invitation could not be accepted', { userId: user.id, reason: error });
        throw new HttpError(403, error ?? 'No door invitation found for this address', {
          code: ErrorCodes.AUTH_FORBIDDEN,
        });
      }

      log.info('Door invitation accepted', { staffId: staff.id, role: staff.role });
      return res.status(200).json({ staff });
    } catch (error) {
      // The 403 above must pass through to the wrapper untouched — only a real
      // failure gets the deliberate door message.
      if (error instanceof HttpError) throw error;
      log.error('Door auth callback failed', error, { userId: user.id });
      return res
        .status(500)
        .json({ error: 'Could not complete sign-in', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
