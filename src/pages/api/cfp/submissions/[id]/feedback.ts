/**
 * Speaker Feedback Request API
 * POST /api/cfp/submissions/[id]/feedback - Email organizers that a speaker wants feedback
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { sendCfpFeedbackRequestEmail } from '@/lib/email';

const log = logger.scope('CFP Feedback API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning Talk',
  standard: 'Standard Talk',
  workshop: 'Workshop',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
      .select('id, speaker_id, title, status, submission_type, submitted_at, decision_email_sent_at')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.speaker_id !== speaker.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow feedback requests for rejected submissions where the email has been sent
    if (submission.status !== 'rejected' || !submission.decision_email_sent_at) {
      return res.status(400).json({ error: 'Feedback requests are not available for this submission' });
    }

    // Send email to organizers (reply-to set to speaker's email)
    const emailResult = await sendCfpFeedbackRequestEmail({
      speakerName: `${speaker.first_name} ${speaker.last_name}`,
      speakerEmail: speaker.email,
      talkTitle: submission.title,
      submissionType: TYPE_LABELS[submission.submission_type] || submission.submission_type,
      submittedAt: submission.submitted_at
        ? new Date(submission.submitted_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : undefined,
    });

    if (!emailResult.success) {
      log.error('Failed to send feedback request email', { error: emailResult.error, submissionId: id });
      return res.status(500).json({ error: 'Failed to send feedback request' });
    }

    log.info('Feedback requested', {
      submissionId: id,
      speakerId: speaker.id,
      title: submission.title,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Failed to request feedback', error, { submissionId: id });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
