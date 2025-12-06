/**
 * CFP Authentication Utilities
 * Handles magic link authentication for speakers and reviewers
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { env } from '@/config/env';
import type { CfpSpeaker, CfpReviewer } from '@/lib/types/cfp';
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

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

// ============================================
// SERVER-SIDE AUTH (for getServerSideProps)
// ============================================

/**
 * Create a Supabase client for server-side rendering
 * Uses cookies to manage session
 */
export function createSupabaseServerClient(
  context: GetServerSidePropsContext
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = context.req.cookies;
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: value || '',
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.res.setHeader(
              'Set-Cookie',
              `${name}=${value}; Path=/; ${options?.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options?.httpOnly ? 'HttpOnly;' : ''} ${options?.secure ? 'Secure;' : ''} SameSite=Lax`
            );
          });
        },
      },
    }
  );
}

/**
 * Create a Supabase client for API routes
 */
export function createSupabaseApiClient(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = req.cookies;
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: value || '',
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.setHeader(
              'Set-Cookie',
              `${name}=${value}; Path=/; ${options?.maxAge ? `Max-Age=${options.maxAge};` : ''} ${options?.httpOnly ? 'HttpOnly;' : ''} ${options?.secure ? 'Secure;' : ''} SameSite=Lax`
            );
          });
        },
      },
    }
  );
}

// ============================================
// MAGIC LINK LOGIN
// ============================================

/**
 * Create a Supabase client for server-side auth operations
 * Uses the anon key since signInWithOtp needs to work with the public API
 */
function createServerAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('[CFP Auth] Missing Supabase URL or anon key');
    console.error('[CFP Auth] URL:', url ? '(present)' : '❌ MISSING');
    console.error('[CFP Auth] Anon Key:', anonKey ? '(present)' : '❌ MISSING');
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Send magic link email for speaker login
 */
