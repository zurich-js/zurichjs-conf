/**
 * Admin Travel Flights API
 * GET /api/admin/cfp/travel/flights - Get all flights with speaker info
 * POST /api/admin/cfp/travel/flights - Create a flight for a speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getAllFlights, createFlightAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Flights API');

const createSchema = z.object({
  speaker_id: z.string().uuid().nullable().optional(),
  traveler_name: z.string().nullable().optional(),
  traveler_email: z.string().email().nullable().optional().or(z.literal('')),
  direction: z.enum(['inbound', 'outbound']),
  airline: z.string().nullable().optional(),
  flight_number: z.string().nullable().optional(),
  departure_airport: z.string().nullable().optional(),
  arrival_airport: z.string().nullable().optional(),
  departure_time: z.string().nullable().optional(),
  arrival_time: z.string().nullable().optional(),
  booking_reference: z.string().nullable().optional(),
  cost_amount: z.number().nullable().optional(),
  cost_currency: z.string().nullable().optional(),
  tracking_url: z.string().nullable().optional(),
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

  if (req.method === 'POST') {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const { speaker_id, ...data } = parsed.data;
      const { flight, error } = await createFlightAdmin(speaker_id || null, {
        ...data,
        traveler_name: data.traveler_name || undefined,
        traveler_email: data.traveler_email || undefined,
      });
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Flight created', { speakerId: speaker_id || null });
      return res.status(201).json({ flight });
    } catch (error) {
      log.error('Error creating flight', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
