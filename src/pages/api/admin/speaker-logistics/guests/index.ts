/**
 * Admin Activity Guests API
 * GET /api/admin/speaker-logistics/guests - List additional guests across the
 * speaker-week activities (plus ones, volunteers, complimentary, paid)
 * POST /api/admin/speaker-logistics/guests - Add a guest to an activity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { activityGuestSchema } from '@/lib/validations/speaker-logistics';
import { normalizeActivityGuest } from '@/lib/speaker-logistics';
import { logger } from '@/lib/logger';
import type { ActivityGuestRow } from '@/lib/types/speaker-logistics';

const log = logger.scope('Admin Activity Guests API');

/** Guest row joined with the speaker they are a plus one of (when set) */
export interface ActivityGuestAdminRow extends ActivityGuestRow {
  related_speaker: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface ActivityGuestsResponse {
  guests: ActivityGuestAdminRow[];
}

export const GUEST_SELECT = '*, related_speaker:cfp_speakers(id, first_name, last_name)';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createServiceRoleClient();

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('speaker_activity_guests')
        .select(GUEST_SELECT)
        .order('created_at', { ascending: true });

      if (error) {
        log.error('Error fetching activity guests', error);
        return res.status(500).json({ error: 'Failed to fetch activity guests' });
      }

      const response: ActivityGuestsResponse = { guests: data ?? [] };
      return res.status(200).json(response);
    } catch (error) {
      log.error('Error fetching activity guests', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const result = activityGuestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    }

    try {
      const { data, error } = await supabase
        .from('speaker_activity_guests')
        .insert(normalizeActivityGuest(result.data))
        .select(GUEST_SELECT)
        .single();

      if (error) {
        log.error('Error creating activity guest', error, { activity: result.data.activity });
        return res.status(500).json({ error: 'Failed to add guest' });
      }

      log.info('Activity guest added', {
        guestId: data.id,
        activity: data.activity,
        guestType: data.guest_type,
      });
      return res.status(201).json({ guest: data });
    } catch (error) {
      log.error('Error creating activity guest', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
