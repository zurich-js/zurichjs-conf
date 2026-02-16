/**
 * CFP Speaker Attendance API
 * GET /api/cfp/attendance?token=xxx - Get attendance data by token
 * POST /api/cfp/attendance - Confirm or decline attendance
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Attendance API');

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

const attendanceResponseSchema = z.object({
  token: z.string().min(1),
  response: z.enum(['confirm', 'decline']),
  decline_reason: z.string().optional(),
  decline_notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - Get attendance data by token
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const supabase = createCfpServiceClient();

    // Find attendance record by token
    const { data: attendance, error: attendanceError } = await supabase
      .from('cfp_speaker_attendance')
      .select(`
        id,
        status,
        responded_at,
        token_expires_at,
        speaker:cfp_speakers(
          id,
          name,
          email
        ),
        submission:cfp_submissions(
          id,
          title,
          submission_type
        )
      `)
      .eq('confirmation_token', token)
      .single();

    if (attendanceError || !attendance) {
      log.warn('Attendance record not found', { token: token.substring(0, 8) + '...' });
      return res.status(404).json({ error: 'Invalid confirmation token' });
    }

    // Check if token has expired
    const tokenExpired = new Date(attendance.token_expires_at) < new Date();

    // Check if already responded
    const alreadyResponded = attendance.status !== 'pending';

    // Get speaker and submission data
    const speaker = Array.isArray(attendance.speaker) ? attendance.speaker[0] : attendance.speaker;
    const submission = Array.isArray(attendance.submission) ? attendance.submission[0] : attendance.submission;

    return res.status(200).json({
      speaker_name: speaker?.name || 'Speaker',
      talk_title: submission?.title || 'Your Talk',
      submission_type: submission?.submission_type || 'standard',
      status: attendance.status,
      token_valid: true,
      token_expired: tokenExpired,
      already_responded: alreadyResponded,
      responded_at: attendance.responded_at,
    });
  } catch (error) {
    log.error('Error fetching attendance data', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST - Confirm or decline attendance
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  // Validate request body
  const parseResult = attendanceResponseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parseResult.error.issues,
    });
  }

  const { token, response, decline_reason, decline_notes } = parseResult.data;

  try {
    const supabase = createCfpServiceClient();

    // Find attendance record by token
    const { data: attendance, error: attendanceError } = await supabase
      .from('cfp_speaker_attendance')
      .select('id, status, token_expires_at, submission_id')
      .eq('confirmation_token', token)
      .single();

    if (attendanceError || !attendance) {
      return res.status(404).json({ error: 'Invalid confirmation token' });
    }

    // Check if token has expired
    if (new Date(attendance.token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'This confirmation link has expired' });
    }

    // Check if already responded
    if (attendance.status !== 'pending') {
      return res.status(400).json({ error: 'You have already responded to this invitation' });
    }

    // Update attendance record
    const newStatus = response === 'confirm' ? 'confirmed' : 'declined';
    const updateData: Record<string, unknown> = {
      status: newStatus,
      responded_at: new Date().toISOString(),
      token_used_at: new Date().toISOString(),
    };

    if (response === 'decline') {
      updateData.decline_reason = decline_reason || null;
      updateData.decline_notes = decline_notes || null;
    }

    const { error: updateError } = await supabase
      .from('cfp_speaker_attendance')
      .update(updateData)
      .eq('id', attendance.id);

    if (updateError) {
      log.error('Failed to update attendance', { error: updateError.message });
      return res.status(500).json({ error: 'Failed to update attendance' });
    }

    log.info('Attendance response recorded', {
      attendance_id: attendance.id,
      response: newStatus,
    });

    return res.status(200).json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    log.error('Error processing attendance response', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
