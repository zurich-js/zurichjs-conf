/**
 * Admin Activity Guest CRUD API
 * PUT /api/admin/speaker-logistics/guests/[id] - Update an activity guest
 * DELETE /api/admin/speaker-logistics/guests/[id] - Remove an activity guest
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { activityGuestSchema } from '@/lib/validations/speaker-logistics';
import { normalizeActivityGuest } from '@/lib/speaker-logistics';
import { logger } from '@/lib/logger';
import { GUEST_SELECT } from './index';

const log = logger.scope('Admin Activity Guest CRUD API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Guest ID is required' });
  }

  const supabase = createServiceRoleClient();

  if (req.method === 'PUT') {
    const result = activityGuestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    }

    try {
      const { data, error } = await supabase
        .from('speaker_activity_guests')
        .update(normalizeActivityGuest(result.data))
        .eq('id', id)
        .select(GUEST_SELECT)
        .maybeSingle();

      if (error) {
        log.error('Error updating activity guest', error, { guestId: id });
        return res.status(500).json({ error: 'Failed to update guest' });
      }
      if (!data) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      log.info('Activity guest updated', { guestId: id, activity: data.activity });
      return res.status(200).json({ guest: data });
    } catch (error) {
      log.error('Error updating activity guest', error, { guestId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('speaker_activity_guests').delete().eq('id', id);

      if (error) {
        log.error('Error deleting activity guest', error, { guestId: id });
        return res.status(500).json({ error: 'Failed to delete guest' });
      }

      log.info('Activity guest deleted', { guestId: id });
      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Error deleting activity guest', error, { guestId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
