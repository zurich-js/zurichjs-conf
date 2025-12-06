/**
 * CFP Reviewers CRUD Operations
 * Functions for managing CFP reviewers
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { CfpReviewer, CfpReviewerRole, InviteCfpReviewerRequest } from '../types/cfp';

/**
 * Create untyped Supabase client for CFP tables
 * (Types haven't been regenerated for the new CFP tables)
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
 * Get a reviewer by ID
 */
export async function getReviewerById(id: string): Promise<CfpReviewer | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReviewer;
}

/**
 * Get a reviewer by user ID
 */
export async function getReviewerByUserId(userId: string): Promise<CfpReviewer | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReviewer;
}

/**
 * Get a reviewer by email
 */
export async function getReviewerByEmail(email: string): Promise<CfpReviewer | null> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReviewer;
}

/**
 * Get all active reviewers
 */
export async function getAllReviewers(): Promise<CfpReviewer[]> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CfpReviewer[];
}

/**
 * Invite a new reviewer
 */
export async function inviteReviewer(
  request: InviteCfpReviewerRequest,
  invitedBy: string | null
): Promise<{ reviewer: CfpReviewer | null; error: string | null }> {
  const supabase = createCfpServiceClient();
  const email = request.email.toLowerCase();

  // Check if reviewer already exists
  const existing = await getReviewerByEmail(email);
  if (existing) {
    return { reviewer: null, error: 'Reviewer with this email already exists' };
  }

  // Create reviewer record
  const { data, error } = await supabase
    .from('cfp_reviewers')
    .insert({
      email,
      name: request.name || null,
      role: request.role || 'reviewer',
      can_see_speaker_identity: request.can_see_speaker_identity ?? false,
      invited_by: invitedBy,
      invited_at: new Date().toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Reviewers] Error inviting reviewer:', error);
    return { reviewer: null, error: error?.message || 'Failed to invite reviewer' };
  }

  return { reviewer: data as CfpReviewer, error: null };
}

/**
 * Accept a reviewer invitation (link user account)
 */
export async function acceptReviewerInvitation(
  reviewerId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_reviewers')
    .update({
      user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', reviewerId)
    .is('user_id', null);

  if (error) {
    console.error('[CFP Reviewers] Error accepting invitation:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Update a reviewer's role or permissions
 */
export async function updateReviewer(
  id: string,
  updates: {
    name?: string;
    role?: CfpReviewerRole;
    can_see_speaker_identity?: boolean;
    is_active?: boolean;
  }
): Promise<{ reviewer: CfpReviewer | null; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviewers')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error('[CFP Reviewers] Error updating reviewer:', error);
    return { reviewer: null, error: error?.message || 'Failed to update reviewer' };
  }

  return { reviewer: data as CfpReviewer, error: null };
}

/**
 * Deactivate a reviewer (soft delete)
 */
export async function deactivateReviewer(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_reviewers')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[CFP Reviewers] Error deactivating reviewer:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Reactivate a reviewer
 */
export async function reactivateReviewer(id: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = createCfpServiceClient();

  const { error } = await supabase
    .from('cfp_reviewers')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[CFP Reviewers] Error reactivating reviewer:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Check if a user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const reviewer = await getReviewerByUserId(userId);
  return reviewer?.role === 'super_admin' && reviewer?.is_active === true;
}

/**
 * Check if a user is an active reviewer (any role)
 */
export async function isActiveReviewer(userId: string): Promise<boolean> {
  const reviewer = await getReviewerByUserId(userId);
  return reviewer?.is_active === true && reviewer?.accepted_at !== null;
}

/**
 * Get reviewer statistics
 */
export async function getReviewerStats(reviewerId: string): Promise<{
  total_reviews: number;
  submissions_reviewed: number;
}> {
  const supabase = createCfpServiceClient();

  const { data, error } = await supabase
    .from('cfp_reviews')
    .select('id')
    .eq('reviewer_id', reviewerId);

  if (error || !data) {
    return { total_reviews: 0, submissions_reviewed: 0 };
  }

  return {
    total_reviews: data.length,
    submissions_reviewed: data.length,
  };
}
