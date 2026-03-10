/**
 * Admin Travel Flights API
 * GET /api/admin/cfp/travel/flights - Get all flights with speaker info
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllFlights } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Flights API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const direction = req.query.direction as 'inbound' | 'outbound' | undefined;
      const date = req.query.date as string | undefined;

      const flights = await getAllFlights({ direction, date });
      return res.status(200).json({ flights });
    } catch (error) {
      log.error('Error fetching flights', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
