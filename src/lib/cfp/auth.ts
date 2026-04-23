/**
 * CFP Authentication Utilities
 * Handles magic link authentication for speakers and reviewers
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { createCfpServiceClient } from '@/lib/supabase/cfp-client';
import { isDuplicateKeyError } from './auth-constants';
import type { CfpSpeaker, CfpReviewer } from '@/lib/types/cfp';
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import { getBaseUrl } from '@/lib/url';

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
    console.error("[CFP Auth]", 'Missing Supabase configuration', {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
    });
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
 * Get base URL from request headers (for API routes)
 * Prioritizes request headers to ensure correct URL in production
 * Checks x-forwarded-host for reverse proxy environments
 */
function getBaseUrlFromRequest(req?: NextApiRequest): string {
  if (req?.headers) {
    // Log all relevant headers for debugging
    console.log('[CFP Auth] Request headers:', {
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      host: req.headers.host,
      origin: req.headers.origin,
    });

    // Check x-forwarded-host first (set by reverse proxies like Vercel, Cloudflare, etc.)
    const forwardedHost = req.headers['x-forwarded-host'];
    if (forwardedHost) {
      const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
      if (host && !host.includes('localhost')) {
        const proto = req.headers['x-forwarded-proto'];
        const protocol = proto ? (Array.isArray(proto) ? proto[0] : proto) : 'https';
        return `${protocol}://${host}`;
      }
    }

    // Try origin header (set by browsers on CORS requests)
    const origin = req.headers.origin;
    if (origin && !origin.includes('localhost')) {
      return origin;
    }

    // Fall back to host header
    const host = req.headers.host;
    if (host && !host.includes('localhost')) {
      const protocol = 'https';
      return `${protocol}://${host}`;
    }
  }

  // Final fallback to getBaseUrl (env var)
  return getBaseUrl(req);
}

/**
 * Send magic link email for speaker login
 */
