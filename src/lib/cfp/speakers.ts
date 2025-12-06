/**
 * CFP Speaker Operations
 * CRUD operations for speaker profiles
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { CfpSpeaker, UpdateCfpSpeakerRequest } from '@/lib/types/cfp';

/**
 * Create an untyped service role client for CFP tables
 * The CFP tables are not in the generated types yet
 */
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

/**
 * Get speaker by ID
 */
export async function getSpeakerById(speakerId: string): Promise<CfpSpeaker | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speakers')
    .select('*')
    .eq('id', speakerId)
    .single();

  if (error || !data) {
    console.error('[CFP Speakers] Error fetching speaker:', error?.message);
    return null;
  }

  return data as CfpSpeaker;
}

/**
 * Update speaker profile
 */
export async function updateSpeaker(
  speakerId: string,
  updates: UpdateCfpSpeakerRequest
): Promise<{ speaker: CfpSpeaker | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // Filter out undefined values and empty strings for optional URL fields
  const cleanedUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      // Convert empty strings to null for URL fields
      if (['linkedin_url', 'github_url'].includes(key) && value === '') {
        cleanedUpdates[key] = null;
      } else {
        cleanedUpdates[key] = value;
      }
    }
  }

  const { data, error } = await supabase
    .from('cfp_speakers')
    .update(cleanedUpdates)
    .eq('id', speakerId)
    .select()
    .single();

  if (error) {
    console.error('[CFP Speakers] Error updating speaker:', error.message);
    return { speaker: null, error: error.message };
  }

  return { speaker: data as CfpSpeaker };
}

/**
 * Get all speakers (admin)
 */
export async function getAllSpeakers(): Promise<CfpSpeaker[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speakers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CFP Speakers] Error fetching speakers:', error.message);
    return [];
  }

  return (data || []) as CfpSpeaker[];
}

/**
 * Get speakers with accepted submissions (for public display)
 */
export async function getAcceptedSpeakers(): Promise<CfpSpeaker[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_speakers')
    .select(`
      *,
      cfp_submissions!inner (
        id,
        status
      )
    `)
    .eq('cfp_submissions.status', 'accepted');

  if (error) {
    console.error('[CFP Speakers] Error fetching accepted speakers:', error.message);
    return [];
  }

  return (data || []) as CfpSpeaker[];
}

/**
 * Delete speaker (admin only)
 */
export async function deleteSpeaker(speakerId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speakers')
    .delete()
    .eq('id', speakerId);

  if (error) {
    console.error('[CFP Speakers] Error deleting speaker:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Upload speaker profile image
 */
export async function uploadSpeakerImage(
  speakerId: string,
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string | null; error?: string }> {
  const supabase = createCfpServiceClient();

  const filePath = `speakers/${speakerId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('cfp-images')
    .upload(filePath, file, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error('[CFP Speakers] Error uploading image:', uploadError.message);
    return { url: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('cfp-images')
    .getPublicUrl(filePath);

  // Update speaker profile with new image URL
  const { error: updateError } = await supabase
    .from('cfp_speakers')
    .update({ profile_image_url: urlData.publicUrl })
    .eq('id', speakerId);

  if (updateError) {
    console.error('[CFP Speakers] Error updating image URL:', updateError.message);
    return { url: null, error: updateError.message };
  }

  return { url: urlData.publicUrl };
}
