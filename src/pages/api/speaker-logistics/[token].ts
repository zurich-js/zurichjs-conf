/**
 * Speaker Logistics Form API (speaker-facing, token-authenticated)
 * GET /api/speaker-logistics/[token] - Load the speaker's context + saved answers
 * PUT /api/speaker-logistics/[token] - Save the speaker's event RSVPs and details
 *
 * The token is a stateless HMAC minted per speaker (no login required).
 * Changes made after the first submission fire Slack alerts so the team hears
 * about last-minute cancellations before the food order does.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySpeakerLogisticsToken } from '@/lib/auth/speakerLogisticsToken';
import { createServiceRoleClient } from '@/lib/supabase';
import { speakerLogisticsSchema } from '@/lib/validations/speaker-logistics';
import { normalizeAnswers, diffAnswers, buildAttendanceSummary } from '@/lib/speaker-logistics';
import {
  notifySpeakerLogisticsSubmitted,
  notifySpeakerLogisticsChanged,
} from '@/lib/platform-notifications';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import type { SpeakerLogisticsAnswers } from '@/lib/types/speaker-logistics';
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
  logistics: (SpeakerLogisticsAnswers & { submitted_at: string | null }) | null;
}

// Kept as a single literal so the Supabase client can infer the row type
const ANSWER_COLUMNS =
  'attending_warmup, attending_speakers_dinner, attending_after_party, attending_speaker_hangout, dietary_restrictions, dinner_plus_one, dinner_plus_one_dietary_restrictions, after_party_plus_one, after_party_plus_one_first_name, after_party_plus_one_last_name, after_party_plus_one_email, talk_special_accommodations, submitted_at' as const;

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
      .select(ANSWER_COLUMNS)
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

    if (req.method === 'GET') {
      const response: SpeakerLogisticsFormResponse = {
        speaker: speakerInfo,
        logistics: existing ?? null,
      };
      return res.status(200).json(response);
    }

    // PUT — save answers
    const result = speakerLogisticsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const answers = normalizeAnswers(result.data);
    const isFirstSubmission = !existing?.submitted_at;
    const submittedAt = existing?.submitted_at ?? new Date().toISOString();

    const { data: saved, error: upsertError } = await supabase
      .from('cfp_speaker_logistics')
      .upsert(
        {
          speaker_id: speakerId,
          ...answers,
          submitted_at: submittedAt,
        },
        { onConflict: 'speaker_id' }
      )
      .select(ANSWER_COLUMNS)
      .single();

    if (upsertError || !saved) {
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

    const speakerName = `${speaker.first_name} ${speaker.last_name}`.trim();
    const adminUrl = `${getBaseUrl()}/admin/speakers`;

    if (isFirstSubmission) {
      notifySpeakerLogisticsSubmitted({
        speakerId,
        speakerName,
        speakerEmail: speaker.email,
        attendanceSummary: buildAttendanceSummary(answers),
        dietaryRestrictions: answers.dietary_restrictions,
        adminUrl,
      });
    } else if (existing) {
      const diff = diffAnswers(existing, answers);
      if (diff.hasChanges) {
        notifySpeakerLogisticsChanged({
          speakerId,
          speakerName,
          speakerEmail: speaker.email,
          cancellations: diff.cancellations,
          otherChanges: diff.otherChanges,
          adminUrl,
        });
      }
    }

    const response: SpeakerLogisticsFormResponse = {
      speaker: speakerInfo,
      logistics: saved,
    };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error handling speaker logistics request', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
