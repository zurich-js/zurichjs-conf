/**
 * CFP Reviewer Auth Callback
 * Handles magic link authentication redirect from Supabase (implicit flow)
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { isExpiredLinkError } from '@/lib/cfp/auth-constants';

type CallbackStatus = 'loading' | 'success' | 'error' | 'expired';

export default function ReviewerAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<string>();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleAuth = async () => {
      try {
        // Check for error in query params
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          const errorMessage = errorDescription || errorParam;
          const isExpired = isExpiredLinkError(errorMessage);
          setStatus(isExpired ? 'expired' : 'error');
          setError(errorMessage);
          return;
        }

        // Check for tokens in hash fragment (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashError = hashParams.get('error_description');

        if (hashError) {
          const isExpired = isExpiredLinkError(hashError);
          setStatus(isExpired ? 'expired' : 'error');
          setError(hashError);
          return;
        }

        if (!accessToken) {
          router.replace('/cfp/reviewer/login?error=no_tokens');
          return;
        }

        // Set session from hash tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw sessionError;
        }

        // Verify user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(userError?.message || 'Failed to verify user');
        }

        if (!user.email) {
          throw new Error('No email associated with account');
        }

        // Accept reviewer invite via API
        const response = await fetch('/api/cfp/reviewer/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to accept invitation');
        }

        setStatus('success');

        setTimeout(() => {
          router.replace('/cfp/reviewer/dashboard');
        }, 1000);
      } catch (err) {
        console.error('[Reviewer Auth Callback] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        const isExpired = isExpiredLinkError(errorMessage);
        setStatus(isExpired ? 'expired' : 'error');
        setError(errorMessage);
      }
    };

    handleAuth();
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
                <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                <Heading level="h1" className="text-xl font-bold text-white mb-2">
                  Signing you in...
                </Heading>
                <p className="text-brand-gray-light">
                  Please wait while we verify your credentials
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
                  {error || 'Something went wrong. Please try again.'}
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
