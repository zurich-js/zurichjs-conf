/**
 * Admin Speaker Logistics Request API
 * POST /api/admin/speaker-logistics/remind - Bulk-send speakers their unique
 * event-logistics form link. Successful sends stamp
 * cfp_speaker_logistics.request_sent_at.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { generateSpeakerLogisticsUrl } from '@/lib/auth/speakerLogisticsToken';
import { sendSpeakerLogisticsRequestEmailsQueued, type SpeakerLogisticsRequestData } from '@/lib/email';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Speaker Logistics Remind API');

// Bulk sends are rate limited to ~1.67 emails/sec, so large batches need time
export const config = {
  maxDuration: 300,
};

const remindSchema = z.object({
  speakerIds: z.array(z.string().uuid()).min(1).max(200),
  customMessage: z.string().max(2000).optional(),
});

export interface SendSpeakerLogisticsRequestsResponse {
  success: boolean;
  requested: number;
  sent: number;
  failed: number;
  failures: Array<{ speakerId: string; email: string; error?: string }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = remindSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const { speakerIds, customMessage } = result.data;
    const supabase = createServiceRoleClient();

    const [speakersResult, logisticsResult] = await Promise.all([
      supabase
        .from('cfp_speakers')
        .select('id, first_name, last_name, email')
        .in('id', speakerIds),
      supabase
        .from('cfp_speaker_logistics')
        .select('speaker_id, submitted_at')
        .in('speaker_id', speakerIds),
    ]);

    if (speakersResult.error) {
      log.error('Error fetching speakers', speakersResult.error);
      return res.status(500).json({ error: 'Failed to fetch speakers' });
    }
    if (logisticsResult.error) {
      log.error('Error fetching speaker logistics', logisticsResult.error);
      return res.status(500).json({ error: 'Failed to fetch speaker logistics' });
    }

    const submittedBySpeaker = new Map(
      (logisticsResult.data ?? []).map((row) => [row.speaker_id, !!row.submitted_at])
    );

    const emails: SpeakerLogisticsRequestData[] = (speakersResult.data ?? []).map((speaker) => ({
      to: speaker.email,
      firstName: speaker.first_name,
      speakerId: speaker.id,
      logisticsUrl: generateSpeakerLogisticsUrl(speaker.id),
      hasSubmitted: submittedBySpeaker.get(speaker.id) ?? false,
      customMessage,
    }));

    const results = emails.length > 0 ? await sendSpeakerLogisticsRequestEmailsQueued(emails) : [];

    const sentSpeakerIds = results.filter((r) => r.success).map((r) => r.speakerId);
    if (sentSpeakerIds.length > 0) {
      const requestSentAt = new Date().toISOString();
      // Upsert so speakers without a logistics row yet get one with the stamp;
      // on conflict only the provided columns are updated, answers are untouched
      const { error: stampError } = await supabase
        .from('cfp_speaker_logistics')
        .upsert(
          sentSpeakerIds.map((speakerId) => ({ speaker_id: speakerId, request_sent_at: requestSentAt })),
          { onConflict: 'speaker_id' }
        );

      if (stampError) {
        // Emails went out; a failed stamp shouldn't fail the request
        log.error('Failed to stamp request_sent_at', stampError, {
          speakerIds: sentSpeakerIds,
        });
      }
    }

    const failed = results.filter((r) => !r.success);
    log.info('Speaker logistics request batch completed', {
      requested: speakerIds.length,
      sent: sentSpeakerIds.length,
      failed: failed.length,
    });

    const response: SendSpeakerLogisticsRequestsResponse = {
      success: true,
      requested: speakerIds.length,
      sent: sentSpeakerIds.length,
      failed: failed.length,
      failures: failed.map((f) => ({ speakerId: f.speakerId, email: f.email, error: f.error })),
    };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error sending speaker logistics requests', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
