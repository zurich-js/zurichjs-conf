/**
 * Admin Workshop Detail API
 * GET    /api/admin/workshops/[id] - Get workshop details
 * PUT    /api/admin/workshops/[id] - Update workshop
 * DELETE /api/admin/workshops/[id] - Delete workshop
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { WORKSHOP_LEVELS, WORKSHOP_TIME_SLOTS, WORKSHOP_STATUSES } from '@/lib/types/workshop';

const log = logger.scope('Admin Workshop Detail');

const updateWorkshopSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  short_abstract: z.string().min(1).optional(),
  long_abstract: z.string().min(1).optional(),
  status: z.enum(WORKSHOP_STATUSES as [string, ...string[]]).optional(),
  featured: z.boolean().optional(),
  date: z.string().min(1).optional(),
  time_slot: z.enum(WORKSHOP_TIME_SLOTS as [string, ...string[]]).optional(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().min(1).optional(),
  duration_minutes: z.number().int().positive().optional(),
  level: z.enum(WORKSHOP_LEVELS as [string, ...string[]]).optional(),
  topic_tags: z.array(z.string()).optional(),
  outcomes: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  agenda: z.array(z.string()).optional(),
  capacity: z.number().int().positive().optional(),
  price: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  location: z.string().min(1).optional(),
  room: z.string().nullable().optional(),
  instructor_id: z.string().nullable().optional(),
  stripe_product_id: z.string().nullable().optional(),
  stripe_price_id: z.string().nullable().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!verifyAdminToken(req.cookies.admin_token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Missing workshop ID' });
    return;
  }

  const supabase = createServiceRoleClient();

  if (req.method === 'GET') {
    try {
      const { data: workshop, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !workshop) {
        res.status(404).json({ error: 'Workshop not found' });
        return;
      }

      // Fetch booking count and revenue
      const { data: bookings } = await supabase
        .from('workshop_registrations')
        .select('id, amount_paid, status')
        .eq('workshop_id', id);

      const confirmedBookings = (bookings || []).filter(b => b.status === 'confirmed');
      const revenue = confirmedBookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0);

      res.status(200).json({
        workshop,
        bookings_count: confirmedBookings.length,
        revenue,
      });
    } catch (error) {
      log.error('Error fetching workshop', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const parsed = updateWorkshopSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }

      const updateData: Record<string, unknown> = { ...parsed.data };

      // If instructor_id is being updated, refresh speaker data
      if (parsed.data.instructor_id) {
        const { data: speaker } = await supabase
          .from('cfp_speakers')
          .select('first_name, last_name, profile_image_url, bio, company, job_title, linkedin_url, github_url, twitter_handle')
          .eq('id', parsed.data.instructor_id)
          .single();

        if (speaker) {
          updateData.instructor_name = `${speaker.first_name} ${speaker.last_name}`;
          updateData.instructor_avatar_url = speaker.profile_image_url;
          updateData.instructor_bio = speaker.bio;
          updateData.instructor_company = speaker.company;
          updateData.instructor_job_title = speaker.job_title;
          updateData.instructor_linkedin_url = speaker.linkedin_url;
          updateData.instructor_github_url = speaker.github_url;
          updateData.instructor_twitter_handle = speaker.twitter_handle;
        }
      } else if (parsed.data.instructor_id === null) {
        // Clear instructor fields
        updateData.instructor_name = null;
        updateData.instructor_avatar_url = null;
        updateData.instructor_bio = null;
        updateData.instructor_company = null;
        updateData.instructor_job_title = null;
        updateData.instructor_linkedin_url = null;
        updateData.instructor_github_url = null;
        updateData.instructor_twitter_handle = null;
      }

      const { data: workshop, error } = await supabase
        .from('workshops')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating workshop', error);
        res.status(500).json({ error: error.message });
        return;
      }

      log.info('Workshop updated', { workshopId: id });
      res.status(200).json({ workshop });
    } catch (error) {
      log.error('Error in PUT workshop', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      // Check if workshop has bookings
      const { data: bookings } = await supabase
        .from('workshop_registrations')
        .select('id')
        .eq('workshop_id', id)
        .eq('status', 'confirmed')
        .limit(1);

      if (bookings && bookings.length > 0) {
        res.status(400).json({ error: 'Cannot delete workshop with active bookings. Cancel or refund bookings first.' });
        return;
      }

      const { error } = await supabase
        .from('workshops')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting workshop', error);
        res.status(500).json({ error: error.message });
        return;
      }

      log.info('Workshop deleted', { workshopId: id });
      res.status(200).json({ success: true });
    } catch (error) {
      log.error('Error in DELETE workshop', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
