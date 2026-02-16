/**
 * CFP Speaker Attendance Confirm API (Session-based)
 * POST /api/cfp/attendance/confirm - Confirm or decline attendance for logged-in speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';

const log = logger.scope('CFP Attendance Confirm API');

function createCfpServiceClient() {
  return createClient(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

const confirmSchema = z.object({
  submission_id: z.string().uuid(),
  response: z.enum(['confirm', 'decline']).optional().default('confirm'),
  decline_reason: z.string().optional(),
  decline_notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const supabaseServer = createSupabaseApiClient(req, res);
    const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get speaker profile
    const speaker = await getSpeakerByUserId(session.user.id);
    if (!speaker) {
      return res.status(401).json({ error: 'Speaker profile not found' });
    }

    // Validate request body
    const parseResult = confirmSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parseResult.error.issues,
      });
    }

    const { submission_id, response, decline_reason, decline_notes } = parseResult.data;

    const supabase = createCfpServiceClient();

    // Verify the submission belongs to this speaker and is accepted
    const { data: submission, error: subError } = await supabase
      .from('cfp_submissions')
      .select('id, status, speaker_id')
      .eq('id', submission_id)
      .eq('speaker_id', speaker.id)
      .single();

    if (subError || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted submissions can have attendance confirmed' });
    }

    // Upsert attendance record
    const newStatus = response === 'confirm' ? 'confirmed' : 'declined';
    const updateData: Record<string, unknown> = {
      speaker_id: speaker.id,
      submission_id,
      status: newStatus,
      responded_at: new Date().toISOString(),
    };

    if (response === 'decline') {
      updateData.decline_reason = decline_reason || null;
      updateData.decline_notes = decline_notes || null;
    }

    // Check if attendance record exists
    const { data: existingAttendance } = await supabase
      .from('cfp_speaker_attendance')
      .select('id')
      .eq('speaker_id', speaker.id)
      .eq('submission_id', submission_id)
      .single();

    if (existingAttendance) {
      // Update existing
      const { error: updateError } = await supabase
        .from('cfp_speaker_attendance')
        .update(updateData)
        .eq('id', existingAttendance.id);

      if (updateError) {
        log.error('Failed to update attendance', { error: updateError.message });
        return res.status(500).json({ error: 'Failed to update attendance' });
      }
    } else {
      // Create new with a placeholder token (since this is session-based, not token-based)
      const { error: insertError } = await supabase
        .from('cfp_speaker_attendance')
        .insert({
          ...updateData,
          confirmation_token: `session-${speaker.id}-${submission_id}`,
          token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Far future
        });

      if (insertError) {
        log.error('Failed to create attendance', { error: insertError.message });
        return res.status(500).json({ error: 'Failed to create attendance record' });
      }
    }

    log.info('Attendance confirmed via dashboard', {
      speaker_id: speaker.id,
      submission_id,
      response: newStatus,
    });

    return res.status(200).json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    log.error('Error processing attendance confirmation', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
