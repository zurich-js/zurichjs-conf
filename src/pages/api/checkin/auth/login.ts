/**
 * Door Login API
 * POST /api/checkin/auth/login — email a sign-in link to an invited volunteer
 *
 * ALWAYS ANSWERS 200. Whether the address is on the crew is not disclosed: the
 * roster of volunteers is not public, and a differing response would turn this
 * into a membership oracle for anyone with the URL. The volunteer's experience is
 * the same either way — "check your email" — and a mistyped address is diagnosed
 * from the logs rather than from the response.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { sendDoorMagicLink } from '@/lib/checkin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Door Login API');

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address').toLowerCase(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: true } | { error: string; issues?: unknown }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    // A malformed address IS rejected: it cannot be anyone's, so saying so leaks
    // nothing and saves the volunteer waiting for a mail that will never come.
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  try {
    const { error } = await sendDoorMagicLink(parsed.data.email, req);

    if (error) {
      // A genuine transport failure. Worth reporting, because silence here would
      // look identical to "you are not on the crew".
      log.error('Could not send a door sign-in link', new Error(error));
      return res.status(502).json({ error: 'Could not send the sign-in link. Try again.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Door login failed', error);
    return res.status(500).json({ error: 'Could not send the sign-in link' });
  }
}
