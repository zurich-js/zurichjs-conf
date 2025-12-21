/**
 * CFP Reviewer Auth Callback
 * Handles Supabase magic link redirect for reviewers
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { analytics } from '@/lib/analytics/client';

/**
 * Check if an error indicates an expired or invalid link
 */
function isExpiredLinkError(message: string): boolean {
  const expiredPatterns = [
    'invalid or has expired',
    'link is invalid',
    'link has expired',
    'otp_expired',
    'invalid_grant',
    'expired',
  ];
  const lowerMessage = message.toLowerCase();
  return expiredPatterns.some(pattern => lowerMessage.includes(pattern));
}

export default function ReviewerAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First check if there's a code in the URL query params (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle error from Supabase
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // If there's a code, exchange it for a session (PKCE flow)
        if (code) {
          analytics.track('cfp_auth_started', { auth_type: 'reviewer', auth_flow: 'pkce' });
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            analytics.track('cfp_auth_failed', {
              auth_type: 'reviewer',
              error_message: exchangeError.message,
              error_type: 'exchange_failed',
            });
            throw new Error(exchangeError.message);
          }

          if (!data.session) {
            throw new Error('Failed to establish session from code');
          }

          analytics.track('cfp_auth_succeeded', { auth_type: 'reviewer', auth_flow: 'pkce' });
        } else {
          // Try hash fragment (implicit flow) or existing session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (accessToken) {
            analytics.track('cfp_auth_started', { auth_type: 'reviewer', auth_flow: 'hash' });
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            });

            if (setSessionError) {
              throw new Error(setSessionError.message);
            }
          }
        }

        // Verify the user with Supabase Auth server (more secure than getSession)
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw new Error(userError.message);
        }

        if (!user) {
          throw new Error('No authenticated user found. The link may have expired or is invalid.');
        }

        analytics.track('cfp_auth_succeeded', {
          auth_type: 'reviewer',
          auth_flow: code ? 'pkce' : 'hash',
          user_email: user.email,
        });
        analytics.identify(user.id, { email: user.email });

        // Accept the reviewer invite (links user to reviewer record)
        // Pass user info in body since we already verified the user client-side
        const response = await fetch('/api/cfp/reviewer/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for session
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete login');
        }

        setStatus('success');

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/cfp/reviewer/dashboard');
        }, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        const errorType = isExpiredLinkError(message) ? 'expired' : 'unknown';

        analytics.track('cfp_auth_failed', {
          auth_type: 'reviewer',
          error_message: message,
          error_type: errorType,
        });
        analytics.error(message, err instanceof Error ? err : undefined, {
          type: 'auth',
          severity: 'medium',
        });

        // Check if this is an expired/invalid link error
        if (errorType === 'expired') {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setErrorMessage(message);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <>
      <SEO
        title="Logging In... | CFP Reviewer"
        description="Completing reviewer authentication"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-brand-gray-dark rounded-2xl p-8 text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <Heading level="h1" className="text-xl font-bold text-white mb-2">
                  Completing Login...
                </Heading>
                <p className="text-brand-gray-light">
                  Please wait while we verify your credentials.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <Heading level="h1" className="text-xl font-bold text-white mb-2">
                  Welcome Back!
                </Heading>
                <p className="text-brand-gray-light">
                  Redirecting to your reviewer dashboard...
                </p>
              </>
            )}

            {status === 'expired' && (
              <>
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Heading level="h1" className="text-xl font-bold text-white mb-2">
                  Link Expired
                </Heading>
                <p className="text-brand-gray-light mb-2">
                  This sign-in link has expired or is no longer valid.
                </p>
                <p className="text-brand-gray-medium text-sm mb-6">
                  Magic links expire after 1 hour for security. Please request a new one.
                </p>
                <Link
                  href="/cfp/reviewer/login"
                  className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-black font-semibold rounded-xl hover:bg-brand-primary-dark transition-colors"
                >
                  Request New Link
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <Heading level="h1" className="text-xl font-bold text-white mb-2">
                  Login Failed
                </Heading>
                <p className="text-brand-gray-light mb-6">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
                <Link
                  href="/cfp/reviewer/login"
                  className="inline-flex items-center justify-center px-6 py-3 bg-brand-primary text-black font-semibold rounded-xl hover:bg-brand-primary-dark transition-colors"
                >
                  Try Again
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
