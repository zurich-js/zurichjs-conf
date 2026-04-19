/**
 * CFP Admin Bulk Decision API
 * POST /api/admin/cfp/submissions/bulk-decision
 *
 * Creates decision records (accept/reject) for multiple submissions at once.
 * Emails are NOT sent here — use schedule-email per submission afterwards.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { bulkMakeDecision } from '@/lib/cfp/decisions';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Bulk Decision API');

const bulkDecisionSchema = z.object({
  submission_ids: z.array(z.string().uuid()).min(1).max(200),
  decision: z.enum(['accepted', 'rejected']),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = bulkDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  try {
    const { submission_ids, decision, notes } = parsed.data;

    const result = await bulkMakeDecision(submission_ids, decision, 'admin', {
      notes,
      // Do not send emails or generate coupons here — handled per-submission
      send_email: false,
    });

    log.info('Bulk decision completed', {
      decision,
      total: submission_ids.length,
      success: result.success,
      failed: result.failed,
    });

    return res.status(200).json(result);
  } catch (error) {
    log.error('Error processing bulk decision', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
