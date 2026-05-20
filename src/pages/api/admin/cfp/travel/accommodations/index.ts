/**
 * Admin Travel Accommodations API
 * GET /api/admin/cfp/travel/accommodations - List accommodation records
 * POST /api/admin/cfp/travel/accommodations - Create accommodation record
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createAccommodationAdmin, getAccommodations } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Accommodations API');

const roomSchema = z.object({
  hotel_id: z.string().uuid().nullable().optional(),
  hotel_name: z.string().nullable().optional(),
  hotel_address: z.string().nullable().optional(),
  room_type_id: z.string().uuid().nullable().optional(),
  room_type_name: z.string().nullable().optional(),
  save_room_type: z.boolean().optional(),
  people_count: z.number().int().min(1),
  check_in_date: z.string().min(1),
  check_out_date: z.string().min(1),
  nightly_rate: z.number().int().min(0),
});

const bookingSchema = z.object({
  related_speaker_id: z.string().uuid().nullable().optional(),
  guest_name: z.string().min(1),
  guest_email: z.string().email().nullable().optional().or(z.literal('')),
  status: z.enum(['draft', 'pending_details', 'pending_payment', 'confirmed', 'canceled']),
  reservation_number: z.string().nullable().optional(),
  reservation_confirmation_url: z.string().url().nullable().optional().or(z.literal('')),
  conference_amount: z.number().int().min(0),
  guest_amount: z.number().int().min(0),
  admin_notes: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  rooms: z.array(roomSchema).min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const accommodations = await getAccommodations();
      return res.status(200).json(accommodations);
    } catch (error) {
      log.error('Error fetching accommodations', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const parsed = bookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const data = {
        related_speaker_id: parsed.data.related_speaker_id || null,
        guest_name: parsed.data.guest_name,
        guest_email: parsed.data.guest_email || null,
        status: parsed.data.status,
        reservation_number: parsed.data.reservation_number ?? null,
        reservation_confirmation_url: parsed.data.reservation_confirmation_url || null,
        conference_amount: parsed.data.conference_amount,
        guest_amount: parsed.data.guest_amount,
        admin_notes: parsed.data.admin_notes ?? null,
        metadata: parsed.data.metadata,
        rooms: parsed.data.rooms,
      };
      const { booking, error } = await createAccommodationAdmin(data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Accommodation created', { bookingId: booking?.id });
      return res.status(201).json({ booking });
    } catch (error) {
      log.error('Error creating accommodation', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
