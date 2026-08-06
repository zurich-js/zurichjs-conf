/**
 * Corporate Access Link — /corporate/<code>
 *
 * A hop, not a destination. Opening an admin-issued link marks this browser as a
 * corporate buyer — which permanently stops the discount popup from offering
 * money off — and then drops the visitor on the landing page's ticket section,
 * exactly where a plain "buy tickets" link would have put them.
 *
 * Nothing is rendered and nothing is explained. The recipient clicked a link to
 * buy tickets, not to read about their account status, and suppressing the
 * discount is our margin decision rather than something they need to reason
 * about. An expired, mistyped or tampered code takes the identical route — it
 * just doesn't mark the browser, so the visitor sees the normal popup behaviour
 * and never learns a link failed.
 *
 * The code is a path segment rather than a query parameter so it doesn't end up
 * in analytics URLs, Referer headers or shared screenshots of the address bar
 * as an obvious `?discount=` style toggle. Verification happens in
 * `getServerSideProps` so the secret-reading module stays out of the client
 * bundle and the redirect fires on the first client render, with no round trip
 * and no blank flash in between.
 */

import { useEffect, useRef } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { SEO } from '@/components/SEO';
import { analytics } from '@/lib/analytics/client';
import { markCorporateBuyer } from '@/lib/discount/corporate-buyer';
import { verifyCorporateCode } from '@/lib/discount/corporate-code';
import { logger } from '@/lib/logger';

const log = logger.scope('CorporateAccessLink');

/** Where every visitor ends up, valid link or not. */
const DESTINATION = '/#tickets';

interface CorporateAccessProps {
  /** Organisation label from a valid code; null when the link wasn't usable. */
  label: string | null;
  /** Why the code was rejected. Analytics only — never shown. */
  reason: string | null;
}

export default function CorporateAccessLink({ label, reason }: CorporateAccessProps) {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (label) markCorporateBuyer(label);

    // The visitor sees no confirmation, so this event is the only record that
    // the link was opened at all.
    analytics.track('corporate_access_link_opened', {
      valid: label !== null,
      ...(label ? { corporate_label: label } : {}),
      ...(reason ? { reason } : {}),
    });

    // Client-side replace rather than a hard redirect: it keeps the in-flight
    // analytics request alive, and `replace` keeps the code out of history so
    // Back from the landing page doesn't bounce through here again.
    void router.replace(DESTINATION);
  }, [label, reason, router]);

  return (
    <SEO
      title="ZurichJS Conference 2026"
      description="Tickets for ZurichJS Conference 2026."
      noindex
    />
  );
}

export const getServerSideProps: GetServerSideProps<CorporateAccessProps> = async (ctx) => {
  const code = ctx.params?.code;

  if (typeof code !== 'string' || !code) {
    return { props: { label: null, reason: 'malformed' } };
  }

  try {
    const result = verifyCorporateCode(code);

    if (!result.valid) {
      // Not an error condition — an old or mistyped link is expected traffic.
      log.info('Corporate code rejected', { reason: result.reason });
      return { props: { label: null, reason: result.reason } };
    }

    log.info('Corporate code accepted', { label: result.label });
    return { props: { label: result.label, reason: null } };
  } catch (error) {
    // Misconfigured signing secret. Nobody gets stranded on a broken page —
    // they just land on tickets without the marker.
    log.error('Failed to verify corporate code', error);
    return { props: { label: null, reason: 'verification_failed' } };
  }
};
