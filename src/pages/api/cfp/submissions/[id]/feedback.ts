/**
 * Speaker Feedback Request API
 * GET /api/cfp/submissions/[id]/feedback - Get reviewer feedback for a rejected submission
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Feedback API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    const cfpClient = createCfpServiceClient();

    // Get submission and verify ownership
    const { data: submission, error: fetchError } = await cfpClient
      .from('cfp_submissions')
      .select('id, speaker_id, status, decision_status, decision_email_sent_at')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.speaker_id !== speaker.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow feedback for rejected submissions where the email has been sent
    if (submission.status !== 'rejected' || !submission.decision_email_sent_at) {
      return res.status(400).json({ error: 'Feedback is not available for this submission' });
    }

    // Fetch reviewer feedback (only the feedback_to_speaker field, anonymized)
    const { data: reviews, error: reviewsError } = await cfpClient
      .from('cfp_reviews')
      .select('feedback_to_speaker')
      .eq('submission_id', id)
      .not('feedback_to_speaker', 'is', null);

    if (reviewsError) {
      log.error('Failed to fetch reviews', { error: reviewsError.message, submissionId: id });
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    const feedback = (reviews || [])
      .map((r: { feedback_to_speaker: string | null }) => r.feedback_to_speaker)
      .filter((f: string | null): f is string => !!f && f.trim().length > 0);

    return res.status(200).json({ feedback });
  } catch (error) {
    log.error('Failed to get feedback', error, { submissionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
