/**
 * CFP Speaker Profile API
 * GET/PUT /api/cfp/speaker
 * Get or update the current speaker's profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { isSpeakerProfileComplete } from '@/lib/cfp/auth-constants';
import { updateSpeaker } from '@/lib/cfp/speakers';
import { speakerProfileSchema } from '@/lib/validations/cfp';
import { apiUnauthorized, apiValidationError, apiServerError, apiMethodNotAllowed, apiError } from '@/lib/api/responses';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';
import { notifyCfpSpeakerProfileCompleted } from '@/lib/platform-notifications';

const log = logger.scope('CFP Speaker API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Supabase client with request cookies
  const supabase = createSupabaseApiClient(req, res);

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return apiUnauthorized(res);
  }

  // Get speaker profile
  const speaker = await getSpeakerByUserId(session.user.id);

  if (!speaker) {
    return apiError(res, 404, 'Speaker profile not found');
  }

  if (req.method === 'GET') {
    return res.status(200).json({ speaker });
  }

  if (req.method === 'PUT') {
    try {
      // Validate input
      const result = speakerProfileSchema.safeParse(req.body);
      if (!result.success) {
        return apiValidationError(res, result.error);
      }

      // Don't allow email changes through this endpoint
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { email: _email, ...updates } = result.data;

      // Check if profile was complete before update
      const wasComplete = isSpeakerProfileComplete(speaker);

      // Update speaker profile
      const { speaker: updatedSpeaker, error } = await updateSpeaker(speaker.id, updates);

      if (error || !updatedSpeaker) {
        return res.status(500).json({
          error: error || 'Failed to update profile',
        });
      }

      // Update user identification in PostHog
      await serverAnalytics.identify(speaker.id, {
        email: speaker.email,
        first_name: updatedSpeaker.first_name || undefined,
        last_name: updatedSpeaker.last_name || undefined,
        company: updatedSpeaker.company || undefined,
        job_title: updatedSpeaker.job_title || undefined,
      });

      // Send Slack notification when profile becomes complete for the first time
      const isNowComplete = isSpeakerProfileComplete(updatedSpeaker);
      if (!wasComplete && isNowComplete) {
        notifyCfpSpeakerProfileCompleted({
          speakerId: updatedSpeaker.id,
          speakerName: `${updatedSpeaker.first_name} ${updatedSpeaker.last_name}`,
          speakerEmail: updatedSpeaker.email,
        });
      }

      log.info('Speaker profile updated', { speakerId: speaker.id });

      return res.status(200).json({
        success: true,
        speaker: updatedSpeaker,
      });
    } catch (error) {
      log.error('Failed to update speaker profile', error, { speakerId: speaker.id });
      return apiServerError(res);
    }
  }

  return apiMethodNotAllowed(res);
}
