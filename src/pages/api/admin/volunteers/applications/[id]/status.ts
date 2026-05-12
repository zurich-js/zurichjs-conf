/**
 * Admin Volunteer Application Status API
 * POST: Change application status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { updateApplicationStatus, getApplicationById } from '@/lib/volunteer';
import { getAvailableApplicationTransitions } from '@/lib/volunteer/status';
import { volunteerApplicationStatusSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Application Status API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    // Validate request
    const parsed = volunteerApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    // Fetch current application to check valid transition
    const { data: current, error: fetchError } = await getApplicationById(id);
    if (fetchError || !current) {
      return res.status(404).json({ error: fetchError || 'Application not found' });
    }

    // Validate status transition
    const validTransitions = getAvailableApplicationTransitions(current.status);
    if (!validTransitions.includes(parsed.data.status)) {
      return res.status(400).json({
        error: `Cannot transition from "${current.status}" to "${parsed.data.status}"`,
      });
    }

    // Update status
    const { data, error } = await updateApplicationStatus(id, parsed.data.status);
    if (error) return res.status(400).json({ error });

    // Update internal notes if provided
    if (parsed.data.internal_notes) {
      const { updateApplicationNotes } = await import('@/lib/volunteer');
      await updateApplicationNotes(id, parsed.data.internal_notes);
    }

    log.info('Application status changed', {
      applicationId: id,
      from: current.status,
      to: parsed.data.status,
    });

    return res.status(200).json({ application: data });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
