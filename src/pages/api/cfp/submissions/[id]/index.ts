/**
 * CFP Submission Detail API
 * GET /api/cfp/submissions/[id] - Get submission details
 * PUT /api/cfp/submissions/[id] - Update submission (draft only)
 * DELETE /api/cfp/submissions/[id] - Delete submission (draft only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import {
  getSubmissionWithDetails,
  updateSubmission,
  deleteSubmission,
} from '@/lib/cfp/submissions';
import { updateSubmissionSchema } from '@/lib/validations/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Submission API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  // Get session
  const supabase = createSupabaseApiClient(req, res);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker profile not found' });
  }

  if (req.method === 'GET') {
    try {
      const submission = await getSubmissionWithDetails(id);

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Verify ownership
      if (submission.speaker_id !== speaker.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.status(200).json({ submission });
    } catch (error) {
      log.error('Failed to get submission', error, { submissionId: id, speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      // Validate input
      const result = updateSubmissionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: result.error.issues,
        });
      }

      const { submission, error } = await updateSubmission(id, speaker.id, result.data);

      if (error) {
        return res.status(400).json({ error });
      }

      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      log.info('Submission updated', { submissionId: id, speakerId: speaker.id });
      return res.status(200).json({ submission });
    } catch (error) {
      log.error('Failed to update submission', error, { submissionId: id, speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { success, error } = await deleteSubmission(id, speaker.id);

      if (!success) {
        return res.status(400).json({ error: error || 'Failed to delete submission' });
      }

      log.info('Submission deleted', { submissionId: id, speakerId: speaker.id });
      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Failed to delete submission', error, { submissionId: id, speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
