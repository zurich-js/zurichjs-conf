/**
 * CFP Speaker Profile API
 * GET/PUT /api/cfp/speaker
 * Get or update the current speaker's profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { updateSpeaker } from '@/lib/cfp/speakers';
import { speakerProfileSchema } from '@/lib/validations/cfp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Supabase client with request cookies
  const supabase = createSupabaseApiClient(req, res);

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get speaker profile
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker profile not found' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ speaker });
  }

  if (req.method === 'PUT') {
    try {
      // Validate input
      const result = speakerProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: result.error.issues,
        });
      }

      // Don't allow email changes through this endpoint
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, ...updates } = result.data;

      // Update speaker profile
      const { speaker: updatedSpeaker, error } = await updateSpeaker(speaker.id, updates);

      if (error || !updatedSpeaker) {
        return res.status(500).json({
          error: error || 'Failed to update profile',
        });
      }

      return res.status(200).json({
        success: true,
        speaker: updatedSpeaker,
      });
    } catch (error) {
      console.error('[CFP Speaker API] Update error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