export async function sendSpeakerMagicLink(email: string, req?: NextApiRequest): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrlFromRequest(req);
  const redirectTo = `${baseUrl}/cfp/auth/callback`;

  console.log("[CFP Auth]", 'Sending speaker magic link', { email, baseUrl, redirectTo });

  try {
    const serverClient = createServerAuthClient();

    const { error } = await serverClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error("[CFP Auth]", 'Speaker magic link error', error, { email });
      return { success: false, error: error.message };
    }

    console.log("[CFP Auth]", 'Speaker magic link sent successfully', { email });
    return { success: true };
  } catch (err) {
    console.error("[CFP Auth]", 'Exception sending speaker magic link', err, { email });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Send magic link email for reviewer login
 */
export async function sendReviewerMagicLink(email: string, req?: NextApiRequest): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrlFromRequest(req);
  const redirectTo = `${baseUrl}/cfp/reviewer/auth/callback`;

  console.log("[CFP Auth]", 'Sending reviewer magic link', { email, baseUrl, redirectTo });

  try {
    const serverClient = createServerAuthClient();

    const { error } = await serverClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error("[CFP Auth]", 'Reviewer magic link error', error, { email });
      return { success: false, error: error.message };
    }

    console.log("[CFP Auth]", 'Reviewer magic link sent successfully', { email });
    return { success: true };
  } catch (err) {
    console.error("[CFP Auth]", 'Exception sending reviewer magic link', err, { email });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
// SPEAKER MANAGEMENT
// ============================================

/**
 * Get or create speaker profile for authenticated user
 * Called after successful magic link authentication
 * Uses upsert logic to handle race conditions
 */
export async function getOrCreateSpeaker(
  userId: string,
  email: string
): Promise<{ speaker: CfpSpeaker | null; error?: string }> {
  const supabaseAdmin = createCfpServiceClient();

  // First, check if speaker already exists by user_id
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
    // Speaker exists by email - link to user if not already linked
    if (speakerByEmail.user_id && speakerByEmail.user_id !== userId) {
      // Speaker is already linked to a different user - this shouldn't happen normally
      console.error("[CFP Auth]", 'Speaker already linked to different user', {
        email,
        existingUserId: speakerByEmail.user_id,
        attemptedUserId: userId,
      });
      return { speaker: null, error: 'This email is already associated with another account' };
    }

    if (speakerByEmail.user_id === userId) {
      // Already linked to this user (race condition - another request linked it)
      return { speaker: speakerByEmail as CfpSpeaker };
    }

    // Link existing speaker to user
    const { data: updatedSpeaker, error: updateError } = await supabaseAdmin
      .from('cfp_speakers')
      .update({ user_id: userId })
      .eq('id', speakerByEmail.id)
      .select()
      .single();

    if (updateError) {
      // Handle race condition - if duplicate key error, fetch the existing speaker
      if (isDuplicateKeyError(updateError)) {
        console.log("[CFP Auth]", 'Race condition detected during speaker link, fetching existing', { userId, email });
        const { data: raceSpeaker, error: raceError } = await supabaseAdmin
          .from('cfp_speakers')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (raceError) {
          console.error("[CFP Auth]", 'Failed to recover from race condition during speaker link', raceError, { userId, email });
          return { speaker: null, error: 'Failed to link speaker profile' };
        }

        if (raceSpeaker) {
          return { speaker: raceSpeaker as CfpSpeaker };
        }

        console.error("[CFP Auth]", 'Race condition recovery found no speaker', { userId, email });
        return { speaker: null, error: 'Failed to link speaker profile' };
      }

      console.error("[CFP Auth]", 'Error linking speaker', updateError, { userId, email });
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
    // Handle race condition - if duplicate key error, fetch the existing speaker
    if (isDuplicateKeyError(createError)) {
      console.log("[CFP Auth]", 'Race condition detected during speaker creation, fetching existing', { userId, email });
      const { data: raceSpeaker, error: raceError } = await supabaseAdmin
        .from('cfp_speakers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (raceError) {
        console.error("[CFP Auth]", 'Failed to recover from race condition during speaker creation', raceError, { userId, email });
        return { speaker: null, error: 'Failed to create speaker profile' };
      }

      if (raceSpeaker) {
        return { speaker: raceSpeaker as CfpSpeaker };
      }

      console.error("[CFP Auth]", 'Race condition recovery found no speaker after create', { userId, email });
      return { speaker: null, error: 'Failed to create speaker profile' };
    }

    console.error("[CFP Auth]", 'Error creating speaker', createError, { userId, email });
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

  console.debug("[CFP Auth]", 'Getting reviewer by user_id', { userId });

  const { data, error } = await supabaseAdmin
    .from('cfp_reviewers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.debug("[CFP Auth]", 'Error getting reviewer by user_id', { userId, error: error.message });
    return null;
  }

  if (!data) {
    console.debug("[CFP Auth]", 'No reviewer found for user_id', { userId });
    return null;
  }

  console.debug("[CFP Auth]", 'Found reviewer', { userId, email: data.email });
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

  console.log("[CFP Auth]", 'Accepting reviewer invite', { email: normalizedEmail, userId });

  // Find invited reviewer by email (case-insensitive)
  const { data: reviewer, error: fetchError } = await supabaseAdmin
    .from('cfp_reviewers')
    .select('*')
    .ilike('email', normalizedEmail)
    .eq('is_active', true)
    .single();

  if (fetchError) {
    console.error("[CFP Auth]", 'Error finding reviewer', fetchError, { email: normalizedEmail });
    return { reviewer: null, error: `No invitation found for ${normalizedEmail}` };
  }

  if (!reviewer) {
    console.warn("[CFP Auth]", 'No reviewer found for email', { email: normalizedEmail });
    return { reviewer: null, error: `No invitation found for ${normalizedEmail}` };
  }

  console.debug("[CFP Auth]", 'Found reviewer', { reviewerId: reviewer.id, currentUserId: reviewer.user_id });

  // Update with user_id and accepted_at
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
    console.error("[CFP Auth]", 'Error accepting reviewer invite', updateError, { reviewerId: reviewer.id, userId });
    return { reviewer: null, error: updateError.message };
  }

  console.log("[CFP Auth]", 'Reviewer invite accepted', { reviewerId: reviewer.id, userId });
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
    console.error("[CFP Auth]", 'User verification error', error);
    return null;
  }

  return user;
}

// Re-export client-safe utilities for backwards compatibility
export { isSpeakerProfileComplete, getMissingProfileFields } from './auth-constants';
