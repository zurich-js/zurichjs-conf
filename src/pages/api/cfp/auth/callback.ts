/**
 * CFP Auth Callback API
 * Creates/links speaker profile after client-side authentication (implicit flow)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getOrCreateSpeaker, createSupabaseApiClient } from '@/lib/cfp/auth';
import { serverAnalytics } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { notifyCfpSpeakerProfileCreated } from '@/lib/platform-notifications';

const log = logger.scope('CFP Auth Callback API');

const requestSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { userId, email } = parsed.data;

    // Verify the user is actually authenticated
    const supabase = createSupabaseApiClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log.warn('Unauthorized callback request', { userId, email });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the user ID matches
    if (user.id !== userId) {
      log.warn('User ID mismatch in callback', { claimedUserId: userId, actualUserId: user.id });
      return res.status(403).json({ error: 'User ID mismatch' });
    }

    // Get or create speaker profile
    const { speaker, error: speakerError } = await getOrCreateSpeaker(userId, email);

    if (speakerError || !speaker) {
      log.error('Failed to get or create speaker', { userId, email, error: speakerError });
      serverAnalytics.captureException(new Error(speakerError || 'Failed to create speaker'), {
        distinctId: userId,
        type: 'auth',
        severity: 'high',
        flow: 'cfp_speaker_auth_callback_api',
        action: 'get_or_create_speaker',
        email,
      });
      return res.status(500).json({ error: speakerError || 'Failed to set up speaker profile' });
    }

    // Track successful authentication
    await serverAnalytics.identify(speaker.id, {
      email: speaker.email,
      first_name: speaker.first_name || undefined,
      last_name: speaker.last_name || undefined,
    });

    const isNewSpeaker = !speaker.first_name;

    await serverAnalytics.track('cfp_speaker_authenticated', speaker.id, {
      speaker_id: speaker.id,
      is_new_speaker: isNewSpeaker,
      is_profile_complete: !!(speaker.first_name && speaker.last_name && speaker.bio),
    });

    // Send Slack notification for new speaker profiles
    if (isNewSpeaker) {
      notifyCfpSpeakerProfileCreated({
        speakerId: speaker.id,
        speakerName: speaker.email,
        speakerEmail: speaker.email,
      });
    }

    log.info('Speaker authenticated via implicit flow', { speakerId: speaker.id, email: speaker.email });

    return res.status(200).json({
      success: true,
      speaker: {
        id: speaker.id,
        email: speaker.email,
        firstName: speaker.first_name,
        lastName: speaker.last_name,
      },
    });
  } catch (error) {
    log.error('Unexpected error in auth callback API', error);
    serverAnalytics.captureException(error, {
      type: 'auth',
      severity: 'critical',
      flow: 'cfp_speaker_auth_callback_api',
      action: 'unexpected_error',
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
