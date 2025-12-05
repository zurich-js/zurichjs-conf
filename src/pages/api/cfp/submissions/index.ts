/**
 * CFP Submissions API
 * GET /api/cfp/submissions - List speaker's submissions
 * POST /api/cfp/submissions - Create new submission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSubmissionsBySpeakerId, createSubmission, getSubmissionCount } from '@/lib/cfp/submissions';
import { submissionSchema } from '@/lib/validations/cfp';

const MAX_SUBMISSIONS = 5;

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
      const submissions = await getSubmissionsBySpeakerId(speaker.id);
      return res.status(200).json({ submissions });
    } catch (error) {
      console.error('[CFP Submissions API] GET error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      // Check submission limit
      const count = await getSubmissionCount(speaker.id);
      if (count >= MAX_SUBMISSIONS) {
        return res.status(400).json({
          error: `Maximum ${MAX_SUBMISSIONS} submissions allowed`,
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
        return res.status(500).json({
          error: error || 'Failed to create submission',
        });
      }

      return res.status(201).json({ submission });
    } catch (error) {
      console.error('[CFP Submissions API] POST error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
