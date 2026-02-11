/**
 * CFP Submission Operations
 * CRUD operations for talk and workshop submissions
 */

import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import type {
  CfpSubmission,
  CfpSubmissionWithDetails,
  CfpTag,
  CreateCfpSubmissionRequest,
  UpdateCfpSubmissionRequest,
  CfpSubmissionStatus,
} from '@/lib/types/cfp';

/**
 * Get submission by ID
 */
export async function getSubmissionById(
  submissionId: string
): Promise<CfpSubmission | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error || !data) {
    console.error('[CFP Submissions] Error fetching submission:', error?.message);
    return null;
  }

  return data as CfpSubmission;
}

/**
 * Get submission with speaker and tags
 */
export async function getSubmissionWithDetails(
  submissionId: string
): Promise<CfpSubmissionWithDetails | null> {
  const supabase = createCfpServiceClient();

  // Get submission
  const { data: submission, error: submissionError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submission) {
    console.error('[CFP Submissions] Error fetching submission:', submissionError?.message);
    return null;
  }

  // Get speaker
  const { data: speaker, error: speakerError } = await supabase
    .from('cfp_speakers')
    .select('*')
    .eq('id', submission.speaker_id)
    .single();

  if (speakerError || !speaker) {
    console.error('[CFP Submissions] Error fetching speaker:', speakerError?.message);
    return null;
  }

  // Get tags
  const { data: tagLinks } = await supabase
    .from('cfp_submission_tags')
    .select('tag_id')
    .eq('submission_id', submissionId);

  let tags: CfpTag[] = [];
  if (tagLinks && tagLinks.length > 0) {
    const tagIds = tagLinks.map((link: { tag_id: string }) => link.tag_id);
    const { data: tagData } = await supabase
      .from('cfp_tags')
      .select('*')
      .in('id', tagIds);
    tags = (tagData || []) as CfpTag[];
  }

  return {
    ...(submission as CfpSubmission),
    speaker,
    tags,
  };
}

/**
 * Get all submissions for a speaker
 */
export async function getSubmissionsBySpeakerId(
  speakerId: string
): Promise<{ submissions: CfpSubmission[]; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('speaker_id', speakerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CFP Submissions] Error fetching submissions:', error.message);
    return { submissions: [], error: error.message };
  }

  return { submissions: (data || []) as CfpSubmission[], error: null };
}

/**
 * Create a new submission
 */
export async function createSubmission(
  speakerId: string,
  data: CreateCfpSubmissionRequest
): Promise<{ submission: CfpSubmission | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // Extract tags from the request
  const { tags, ...submissionData } = data;

  // Create submission
  const { data: submission, error: createError } = await supabase
    .from('cfp_submissions')
    .insert({
      speaker_id: speakerId,
      ...submissionData,
      status: 'draft',
    })
    .select()
    .single();

  if (createError || !submission) {
    console.error('[CFP Submissions] Error creating submission:', createError?.message);
    return { submission: null, error: createError?.message || 'Failed to create submission' };
  }

  // Handle tags
  if (tags && tags.length > 0) {
    await linkTagsToSubmission(submission.id, tags);
  }

  return { submission: submission as CfpSubmission };
}

/**
 * Update a submission
 */
