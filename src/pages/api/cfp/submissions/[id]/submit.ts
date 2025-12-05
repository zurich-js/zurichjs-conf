/**
 * Submit Submission API
 * POST /api/cfp/submissions/[id]/submit - Submit a draft for review
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId, isSpeakerProfileComplete } from '@/lib/cfp/auth';
import { submitForReview, getSubmissionById } from '@/lib/cfp/submissions';

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

  // Check if profile is complete
  if (!isSpeakerProfileComplete(speaker)) {
    return res.status(400).json({
      error: 'Please complete your profile before submitting',
    });
  }

  try {
    // Verify submission exists and belongs to speaker
    const submission = await getSubmissionById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.speaker_id !== speaker.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Submit for review
    const { success, error } = await submitForReview(id, speaker.id);

    if (!success) {
      return res.status(400).json({ error: error || 'Failed to submit' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[CFP Submit API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
