/**
 * Discount Client Config API
 * GET: Public, client-safe subset of the discount popup configuration. Only
 * the advertised offer percentage is exposed — the real offer and its duration
 * are resolved server-side at generation time.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getDiscountConfig } from '@/lib/discount/config-server';
import { logger } from '@/lib/logger';
import type { DiscountClientConfigResponse } from '@/lib/discount/types';

const log = logger.scope('DiscountClientConfig');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiscountClientConfigResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = await getDiscountConfig();

    // Short CDN cache: admin edits propagate within ~a minute
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      // Everyone gets the (former aggressive-20) offer; the percentage is
      // advertised on the email-gate step, so it must be client-visible.
      // Generation still resolves the real offer server-side.
      offerPercentOff: config.abPercentOff,
      // Recurring visitors are offered more; the gate advertises the number it
      // will actually issue.
      recurringOfferPercentOff: config.recurringPercentOff,
    });
  } catch (err) {
    log.error('Failed to load discount client config', err as Error);
    return res.status(500).json({ error: 'Failed to load discount config' });
  }
}
