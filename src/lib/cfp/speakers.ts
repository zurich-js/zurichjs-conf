/**
 * CFP Speaker Operations
 * CRUD operations for speaker profiles
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type {
  CfpSpeaker,
  CfpSubmission,
  UpdateCfpSpeakerRequest,
  PublicSpeaker,
  PublicSession,
  AdminCreateSpeakerRequest,
  AdminCreateSessionRequest,
} from '@/lib/types/cfp';

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

/**
 * Get visible speakers with their accepted sessions for public display
 * Returns only speakers with is_visible=true who have at least one accepted submission
 */
export async function getVisibleSpeakersWithSessions(): Promise<PublicSpeaker[]> {
  const supabase = createCfpServiceClient();

  // Fetch visible speakers with their accepted submissions
  const { data, error } = await supabase
    .from('cfp_speakers')
    .select(`
      id,
      first_name,
      last_name,
      job_title,
      company,
      bio,
      profile_image_url,
      linkedin_url,
      github_url,
      twitter_handle,
      bluesky_handle,
      mastodon_handle,
      cfp_submissions (
        id,
        title,
        abstract,
        submission_type,
        talk_level,
        status,
        scheduled_date,
        scheduled_start_time,
        scheduled_duration_minutes,
        room
      )
    `)
    .eq('is_visible', true)
    .order('first_name', { ascending: true });

  if (error) {
    console.error('[CFP Speakers] Error fetching visible speakers:', error.message);
    return [];
  }

  // Define interface for submission data
  interface SubmissionData {
    id: string;
    title: string;
    abstract: string;
    submission_type: string;
    talk_level: string;
    status: string;
    scheduled_date: string | null;
    scheduled_start_time: string | null;
    scheduled_duration_minutes: number | null;
    room: string | null;
  }

  // Transform to public format and filter to only include speakers with accepted sessions
  const publicSpeakers: PublicSpeaker[] = [];

  for (const speaker of data || []) {
    // Filter to only accepted submissions
    const acceptedSessions = (speaker.cfp_submissions || [])
      .filter((s: SubmissionData) => s.status === 'accepted')
      .map((s: SubmissionData): PublicSession => ({
        id: s.id,
        title: s.title,
        abstract: s.abstract,
        type: s.submission_type as PublicSession['type'],
        level: s.talk_level as PublicSession['level'],
        schedule: s.scheduled_date || s.scheduled_start_time
          ? {
              date: s.scheduled_date,
              start_time: s.scheduled_start_time,
              duration_minutes: s.scheduled_duration_minutes,
              room: s.room,
            }
          : null,
      }));

    // Only include speakers with at least one accepted session
    if (acceptedSessions.length > 0) {
      publicSpeakers.push({
        id: speaker.id,
        first_name: speaker.first_name,
        last_name: speaker.last_name,
        job_title: speaker.job_title,
        company: speaker.company,
        bio: speaker.bio,
        profile_image_url: speaker.profile_image_url,
        socials: {
          linkedin_url: speaker.linkedin_url,
          github_url: speaker.github_url,
          twitter_handle: speaker.twitter_handle,
          bluesky_handle: speaker.bluesky_handle,
          mastodon_handle: speaker.mastodon_handle,
        },
        sessions: acceptedSessions,
      });
    }
  }

  return publicSpeakers;
}

/**
 * Update speaker visibility (admin only)
 */
export async function updateSpeakerVisibility(
  speakerId: string,
  isVisible: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_speakers')
    .update({ is_visible: isVisible })
    .eq('id', speakerId);

  if (error) {
    console.error('[CFP Speakers] Error updating visibility:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Create a speaker manually (admin only)
 * This bypasses the CFP flow for invited/confirmed speakers
 */
export async function createSpeaker(
  data: AdminCreateSpeakerRequest
): Promise<{ speaker: CfpSpeaker | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // Check if speaker with email already exists
  const { data: existingSpeaker } = await supabase
    .from('cfp_speakers')
    .select('id')
    .eq('email', data.email.toLowerCase())
    .single();

  if (existingSpeaker) {
    return { speaker: null, error: 'A speaker with this email already exists' };
  }

  const speakerData = {
    email: data.email.toLowerCase(),
    first_name: data.first_name,
    last_name: data.last_name,
    job_title: data.job_title || null,
    company: data.company || null,
    bio: data.bio || null,
    linkedin_url: data.linkedin_url || null,
    github_url: data.github_url || null,
    twitter_handle: data.twitter_handle || null,
    bluesky_handle: data.bluesky_handle || null,
    mastodon_handle: data.mastodon_handle || null,
    profile_image_url: data.profile_image_url || null,
    is_visible: data.is_visible ?? false,
  };

  const { data: speaker, error } = await supabase
    .from('cfp_speakers')
    .insert(speakerData)
    .select()
    .single();

  if (error) {
    console.error('[CFP Speakers] Error creating speaker:', error.message);
    return { speaker: null, error: error.message };
  }

  return { speaker: speaker as CfpSpeaker };
}

/**
 * Create a session for a speaker (admin only)
 * This allows admins to add talks/workshops without going through CFP
 */
export async function createSession(
  data: AdminCreateSessionRequest
): Promise<{ submission: CfpSubmission | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // Verify speaker exists
  const { data: speaker } = await supabase
    .from('cfp_speakers')
    .select('id')
    .eq('id', data.speaker_id)
    .single();

  if (!speaker) {
    return { submission: null, error: 'Speaker not found' };
  }

  const submissionData = {
    speaker_id: data.speaker_id,
    title: data.title,
    abstract: data.abstract,
    submission_type: data.submission_type,
    talk_level: data.talk_level,
    status: data.status || 'accepted', // Default to accepted for admin-created sessions
    // Scheduling
    scheduled_date: data.scheduled_date || null,
    scheduled_start_time: data.scheduled_start_time || null,
    scheduled_duration_minutes: data.scheduled_duration_minutes || null,
    room: data.room || null,
    // Workshop fields
    workshop_duration_hours: data.submission_type === 'workshop' ? (data.workshop_duration_hours || null) : null,
    workshop_max_participants: data.submission_type === 'workshop' ? (data.workshop_max_participants || null) : null,
    // Required fields with defaults
    travel_assistance_required: false,
    company_can_cover_travel: false,
    metadata: { created_by_admin: true },
  };

  const { data: submission, error } = await supabase
    .from('cfp_submissions')
    .insert(submissionData)
    .select()
    .single();

  if (error) {
    console.error('[CFP Speakers] Error creating session:', error.message);
    return { submission: null, error: error.message };
  }

  // Handle tags if provided
  if (data.tags && data.tags.length > 0) {
    // First, ensure tags exist or create them
    for (const tagName of data.tags) {
      const { data: existingTag } = await supabase
        .from('cfp_tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .single();

      let tagId: string;
      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag } = await supabase
          .from('cfp_tags')
          .insert({ name: tagName.toLowerCase(), is_suggested: false })
          .select('id')
          .single();
        if (newTag) {
          tagId = newTag.id;
        } else {
          continue;
        }
      }

      // Link tag to submission
      await supabase
        .from('cfp_submission_tags')
        .insert({ submission_id: submission.id, tag_id: tagId });
    }
  }

  return { submission: submission as CfpSubmission };
}

/**
 * Update session scheduling (admin only)
 */
export async function updateSessionSchedule(
  submissionId: string,
  schedule: {
    scheduled_date?: string | null;
    scheduled_start_time?: string | null;
    scheduled_duration_minutes?: number | null;
    room?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_submissions')
    .update({
      ...schedule,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) {
    console.error('[CFP Speakers] Error updating schedule:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
