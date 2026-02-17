/**
 * Admin Workshop CRUD API
 * GET  /api/admin/workshops - List all workshops
 * POST /api/admin/workshops - Create a new workshop
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { WORKSHOP_LEVELS, WORKSHOP_TIME_SLOTS, WORKSHOP_STATUSES } from '@/lib/types/workshop';

const log = logger.scope('Admin Workshops');

const createWorkshopSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  short_abstract: z.string().min(1),
  long_abstract: z.string().min(1),
  status: z.enum(WORKSHOP_STATUSES as [string, ...string[]]).optional().default('draft'),
  featured: z.boolean().optional().default(false),
  date: z.string().min(1),
  time_slot: z.enum(WORKSHOP_TIME_SLOTS as [string, ...string[]]),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  duration_minutes: z.number().int().positive(),
  level: z.enum(WORKSHOP_LEVELS as [string, ...string[]]),
  topic_tags: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  agenda: z.array(z.string()).default([]),
  capacity: z.number().int().positive(),
  price: z.number().int().min(0),
  currency: z.string().default('CHF'),
  location: z.string().min(1),
  room: z.string().nullable().optional(),
  instructor_id: z.string().nullable().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Verify admin auth
  if (!verifyAdminToken(req.cookies.admin_token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = createServiceRoleClient();

  if (req.method === 'GET') {
    try {
      const { data: workshops, error } = await supabase
        .from('workshops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        log.error('Error fetching workshops', error);
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(200).json({ workshops: workshops || [] });
    } catch (error) {
      log.error('Error in GET workshops', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const parsed = createWorkshopSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }

      // Build workshop data with description for backward-compat with base schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workshopData: Record<string, any> = {
        ...parsed.data,
        description: parsed.data.short_abstract, // maps to base schema's description
        enrolled_count: 0,
        metadata: {},
      };

      // If instructor_id is provided, fetch speaker data
      if (parsed.data.instructor_id) {
        const { data: speaker } = await supabase
          .from('cfp_speakers')
          .select('first_name, last_name, profile_image_url, bio, company, job_title, linkedin_url, github_url, twitter_handle')
          .eq('id', parsed.data.instructor_id)
          .single();

        if (speaker) {
          workshopData.instructor_name = `${speaker.first_name} ${speaker.last_name}`;
          workshopData.instructor_avatar_url = speaker.profile_image_url;
          workshopData.instructor_bio = speaker.bio;
          workshopData.instructor_company = speaker.company;
          workshopData.instructor_job_title = speaker.job_title;
          workshopData.instructor_linkedin_url = speaker.linkedin_url;
          workshopData.instructor_github_url = speaker.github_url;
          workshopData.instructor_twitter_handle = speaker.twitter_handle;
        }
      }

      // Use type assertion - extended schema columns are added via migration
      const { data: workshop, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('workshops') as any)
        .insert([workshopData])
        .select()
        .single();

      if (error) {
        log.error('Error creating workshop', error);
        res.status(500).json({ error: error.message });
        return;
      }

      log.info('Workshop created', { workshopId: workshop.id, title: parsed.data.title });
      res.status(201).json({ workshop });
    } catch (error) {
      log.error('Error in POST workshop', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
