/**
 * Order Details API
 * GET /api/orders/[token]
 * Allows attendees to view their order using a secure token from email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrderDetailsForToken, type OrderDetailsResponse } from '@/lib/orders';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Details API');

export type { OrderDetailsResponse } from '@/lib/orders';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderDetailsResponse | { error: string }>
) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Verifies the token and loads the order off a single read of `tickets`
    const lookup = await getOrderDetailsForToken(token);

    if (lookup.status === 'unauthorized') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (lookup.status !== 'ok') {
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.status(200).json(lookup.details);
  } catch (error) {
    log.error('Error getting order details', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
