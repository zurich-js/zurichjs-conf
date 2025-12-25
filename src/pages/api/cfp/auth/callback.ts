/**
 * CFP Auth Callback API
 * POST /api/cfp/auth/callback
 * Creates or links speaker profile after successful magic link authentication
 * Also sets the session cookies for server-side rendering
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateSpeaker, createSupabaseApiClient } from '@/lib/cfp/auth';
import { logger } from '@/lib/logger';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('CFP Auth Callback');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, access_token, refresh_token } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        error: 'Missing required fields: userId and email'
      });
    }

    // If tokens are provided, set the session on the server side to establish cookies
    if (access_token && refresh_token) {
      const supabase = createSupabaseApiClient(req, res);
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        log.warn('Session error during auth callback', { error: sessionError.message, userId });
        // Continue anyway - the speaker profile creation should still work
      }
    }

    // Get or create speaker profile
    const { speaker, error } = await getOrCreateSpeaker(userId, email);

    if (error || !speaker) {
      log.error('Failed to get or create speaker', error, { userId, email });
      return res.status(500).json({
        error: error || 'Failed to set up speaker profile'
      });
    }

    // Identify speaker in PostHog for analytics tracking
    await serverAnalytics.identify(speaker.id, {
      email: speaker.email,
      first_name: speaker.first_name || undefined,
      last_name: speaker.last_name || undefined,
      company: speaker.company || undefined,
      job_title: speaker.job_title || undefined,
    });

    // Track successful CFP login
    await serverAnalytics.track('cfp_speaker_authenticated', speaker.id, {
      speaker_id: speaker.id,
      is_new_speaker: !speaker.first_name, // New speakers don't have first name yet
      is_profile_complete: !!(speaker.first_name && speaker.last_name && speaker.bio),
    });

    log.info('Speaker authenticated successfully', {
      speakerId: speaker.id,
      email: speaker.email,
      isProfileComplete: !!(speaker.first_name && speaker.last_name && speaker.bio)
    });

    return res.status(200).json({
      success: true,
      speaker: {
        id: speaker.id,
        email: speaker.email,
        firstName: speaker.first_name,
        lastName: speaker.last_name,
        isProfileComplete: !!(speaker.first_name && speaker.last_name && speaker.bio)
      }
    });
  } catch (error) {
    log.error('Unexpected error in auth callback', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
