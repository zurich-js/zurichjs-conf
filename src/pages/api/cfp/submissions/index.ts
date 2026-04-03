/**
 * CFP Submissions API
 * GET /api/cfp/submissions - List speaker's submissions
 * POST /api/cfp/submissions - Create new submission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionsBySpeakerId, createSubmission, getSubmissionCount } from '@/lib/cfp/submissions';
import { submissionSchema } from '@/lib/validations/cfp';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import { SUBMISSION_LIMITS } from '@/lib/cfp/config';
import { CFP_CLOSED_ERROR_CODE, canCreateSubmissionNow } from '@/lib/cfp/closure';

const log = logger.scope('CFP Submissions API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      const { submissions, error } = await getSubmissionsBySpeakerId(speaker.id);
      if (error) {
        return res.status(500).json({ error });
      }
      return res.status(200).json({ submissions });
    } catch (error) {
      log.error('Failed to fetch submissions', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      if (!canCreateSubmissionNow()) {
        return res.status(403).json({
          code: CFP_CLOSED_ERROR_CODE,
          error: 'CFP is closed. New submissions are no longer accepted.',
        });
      }

      // Check submission limit
      const count = await getSubmissionCount(speaker.id);
      if (count >= SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS) {
        return res.status(400).json({
          error: `Maximum ${SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS} submissions allowed`,
        });
      }

      // Validate input
      const result = submissionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: result.error.issues,
        });
      }

      // Create submission
      const { submission, error } = await createSubmission(speaker.id, result.data);

      if (error || !submission) {
        log.error('Failed to create submission', error, { speakerId: speaker.id });
        return res.status(500).json({
          error: error || 'Failed to create submission',
        });
      }

      // Track submission creation
      await serverAnalytics.track('cfp_submission_created', speaker.id, {
        submission_id: submission.id,
        submission_type: result.data.submission_type,
        submission_level: result.data.talk_level,
        speaker_id: speaker.id,
      });

      log.info('Submission created', {
        submissionId: submission.id,
        speakerId: speaker.id,
        type: result.data.submission_type,
      });

      return res.status(201).json({ submission });
    } catch (error) {
      log.error('Failed to create submission', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
