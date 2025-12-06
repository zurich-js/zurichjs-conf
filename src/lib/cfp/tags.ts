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
  const tagIds = links.map((link: { tag_id: string }) => link.tag_id);
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
