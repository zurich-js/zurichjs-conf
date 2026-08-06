/**
 * Corporate access link handler (server-only)
 *
 * The `getServerSideProps` body behind `/corporate/<code>`, kept out of the
 * page so it can be tested without a file under `src/pages/` — anything there
 * becomes a real route, and a route that imports the signing module would ship
 * it to the browser.
 *
 * Every visitor is redirected to the ticket section, valid link or not. A valid
 * code additionally leaves a short-lived handoff cookie, which the app shell
 * promotes into the durable corporate-buyer marker on arrival (the server can't
 * write localStorage itself). See `corporate-buyer.ts` for the other half.
 *
 * Do NOT export this module from the discount barrel (index.ts) — it pulls in
 * the secret-reading `corporate-code` module and must never reach a client
 * bundle.
 */

import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { getPostHogDistinctId, serverAnalytics } from '@/lib/analytics/server';
import { COOKIE_NAMES } from './config';
import { verifyCorporateCode } from './corporate-code';
import { logger } from '@/lib/logger';

const log = logger.scope('CorporateAccessLink');

/** Where every visitor ends up, valid link or not. */
export const CORPORATE_REDIRECT_DESTINATION = '/#tickets';

/**
 * Long enough to survive the redirect and a slow landing page, short enough
 * that a shared machine doesn't inherit the marker from someone else's visit.
 */
const HANDOFF_MAX_AGE_SECONDS = 300;

export async function resolveCorporateLink(
  ctx: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<Record<string, never>>> {
  const code = ctx.params?.code;

  let label: string | null = null;
  let reason: string | null = null;

  if (typeof code !== 'string' || !code) {
    reason = 'malformed';
  } else {
    try {
      const result = verifyCorporateCode(code);
      if (result.valid) {
        label = result.label;
      } else {
        // Not an error condition — an old or mistyped link is expected traffic.
        reason = result.reason;
      }
    } catch (error) {
      // Misconfigured signing secret. Nobody gets stranded on a broken page —
      // they just land on tickets without the marker.
      log.error('Failed to verify corporate code', error);
      reason = 'verification_failed';
    }
  }

  if (label) {
    const isSecure = process.env.NODE_ENV === 'production';
    ctx.res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAMES.CORPORATE_HANDOFF}=${encodeURIComponent(label)}; Path=/; SameSite=Lax; Max-Age=${HANDOFF_MAX_AGE_SECONDS}${isSecure ? '; Secure' : ''}`
    );
  }

  log.info(label ? 'Corporate code accepted' : 'Corporate code rejected', { label, reason });

  // The visitor sees no confirmation, so this event is the only record that the
  // link was opened. Tracked here rather than on the client because no client
  // code runs on this route.
  const distinctId = getPostHogDistinctId(ctx.req.cookies);
  if (distinctId) {
    await serverAnalytics.track('corporate_access_link_opened', distinctId, {
      valid: label !== null,
      ...(label ? { corporate_label: label } : {}),
      ...(reason ? { reason } : {}),
    });
  }

  return { redirect: { destination: CORPORATE_REDIRECT_DESTINATION, permanent: false } };
}
