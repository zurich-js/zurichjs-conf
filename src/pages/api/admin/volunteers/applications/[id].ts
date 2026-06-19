/**
 * Admin Volunteer Application Detail API
 * GET: Get application by ID
 * PUT: Update application fields
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getApplicationById, updateApplicationNotes } from '@/lib/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Application API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await getApplicationById(id);
      if (error) return res.status(404).json({ error });
      return res.status(200).json({ application: data });
    }

    if (req.method === 'PUT') {
      const { internal_notes } = req.body;
      if (typeof internal_notes !== 'string') {
        return res.status(400).json({ error: 'internal_notes must be a string' });
      }

      const { success, error } = await updateApplicationNotes(id, internal_notes);
      if (!success) return res.status(400).json({ error });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
