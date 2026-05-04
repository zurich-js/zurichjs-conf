/**
 * Admin Flight CRUD API
 * PUT /api/admin/cfp/travel/flights/[id] - Update flight details
 * DELETE /api/admin/cfp/travel/flights/[id] - Delete flight
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { updateFlightAdmin, deleteFlightAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Flight CRUD API');

const updateSchema = z.object({
  direction: z.enum(['inbound', 'outbound']).optional(),
  airline: z.string().optional(),
  flight_number: z.string().optional(),
  departure_airport: z.string().optional(),
  arrival_airport: z.string().optional(),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  booking_reference: z.string().optional(),
  cost_amount: z.number().optional(),
  cost_currency: z.string().optional(),
  tracking_url: z.string().optional(),
  flight_status: z.enum([
    'pending', 'confirmed', 'checked_in', 'boarding',
    'departed', 'arrived', 'cancelled', 'delayed',
  ]).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { flight, error } = await updateFlightAdmin(id, parsed.data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight updated', { flightId: id });
      return res.status(200).json({ flight });
    } catch (error) {
      log.error('Error updating flight', error, { flightId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deleteFlightAdmin(id);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight deleted', { flightId: id });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error deleting flight', error, { flightId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
