/**
 * Speaker Logistics Form API (speaker-facing, token-authenticated)
 * GET /api/speaker-logistics/[token] - Load the speaker's context for the form
 * PUT /api/speaker-logistics/[token] - Submit the speaker's event RSVPs (once)
 *
 * The token is a stateless HMAC minted per speaker (no login required).
 * A link is single-submission: once the speaker submits, the link is expired
 * for security (it travels by email and the answers include third-party
 * contact details). Later changes go through the team directly.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySpeakerLogisticsToken } from '@/lib/auth/speakerLogisticsToken';
import { createServiceRoleClient } from '@/lib/supabase';
import { speakerLogisticsSchema } from '@/lib/validations/speaker-logistics';
import { normalizeAnswers, buildAttendanceSummary } from '@/lib/speaker-logistics';
import { notifySpeakerLogisticsSubmitted } from '@/lib/platform-notifications';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import type { CfpTshirtSize } from '@/lib/types/cfp';

const log = logger.scope('Speaker Logistics API');

export interface SpeakerLogisticsSpeakerInfo {
  firstName: string;
  lastName: string;
  email: string;
  tshirtSize: CfpTshirtSize | null;
}

export interface SpeakerLogisticsFormResponse {
  speaker: SpeakerLogisticsSpeakerInfo;
  /** Once true the link is expired — the form can no longer be used */
  hasSubmitted: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const speakerId = verifySpeakerLogisticsToken(token);
    if (!speakerId) {
      return res.status(401).json({ error: 'Invalid or expired link' });
    }

    const supabase = createServiceRoleClient();

    const { data: speaker, error: speakerError } = await supabase
      .from('cfp_speakers')
      .select('id, first_name, last_name, email, tshirt_size')
      .eq('id', speakerId)
      .single();

    if (speakerError || !speaker) {
      log.error('Speaker not found for logistics token', speakerError, { speakerId });
      return res.status(404).json({ error: 'Speaker not found' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('cfp_speaker_logistics')
      .select('submitted_at')
      .eq('speaker_id', speakerId)
      .maybeSingle();

    if (existingError) {
      log.error('Error fetching speaker logistics', existingError, { speakerId });
      return res.status(500).json({ error: 'Failed to load your details' });
    }

    const speakerInfo: SpeakerLogisticsSpeakerInfo = {
      firstName: speaker.first_name,
      lastName: speaker.last_name,
      email: speaker.email,
      tshirtSize: (speaker.tshirt_size as CfpTshirtSize | null) ?? null,
    };

    const hasSubmitted = !!existing?.submitted_at;

    if (req.method === 'GET') {
      const response: SpeakerLogisticsFormResponse = {
        speaker: speakerInfo,
        hasSubmitted,
      };
      return res.status(200).json(response);
    }

    // PUT — one-shot submission; the link is expired afterwards for security
    if (hasSubmitted) {
      return res.status(410).json({
        error:
          'This link has already been used and is now expired for security reasons. To change your plans, email hello@zurichjs.com or message Faris, Nadja, or Bogdan.',
      });
    }

    const result = speakerLogisticsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const answers = normalizeAnswers(result.data);

    const { error: upsertError } = await supabase
      .from('cfp_speaker_logistics')
      .upsert(
        {
          speaker_id: speakerId,
          ...answers,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'speaker_id' }
      );

    if (upsertError) {
      log.error('Error saving speaker logistics', upsertError, { speakerId });
      return res.status(500).json({ error: 'Failed to save your details' });
    }

    // Backfill the speaker's t-shirt size when they provided one
    if (result.data.tshirt_size && result.data.tshirt_size !== speaker.tshirt_size) {
      const { error: tshirtError } = await supabase
        .from('cfp_speakers')
        .update({ tshirt_size: result.data.tshirt_size })
        .eq('id', speakerId);

      if (tshirtError) {
        // The logistics answers are already saved; log and continue
        log.error('Failed to update speaker t-shirt size', tshirtError, { speakerId });
      } else {
        speakerInfo.tshirtSize = result.data.tshirt_size;
      }
    }

    notifySpeakerLogisticsSubmitted({
      speakerId,
      speakerName: `${speaker.first_name} ${speaker.last_name}`.trim(),
      speakerEmail: speaker.email,
      attendanceSummary: buildAttendanceSummary(answers),
      dietaryRestrictions: answers.dietary_restrictions,
      adminUrl: `${getBaseUrl()}/admin/speakers`,
    });

    const response: SpeakerLogisticsFormResponse = {
      speaker: speakerInfo,
      hasSubmitted: true,
    };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error handling speaker logistics request', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
