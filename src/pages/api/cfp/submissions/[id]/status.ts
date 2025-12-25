/**
 * Submission Status Update API
 * PUT /api/cfp/submissions/[id]/status - Update submission status (super_admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getReviewerByUserId } from '@/lib/cfp/auth';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('CFP Status API');

const VALID_STATUSES = ['submitted', 'under_review', 'shortlisted', 'waitlisted', 'accepted', 'rejected'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing submission ID' });
  }

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    // Authenticate user
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is a super_admin reviewer
    const reviewer = await getReviewerByUserId(user.id);

    if (!reviewer || reviewer.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can change submission status' });
    }

    // Update the submission status
    const serviceClient = createCfpServiceClient();

    const { data: submission, error: fetchError } = await serviceClient
      .from('cfp_submissions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Don't allow changing from accepted/rejected back to earlier states without explicit confirmation
    // (This is just a soft warning for now - in production you might want stricter rules)

    const { error: updateError } = await serviceClient
      .from('cfp_submissions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      log.error('Failed to update submission status', updateError, { submissionId: id, status });
      return res.status(500).json({ error: 'Failed to update status' });
    }

    // Track status change
    await serverAnalytics.track('cfp_submission_status_changed', reviewer.id, {
      submission_id: id,
      submission_title: '', // We don't have title in this query
      old_status: submission.status,
      new_status: status,
      changed_by: reviewer.email,
    });

    log.info('Submission status changed', {
      submissionId: id,
      previousStatus: submission.status,
      newStatus: status,
      changedBy: reviewer.email,
    });

    return res.status(200).json({
      success: true,
      previousStatus: submission.status,
      newStatus: status,
    });
  } catch (error) {
    log.error('Failed to update status', error, { submissionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
