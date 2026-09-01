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

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { sendDoorMagicLink } from '@/lib/checkin/auth';
import { ErrorCodes } from '@/lib/errors';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address').toLowerCase(),
});

// A malformed address IS rejected (400 from the wrapper's schema check): it
// cannot be anyone's, so saying so leaks nothing and saves the volunteer
// waiting for a mail that will never come.
export default withApiHandler(
  { scope: 'Door Login API', methods: ['POST'], bodySchema: schema },
  async (req, res, { requestId, log, body }) => {
    try {
      const { error } = await sendDoorMagicLink(body.email, req);

      if (error) {
        // A genuine transport failure. Worth reporting, because silence here would
        // look identical to "you are not on the crew".
        log.error('Could not send a door sign-in link', new Error(error));
        return res.status(502).json({
          error: 'Could not send the sign-in link. Try again.',
          code: ErrorCodes.EMAIL_SEND_FAILED,
          requestId,
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Door login failed', error);
      return res
        .status(500)
        .json({ error: 'Could not send the sign-in link', code: ErrorCodes.INTERNAL, requestId });
    }
  }
);
