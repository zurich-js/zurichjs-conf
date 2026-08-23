/**
 * Door staff authentication.
 *
 * Magic links, same as the CFP reviewer flow, for one reason: volunteers are on
 * their own phones and a password is the wrong instrument. Half of them will be
 * signing in for the first time twenty minutes before doors, standing up, in a
 * foyer — a forgotten password there costs a person at the door. An emailed link
 * has no recall step, and there is nothing to reset.
 *
 * WHY THE ALLOW-LIST IS CHECKED BEFORE SENDING
 * `signInWithOtp` creates a Supabase auth user for any address it is given. Left
 * open, that turns a public endpoint into an account factory and puts strangers'
 * addresses in the auth table. Every request here is checked against
 * `checkin_staff` first, and the response is identical either way so the
 * endpoint cannot be used to test whether someone is on the crew.
 */

import type { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '@/config/env';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import { getStaffByEmail } from './staff';

const log = logger.scope('Door Auth');

/**
 * A client that only issues auth calls: no session is persisted and no token is
 * refreshed, because this runs in a request handler that will not exist a moment
 * later.
 */
function createOtpClient() {
  return createClient(clientEnv.supabase.url, clientEnv.supabase.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface MagicLinkResult {
  /** Whether a link was actually sent. Never surfaced verbatim to the caller. */
  sent: boolean;
  error: string | null;
}

/**
 * Send a sign-in link to an invited volunteer.
 *
 * Returns `sent: false` with no error when the address is not on the crew — the
 * caller is expected to answer identically in both cases.
 */
export async function sendDoorMagicLink(
  email: string,
  req?: NextApiRequest
): Promise<MagicLinkResult> {
  const normalized = email.toLowerCase();

  const staff = await getStaffByEmail(normalized);
  if (!staff) {
    // Deliberately not an error. Logged so a volunteer reporting "it never
    // arrived" can be diagnosed without asking them to try again.
    log.info('Door login requested for an address that is not active staff');
    return { sent: false, error: null };
  }

  const redirectTo = `${getBaseUrl(req)}/checkin/auth/callback`;

  try {
    const { error } = await createOtpClient().auth.signInWithOtp({
      email: normalized,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      log.error('Door magic link failed', error, { staffId: staff.id });
      return { sent: false, error: error.message };
    }

    log.info('Door magic link sent', { staffId: staff.id, role: staff.role });
    return { sent: true, error: null };
  } catch (error) {
    log.error('Door magic link threw', error, { staffId: staff.id });
    return { sent: false, error: 'Could not send the sign-in link' };
  }
}
