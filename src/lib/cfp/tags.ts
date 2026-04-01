/**
 * CFP Tag Operations
 * CRUD operations for submission tags
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { CfpTag } from '@/lib/types/cfp';

/**
 * Create an untyped service role client for CFP tables
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
 * Get all suggested tags
 */
export async function getSuggestedTags(): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .eq('is_suggested', true)
    .order('name');

  if (error) {
    console.error('[CFP Tags] Error fetching suggested tags:', error.message);
    return [];
  }

  return (data || []) as CfpTag[];
}

/**
 * Get all tags
 */
export async function getAllTags(): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('[CFP Tags] Error fetching tags:', error.message);
    return [];
  }

  return (data || []) as CfpTag[];
}

/**
 * Get tag by ID
 */
export async function getTagById(tagId: string): Promise<CfpTag | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .eq('id', tagId)
    .single();

  if (error || !data) {
    console.error('[CFP Tags] Error fetching tag:', error?.message);
    return null;
  }

  return data as CfpTag;
}

/**
 * Get tag by name
 */
export async function getTagByName(name: string): Promise<CfpTag | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .eq('name', name)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpTag;
}

/**
 * Create a new tag (admin only)
 */
export async function createTag(
  name: string,
  isSuggested: boolean = false
): Promise<{ tag: CfpTag | null; error?: string }> {
  const supabase = createCfpServiceClient();

  if (!name.trim()) {
    return { tag: null, error: 'Tag name is required' };
  }

  // Check if tag already exists
  const existing = await getTagByName(name);
  if (existing) {
    return { tag: null, error: 'Tag already exists' };
  }

  const { data, error } = await supabase
    .from('cfp_tags')
    .insert({ name, is_suggested: isSuggested })
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Tags] Error creating tag:', error?.message);
    return { tag: null, error: error?.message || 'Failed to create tag' };
  }

  return { tag: data as CfpTag };
}

/**
 * Update a tag (admin only)
 */
export async function updateTag(
  tagId: string,
  updates: { name?: string; is_suggested?: boolean }
): Promise<{ tag: CfpTag | null; error?: string }> {
  const supabase = createCfpServiceClient();

  // If updating name, check for duplicates
  if (updates.name) {
    const existing = await getTagByName(updates.name);
    if (existing && existing.id !== tagId) {
      return { tag: null, error: 'A tag with this name already exists' };
    }
  }

  const { data, error } = await supabase
    .from('cfp_tags')
    .update(updates)
    .eq('id', tagId)
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Tags] Error updating tag:', error?.message);
    return { tag: null, error: error?.message || 'Failed to update tag' };
  }

  return { tag: data as CfpTag };
}

/**
 * Delete a tag (admin only)
 */