export async function updateSubmission(
  submissionId: string,
  speakerId: string,
  data: UpdateCfpSubmissionRequest
): Promise<{ submission: CfpSubmission | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // First verify the submission belongs to the speaker and is editable
  const { data: existing, error: fetchError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('speaker_id', speakerId)
    .single();

  if (fetchError || !existing) {
    return { submission: null, error: 'Submission not found' };
  }

  if (existing.status !== 'draft') {
    return { submission: null, error: 'Only draft submissions can be edited' };
  }

  // Extract tags from the update
  const { tags, ...updateData } = data;

  // Update submission
  const { data: updated, error: updateError } = await supabase
    .from('cfp_submissions')
    .update(updateData)
    .eq('id', submissionId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('[CFP Submissions] Error updating submission:', updateError?.message);
    return { submission: null, error: updateError?.message || 'Failed to update submission' };
  }

  // Update tags if provided
  if (tags !== undefined) {
    // Remove existing tags
    await supabase
      .from('cfp_submission_tags')
      .delete()
      .eq('submission_id', submissionId);

    // Add new tags
    if (tags.length > 0) {
      await linkTagsToSubmission(submissionId, tags);
    }
  }

  return { submission: updated as CfpSubmission };
}

/**
 * Submit a draft submission for review
 */
export async function submitForReview(
  submissionId: string,
  speakerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  // Verify the submission belongs to the speaker
  const { data: existing, error: fetchError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('speaker_id', speakerId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Submission not found' };
  }

  if (existing.status !== 'draft') {
    return { success: false, error: 'Submission has already been submitted' };
  }

  // Update status to submitted
  const { error: updateError } = await supabase
    .from('cfp_submissions')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[CFP Submissions] Error submitting:', updateError.message);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Withdraw a submitted submission
 */
export async function withdrawSubmission(
  submissionId: string,
  speakerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  // Verify the submission belongs to the speaker
  const { data: existing, error: fetchError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('speaker_id', speakerId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Submission not found' };
  }

  // Can only withdraw if submitted or under_review
  const withdrawableStatuses: CfpSubmissionStatus[] = ['submitted', 'under_review'];
  if (!withdrawableStatuses.includes(existing.status)) {
    return { success: false, error: 'Cannot withdraw submission in current status' };
  }

  // Update status to withdrawn
  const { error: updateError } = await supabase
    .from('cfp_submissions')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[CFP Submissions] Error withdrawing:', updateError.message);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Reopen a withdrawn submission as draft
 */
export async function reopenSubmission(
  submissionId: string,
  speakerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  // Verify the submission belongs to the speaker
  const { data: existing, error: fetchError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('speaker_id', speakerId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Submission not found' };
  }

  if (existing.status !== 'withdrawn') {
    return { success: false, error: 'Only withdrawn submissions can be reopened' };
  }

  // Update status back to draft
  const { error: updateError } = await supabase
    .from('cfp_submissions')
    .update({
      status: 'draft',
      submitted_at: null,
      withdrawn_at: null,
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[CFP Submissions] Error reopening:', updateError.message);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Delete a draft submission
 */
export async function deleteSubmission(
  submissionId: string,
  speakerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  // Verify the submission belongs to the speaker and is a draft
  const { data: existing, error: fetchError } = await supabase
    .from('cfp_submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('speaker_id', speakerId)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Submission not found' };
  }

  if (existing.status !== 'draft') {
    return { success: false, error: 'Only draft submissions can be deleted' };
  }

  // Delete the submission (tags will cascade)
  const { error: deleteError } = await supabase
    .from('cfp_submissions')
    .delete()
    .eq('id', submissionId);

  if (deleteError) {
    console.error('[CFP Submissions] Error deleting:', deleteError.message);
    return { success: false, error: deleteError.message };
  }

  return { success: true };
}

/**
 * Helper: Link tags to a submission
 */
async function linkTagsToSubmission(
  submissionId: string,
  tagNames: string[]
): Promise<void> {
  const supabase = createCfpServiceClient();

  for (const tagName of tagNames) {
    // Find or create tag
    let tagId: string;

    const { data: existingTag } = await supabase
      .from('cfp_tags')
      .select('id')
      .eq('name', tagName)
      .single();

    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // Create new tag
      const { data: newTag, error: createError } = await supabase
        .from('cfp_tags')
        .insert({ name: tagName, is_suggested: false })
        .select('id')
        .single();

      if (createError || !newTag) {
        console.error('[CFP Submissions] Error creating tag:', createError?.message);
        continue;
      }
      tagId = newTag.id;
    }

    // Link tag to submission
    await supabase
      .from('cfp_submission_tags')
      .insert({ submission_id: submissionId, tag_id: tagId });
  }
}

/**
 * Get submission count for a speaker
 * Excludes withdrawn submissions from the count
 */
export async function getSubmissionCount(speakerId: string): Promise<number> {
  const supabase = createCfpServiceClient();

  const { count, error } = await supabase
    .from('cfp_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('speaker_id', speakerId)
    .neq('status', 'withdrawn');

  if (error) {
    console.error('[CFP Submissions] Error counting submissions:', error.message);
    return 0;
  }

  return count || 0;
}
