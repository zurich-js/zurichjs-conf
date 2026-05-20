/**
 * Admin Travel Accommodation CRUD API
 * PUT /api/admin/cfp/travel/accommodations/[id] - Update accommodation record
 * DELETE /api/admin/cfp/travel/accommodations/[id] - Delete accommodation record
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { deleteAccommodationAdmin, updateAccommodationAdmin } from '@/lib/cfp/admin-travel';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Travel Accommodation CRUD API');

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

const accommodationUpdateSchema = z.object({
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Accommodation ID is required' });
  }

  if (req.method === 'PUT') {
    try {
      const parsed = accommodationUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
      }

      const data = {
        ...parsed.data,
        related_speaker_id: parsed.data.related_speaker_id || null,
        guest_email: parsed.data.guest_email || null,
        reservation_confirmation_url: parsed.data.reservation_confirmation_url || null,
        admin_notes: parsed.data.admin_notes ?? null,
      };
      const { booking, error } = await updateAccommodationAdmin(id, data);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Accommodation updated', { accommodationId: id });
      return res.status(200).json({ booking });
    } catch (error) {
      log.error('Error updating accommodation', error, { accommodationId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deleteAccommodationAdmin(id);
      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Accommodation deleted', { accommodationId: id });
      return res.status(200).json({ success });
    } catch (error) {
      log.error('Error deleting accommodation', error, { accommodationId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
