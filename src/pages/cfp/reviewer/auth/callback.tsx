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

export default function ReviewerAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
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
          console.log('[Reviewer Auth Callback] Exchanging code for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Reviewer Auth Callback] Code exchange error:', exchangeError);
            throw new Error(exchangeError.message);
          }

          if (!data.session) {
            throw new Error('Failed to establish session from code');
          }

          console.log('[Reviewer Auth Callback] Session established via PKCE');
        } else {
          // Try hash fragment (implicit flow) or existing session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');

          if (accessToken) {
            console.log('[Reviewer Auth Callback] Setting session from hash tokens...');
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

        console.log('[Reviewer Auth Callback] User verified:', user.email);

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
        console.error('[Reviewer Auth Callback] Error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
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