export async function sendSpeakerMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const redirectTo = `${baseUrl}/cfp/auth/callback`;

  console.log('[CFP Auth] Sending speaker magic link to:', email);
  console.log('[CFP Auth] Base URL:', baseUrl);
  console.log('[CFP Auth] Redirect URL:', redirectTo);

  try {
    const serverClient = createServerAuthClient();

    const { error } = await serverClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('[CFP Auth] Speaker magic link error:', error.message, error);
      return { success: false, error: error.message };
    }

    console.log('[CFP Auth] Speaker magic link sent successfully to:', email);
    return { success: true };
  } catch (err) {
    console.error('[CFP Auth] Exception sending speaker magic link:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send magic link email for reviewer login
 */
export async function sendReviewerMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const redirectTo = `${baseUrl}/cfp/reviewer/auth/callback`;

  console.log('[CFP Auth] Sending reviewer magic link to:', email);
  console.log('[CFP Auth] Base URL:', baseUrl);
  console.log('[CFP Auth] Redirect URL:', redirectTo);

  try {
    const serverClient = createServerAuthClient();

    const { error } = await serverClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error('[CFP Auth] Reviewer magic link error:', error.message, error);
      return { success: false, error: error.message };
    }

    console.log('[CFP Auth] Reviewer magic link sent successfully to:', email);
    return { success: true };
  } catch (err) {
    console.error('[CFP Auth] Exception sending reviewer magic link:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// SPEAKER MANAGEMENT
// ============================================

/**
 * Get or create speaker profile for authenticated user
 * Called after successful magic link authentication
 */
export async function getOrCreateSpeaker(
  userId: string,
  email: string
): Promise<{ speaker: CfpSpeaker | null; error?: string }> {
  const supabaseAdmin = createCfpServiceClient();

  // Check if speaker already exists
  const { data: existingSpeaker } = await supabaseAdmin
    .from('cfp_speakers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingSpeaker) {
    return { speaker: existingSpeaker as CfpSpeaker };
  }

  // Check if speaker exists by email but not linked to user
  const { data: speakerByEmail } = await supabaseAdmin
    .from('cfp_speakers')
    .select('*')
    .eq('email', email)
    .single();

  if (speakerByEmail) {
    // Link existing speaker to user
    const { data: updatedSpeaker, error: updateError } = await supabaseAdmin
      .from('cfp_speakers')
      .update({ user_id: userId })
      .eq('id', speakerByEmail.id)
      .select()
      .single();

    if (updateError) {
      console.error('[CFP Auth] Error linking speaker:', updateError.message);
      return { speaker: null, error: updateError.message };
    }

    return { speaker: updatedSpeaker as CfpSpeaker };
  }

  // Create new speaker profile
  const { data: newSpeaker, error: createError } = await supabaseAdmin
    .from('cfp_speakers')
    .insert({
      user_id: userId,
      email,
      first_name: '',
      last_name: '',
    })
    .select()
    .single();

  if (createError) {
    console.error('[CFP Auth] Error creating speaker:', createError.message);
    return { speaker: null, error: createError.message };
  }

  return { speaker: newSpeaker as CfpSpeaker };
}

/**
 * Get speaker by user ID
 */
export async function getSpeakerByUserId(userId: string): Promise<CfpSpeaker | null> {
  const supabaseAdmin = createCfpServiceClient();

  const { data, error } = await supabaseAdmin
    .from('cfp_speakers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeaker;
}

/**
 * Get speaker by email
 */
export async function getSpeakerByEmail(email: string): Promise<CfpSpeaker | null> {
  const supabaseAdmin = createCfpServiceClient();

  const { data, error } = await supabaseAdmin
    .from('cfp_speakers')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpSpeaker;
}

// ============================================
// REVIEWER MANAGEMENT
// ============================================

/**
 * Get reviewer by user ID
 */
export async function getReviewerByUserId(userId: string): Promise<CfpReviewer | null> {
  const supabaseAdmin = createCfpServiceClient();

  console.log('[CFP Auth] Getting reviewer by user_id:', userId);

  const { data, error } = await supabaseAdmin
    .from('cfp_reviewers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.log('[CFP Auth] Error getting reviewer by user_id:', error.message);
    return null;
  }

  if (!data) {
    console.log('[CFP Auth] No reviewer found for user_id:', userId);
    return null;
  }

  console.log('[CFP Auth] Found reviewer:', data.email);
  return data as CfpReviewer;
}

/**
 * Get reviewer by email
 */
export async function getReviewerByEmail(email: string): Promise<CfpReviewer | null> {
  const supabaseAdmin = createCfpServiceClient();

  const { data, error } = await supabaseAdmin
    .from('cfp_reviewers')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CfpReviewer;
}

/**
 * Link reviewer to authenticated user and mark as accepted
 */
export async function acceptReviewerInvite(
  userId: string,
  email: string
): Promise<{ reviewer: CfpReviewer | null; error?: string }> {
  const supabaseAdmin = createCfpServiceClient();
  const normalizedEmail = email.toLowerCase();

  console.log('[CFP Auth] Accepting reviewer invite for:', normalizedEmail);

  // Find invited reviewer by email (case-insensitive)
  const { data: reviewer, error: fetchError } = await supabaseAdmin
    .from('cfp_reviewers')
    .select('*')
    .ilike('email', normalizedEmail)
    .eq('is_active', true)
    .single();

  if (fetchError) {
    console.error('[CFP Auth] Error finding reviewer:', fetchError.message);
    return { reviewer: null, error: `No invitation found for ${normalizedEmail}` };
  }

  if (!reviewer) {
    console.error('[CFP Auth] No reviewer found for email:', normalizedEmail);
    return { reviewer: null, error: `No invitation found for ${normalizedEmail}` };
  }

  console.log('[CFP Auth] Found reviewer:', reviewer.id, 'current user_id:', reviewer.user_id);

  // Update with user_id and accepted_at
  console.log('[CFP Auth] Updating reviewer with user_id:', userId);
  const { data: updatedReviewer, error: updateError } = await supabaseAdmin
    .from('cfp_reviewers')
    .update({
      user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', reviewer.id)
    .select()
    .single();

  if (updateError) {
    console.error('[CFP Auth] Error accepting invite:', updateError.message);
    return { reviewer: null, error: updateError.message };
  }

  console.log('[CFP Auth] Reviewer updated successfully, new user_id:', updatedReviewer?.user_id);
  return { reviewer: updatedReviewer as CfpReviewer };
}

// ============================================
// SESSION HELPERS
// ============================================

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current authenticated user (client-side)
 * Uses getUser() which verifies with Supabase Auth server (more secure than getSession)
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('[CFP Auth] User verification error:', error.message);
    return null;
  }

  return user;
}

/**
 * Check if speaker profile is complete (has required fields)
 */
export function isSpeakerProfileComplete(speaker: CfpSpeaker): boolean {
  return !!(
    speaker.first_name &&
    speaker.last_name &&
    speaker.bio
  );
}
