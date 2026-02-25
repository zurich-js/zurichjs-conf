/**
 * CFP Admin Speaker API
 * GET /api/admin/cfp/speakers/[id] - Get speaker details
 * PUT /api/admin/cfp/speakers/[id] - Update speaker profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { env } from '@/config/env';
import type { CfpSpeaker, UpdateCfpSpeakerRequest } from '@/lib/types/cfp';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Speaker API');

function createCfpServiceClient() {
  return createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  const supabase = createCfpServiceClient();

  if (req.method === 'GET') {
    try {
      const { data: speaker, error } = await supabase
        .from('cfp_speakers')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !speaker) {
        return res.status(404).json({ error: 'Speaker not found' });
      }

      // Also fetch submission count
      const { count: submissionCount } = await supabase
        .from('cfp_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('speaker_id', id);

      // Fetch submission statuses
      const { data: submissions } = await supabase
        .from('cfp_submissions')
        .select('id, title, status, submission_type')
        .eq('speaker_id', id)
        .order('created_at', { ascending: false });

      return res.status(200).json({
        speaker: speaker as CfpSpeaker,
        submissionCount: submissionCount || 0,
        submissions: submissions || [],
      });
    } catch (error) {
      log.error('Error fetching speaker', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const updates: UpdateCfpSpeakerRequest = req.body;

      // Validate and sanitize updates
      const allowedFields = [
        'first_name',
        'last_name',
        'job_title',
        'company',
        'bio',
        'linkedin_url',
        'github_url',
        'twitter_handle',
        'bluesky_handle',
        'mastodon_handle',
        'profile_image_url',
        'is_visible',
        'is_featured',
      ];

      const sanitizedUpdates: Record<string, string | boolean | null> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          sanitizedUpdates[key] = value === '' ? null : value;
        }
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Add updated_at timestamp
      sanitizedUpdates.updated_at = new Date().toISOString();

      const { data: speaker, error } = await supabase
        .from('cfp_speakers')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        log.error('Error updating speaker', error, { speakerId: id });
        return res.status(500).json({ error: 'Failed to update speaker' });
      }

      log.info('Speaker updated', { speakerId: id });
      return res.status(200).json({ speaker: speaker as CfpSpeaker });
    } catch (error) {
      log.error('Error updating speaker', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // First check if speaker has any submissions
      const { count: submissionCount } = await supabase
        .from('cfp_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('speaker_id', id);

      if (submissionCount && submissionCount > 0) {
        return res.status(400).json({
          error: `Cannot delete speaker with ${submissionCount} submission(s). Delete submissions first.`,
        });
      }

      // Delete the speaker
      const { error } = await supabase
        .from('cfp_speakers')
        .delete()
        .eq('id', id);

      if (error) {
        log.error('Error deleting speaker', error, { speakerId: id });
        return res.status(500).json({ error: 'Failed to delete speaker' });
      }

      log.info('Speaker deleted', { speakerId: id });
      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Error deleting speaker', error, { speakerId: id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
