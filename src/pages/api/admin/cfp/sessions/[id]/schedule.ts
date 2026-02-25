/**
 * CFP Admin Session Schedule API
 * PUT /api/admin/cfp/sessions/[id]/schedule - Update session scheduling
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { updateSessionSchedule } from '@/lib/cfp/speakers';
import { verifyAdminAccess } from '@/lib/admin/auth';
import type { AdminUpdateSessionScheduleRequest } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Session Schedule API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const data: AdminUpdateSessionScheduleRequest = req.body;

    // Validate date format if provided
    if (data.scheduled_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.scheduled_date)) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Validate time format if provided
    if (data.scheduled_start_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(data.scheduled_start_time)) {
      return res.status(400).json({
        error: 'Invalid time format. Use HH:MM or HH:MM:SS',
      });
    }

    // Validate duration if provided
    if (data.scheduled_duration_minutes !== undefined && data.scheduled_duration_minutes !== null) {
      if (typeof data.scheduled_duration_minutes !== 'number' || data.scheduled_duration_minutes < 1) {
        return res.status(400).json({
          error: 'Duration must be a positive number',
        });
      }
    }

    const { success, error } = await updateSessionSchedule(id, {
      scheduled_date: data.scheduled_date,
      scheduled_start_time: data.scheduled_start_time,
      scheduled_duration_minutes: data.scheduled_duration_minutes,
      room: data.room,
    });

    if (!success) {
      return res.status(400).json({ error: error || 'Failed to update schedule' });
    }

    log.info('Session schedule updated', { sessionId: id });
    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error updating session schedule', error, { sessionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
