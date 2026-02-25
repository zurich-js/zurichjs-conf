/**
 * Admin Flight Status API
 * PUT /api/admin/cfp/travel/flights/[id]/status - Update flight status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateFlightStatus } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import type { CfpFlightStatus } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Flight Status API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication (same as main admin)
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Flight ID is required' });
  }

  if (req.method === 'PUT') {
    try {
      const { status, tracking_url } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses: CfpFlightStatus[] = [
        'pending', 'confirmed', 'checked_in', 'boarding',
        'departed', 'arrived', 'cancelled', 'delayed'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { success, error } = await updateFlightStatus(id, status, tracking_url);

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight status updated', { flightId: id, status });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error updating flight status', error, { flightId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