export async function deleteTag(
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_tags')
    .delete()
    .eq('id', tagId);

  if (error) {
    console.error('[CFP Tags] Error deleting tag:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Merge multiple tags into a single canonical tag.
 * Reassigns submission-tag relationships, then removes the merged source tags.
 */
export async function mergeTags(
  sourceTagIds: string[],
  targetName: string,
  isSuggested: boolean
): Promise<{
  tag: CfpTag | null;
  mergedTagIds: string[];
  reassignedSubmissionCount: number;
  error?: string;
}> {
  const supabase = createCfpServiceClient();
  const uniqueSourceTagIds = [...new Set(sourceTagIds.filter(Boolean))];

  if (uniqueSourceTagIds.length < 2) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Select at least two tags to merge',
    };
  }

  if (!targetName.trim()) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Target tag name is required',
    };
  }

  const { data: sourceTags, error: sourceTagsError } = await supabase
    .from('cfp_tags')
    .select('*')
    .in('id', uniqueSourceTagIds);

  if (sourceTagsError || !sourceTags || sourceTags.length < 2) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Failed to load source tags for merge',
    };
  }

  let targetTag = await getTagByName(targetName);

  if (!targetTag) {
    const { data: createdTag, error: createError } = await supabase
      .from('cfp_tags')
      .insert({ name: targetName, is_suggested: isSuggested })
      .select('*')
      .single();

    if (createError || !createdTag) {
      return {
        tag: null,
        mergedTagIds: [],
        reassignedSubmissionCount: 0,
        error: createError?.message || 'Failed to create merged tag',
      };
    }

    targetTag = createdTag as CfpTag;
  } else if (targetTag.is_suggested !== isSuggested) {
    const { data: updatedTag, error: updateError } = await supabase
      .from('cfp_tags')
      .update({ is_suggested: isSuggested })
      .eq('id', targetTag.id)
      .select('*')
      .single();

    if (updateError || !updatedTag) {
      return {
        tag: null,
        mergedTagIds: [],
        reassignedSubmissionCount: 0,
        error: updateError?.message || 'Failed to update merged tag',
      };
    }

    targetTag = updatedTag as CfpTag;
  }

  const tagIdsToReplace = uniqueSourceTagIds.filter((id) => id !== targetTag!.id);

  if (tagIdsToReplace.length === 0) {
    return {
      tag: targetTag,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
    };
  }

  const { data: existingLinks, error: linksError } = await supabase
    .from('cfp_submission_tags')
    .select('submission_id, tag_id')
    .in('tag_id', tagIdsToReplace);

  if (linksError) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Failed to load tag relationships for merge',
    };
  }

  const uniqueSubmissionIds = [...new Set((existingLinks || []).map((link) => link.submission_id))];

  if (uniqueSubmissionIds.length > 0) {
    const mergedLinks = uniqueSubmissionIds.map((submissionId) => ({
      submission_id: submissionId,
      tag_id: targetTag.id,
    }));

    const { error: upsertError } = await supabase
      .from('cfp_submission_tags')
      .upsert(mergedLinks, { onConflict: 'submission_id,tag_id' });

    if (upsertError) {
      return {
        tag: null,
        mergedTagIds: [],
        reassignedSubmissionCount: 0,
        error: 'Failed to reassign submission tags',
      };
    }
  }

  const { error: deleteLinksError } = await supabase
    .from('cfp_submission_tags')
    .delete()
    .in('tag_id', tagIdsToReplace);

  if (deleteLinksError) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Failed to remove old tag relationships',
    };
  }

  const { error: deleteTagsError } = await supabase
    .from('cfp_tags')
    .delete()
    .in('id', tagIdsToReplace);

  if (deleteTagsError) {
    return {
      tag: null,
      mergedTagIds: [],
      reassignedSubmissionCount: 0,
      error: 'Failed to remove merged tags',
    };
  }

  return {
    tag: targetTag,
    mergedTagIds: tagIdsToReplace,
    reassignedSubmissionCount: uniqueSubmissionIds.length,
  };
}

/**
 * Get tags for a submission
 */
export async function getTagsForSubmission(submissionId: string): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();

  // Get tag IDs linked to submission
  const { data: links, error: linksError } = await supabase
    .from('cfp_submission_tags')
    .select('tag_id')
    .eq('submission_id', submissionId);

  if (linksError || !links || links.length === 0) {
    return [];
  }

  // Get tags
  const tagIds = [...new Set(links.map((link: { tag_id: string }) => link.tag_id))];
  const { data: tags, error: tagsError } = await supabase
    .from('cfp_tags')
    .select('*')
    .in('id', tagIds);

  if (tagsError) {
    console.error('[CFP Tags] Error fetching submission tags:', tagsError.message);
    return [];
  }

  return (tags || []) as CfpTag[];
}

/**
 * Search tags by name (for autocomplete)
 */
export async function searchTags(query: string, limit: number = 10): Promise<CfpTag[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_tags')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('is_suggested', { ascending: false })
    .order('name')
    .limit(limit);

  if (error) {
    console.error('[CFP Tags] Error searching tags:', error.message);
    return [];
  }

  return (data || []) as CfpTag[];
}
