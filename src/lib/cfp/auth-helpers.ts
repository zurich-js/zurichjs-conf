/**
 * CFP Authentication Helpers
 * Shared utilities for speaker and reviewer authentication flows
 */

import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { createSupabaseServerClient } from './auth';
import { serverAnalytics } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Auth');

// ============================================
// CONSTANTS
// ============================================

/**
 * PostgreSQL error code for unique constraint violation
 * Used to detect race conditions during speaker/reviewer creation
 */
export const POSTGRES_DUPLICATE_KEY_ERROR = '23505';

/**
 * Patterns that indicate an expired or invalid magic link
 */
const EXPIRED_LINK_PATTERNS = [
  'invalid or has expired',
  'link is invalid',
  'link has expired',
  'otp_expired',
  'invalid_grant',
  'expired',
  'code verifier',
] as const;

// ============================================
// ERROR DETECTION
// ============================================

/**
 * Check if an error message indicates an expired or invalid magic link
 * Used to show appropriate UI (expired vs generic error)
 */
export function isExpiredLinkError(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return EXPIRED_LINK_PATTERNS.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if a Supabase/Postgres error is a duplicate key violation
 * Indicates a race condition where another request already created the record
 */
export function isDuplicateKeyError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === POSTGRES_DUPLICATE_KEY_ERROR ||
    error.message?.includes('duplicate key') ||
    false
  );
}

// ============================================
// SHARED CALLBACK HANDLER
// ============================================

export interface AuthCallbackPageProps {
  status: 'success' | 'error' | 'expired';
  error?: string;
}

interface AuthCallbackConfig<T> {
  /** Type of auth flow for logging and analytics */
  flowType: 'speaker' | 'reviewer';
  /** Login page to redirect to on missing code */
  loginPath: string;
  /** Dashboard to redirect to on success */
  dashboardPath: string;
  /** Function to create/link the user record after authentication */
  onAuthenticated: (userId: string, email: string) => Promise<{
    data: T | null;
    error?: string;
  }>;
  /** Function to track successful authentication in analytics */
  trackSuccess: (data: T) => Promise<void>;
}

/**
 * Creates a getServerSideProps handler for auth callbacks
 * Handles the common flow: code exchange, session creation, user record creation
 *
 * @example
 * export const getServerSideProps = createAuthCallbackHandler({
 *   flowType: 'speaker',
 *   loginPath: '/cfp/login',
 *   dashboardPath: '/cfp/dashboard',
 *   onAuthenticated: async (userId, email) => {
 *     const { speaker, error } = await getOrCreateSpeaker(userId, email);
 *     return { data: speaker, error };
 *   },
 *   trackSuccess: async (speaker) => {
 *     await serverAnalytics.track('cfp_speaker_authenticated', speaker.id, { ... });
 *   },
 * });
 */
export function createAuthCallbackHandler<T>(
  config: AuthCallbackConfig<T>
): (context: GetServerSidePropsContext) => Promise<GetServerSidePropsResult<AuthCallbackPageProps>> {
  const { flowType, loginPath, dashboardPath, onAuthenticated, trackSuccess } = config;
  const analyticsFlow = `cfp_${flowType}_auth_callback`;

  return async (context: GetServerSidePropsContext) => {
    const { query } = context;
    const code = query.code as string | undefined;
    const errorParam = query.error as string | undefined;
    const errorDescription = query.error_description as string | undefined;

    // Handle error from Supabase in query params
    if (errorParam) {
      const errorMessage = errorDescription || errorParam;
      const isExpired = isExpiredLinkError(errorMessage);

      log.warn(`Auth error from Supabase (${flowType})`, {
        error: errorParam,
        description: errorDescription,
      });

      return {
        props: {
          status: isExpired ? 'expired' : 'error',
          error: errorMessage,
        },
      };
    }

    // No code provided - redirect to login
    if (!code) {
      log.warn(`No auth code provided (${flowType})`);
      return {
        redirect: {
          destination: `${loginPath}?error=missing_code`,
          permanent: false,
        },
      };
    }

    try {
      const supabase = createSupabaseServerClient(context);

      // Exchange code for session (PKCE flow)
      log.info(`Exchanging code for session (${flowType})`);
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        log.error(`Code exchange error (${flowType})`, exchangeError);
        const isExpired = isExpiredLinkError(exchangeError.message);

        if (!isExpired) {
          serverAnalytics.captureException(exchangeError, {
            type: 'auth',
            severity: 'high',
            flow: analyticsFlow,
            action: 'exchange_code',
          });
        }

        return {
          props: {
            status: isExpired ? 'expired' : 'error',
            error: exchangeError.message,
          },
        };
      }

      if (!sessionData.session || !sessionData.user) {
        log.error(`No session established after code exchange (${flowType})`);
        return {
          props: {
            status: 'error',
            error: 'Failed to establish session',
          },
        };
      }

      const user = sessionData.user;

      // Validate email exists
      if (!user.email) {
        log.error(`User has no email after authentication (${flowType})`, { userId: user.id });
        serverAnalytics.captureException(new Error('User authenticated without email'), {
          distinctId: user.id,
          type: 'auth',
          severity: 'high',
          flow: analyticsFlow,
          action: 'validate_email',
        });

        return {
          props: {
            status: 'error',
            error: 'Authentication failed - no email associated with account',
          },
        };
      }

      log.info(`Session established (${flowType})`, { userId: user.id, email: user.email });

      // Create/link user record
      const { data, error: recordError } = await onAuthenticated(user.id, user.email);

      if (recordError || !data) {
        log.error(`Failed to create/link ${flowType} record`, { error: recordError });
        serverAnalytics.captureException(new Error(recordError || `Failed to create ${flowType}`), {
          distinctId: user.id,
          type: 'auth',
          severity: 'high',
          flow: analyticsFlow,
          action: `create_${flowType}`,
          email: user.email,
        });

        return {
          props: {
            status: 'error',
            error: recordError || `Failed to set up ${flowType} profile`,
          },
        };
      }

      // Track successful authentication
      await trackSuccess(data);

      log.info(`${flowType} authenticated successfully`, { userId: user.id, email: user.email });

      // Redirect to dashboard
      return {
        redirect: {
          destination: dashboardPath,
          permanent: false,
        },
      };
    } catch (err) {
      log.error(`Unexpected error in ${flowType} auth callback`, err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      const isExpired = isExpiredLinkError(errorMessage);

      if (!isExpired) {
        serverAnalytics.captureException(err, {
          type: 'auth',
          severity: 'critical',
          flow: analyticsFlow,
          action: 'unexpected_error',
        });
      }

      return {
        props: {
          status: isExpired ? 'expired' : 'error',
          error: errorMessage,
        },
      };
    }
  };
}
