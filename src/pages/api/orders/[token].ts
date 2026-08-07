/**
 * Order Details API
 * GET /api/orders/[token]
 * Allows attendees to view their order using a secure token from email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyOrderTokenForCurrentTicket } from '@/lib/auth/orderTokenServer';
import { getOrderDetails, type OrderDetailsResponse } from '@/lib/orders';
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

    // Verify the token and extract ticket ID
    const ticketId = await verifyOrderTokenForCurrentTicket(token);

    if (!ticketId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const orderDetails = await getOrderDetails(ticketId);

    if (!orderDetails) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.status(200).json(orderDetails);
  } catch (error) {
    log.error('Error getting order details', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
