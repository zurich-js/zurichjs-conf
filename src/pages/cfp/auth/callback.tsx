/**
 * CFP Auth Callback Page
 * Handles magic link authentication redirect from Supabase
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';

type CallbackState = 'loading' | 'success' | 'error';

export default function CfpAuthCallback() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First check if there's a code in the URL query params (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        const errorDescriptionParam = urlParams.get('error_description');

        // Handle error from Supabase in query params
        if (errorParam) {
          throw new Error(errorDescriptionParam || errorParam);
        }

        // If there's a code, exchange it for a session (PKCE flow)
        if (code) {
          console.log('[CFP Auth Callback] Exchanging code for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[CFP Auth Callback] Code exchange error:', exchangeError);
            throw new Error(exchangeError.message);
          }

          if (!data.session) {
            throw new Error('Failed to establish session from code');
          }

          console.log('[CFP Auth Callback] Session established via PKCE');
        } else {
          // Try hash fragment (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorDescription = hashParams.get('error_description');

          // Check for error in URL hash
          if (errorDescription) {
            throw new Error(errorDescription);
          }

          // If we have tokens in the hash, set the session
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              throw sessionError;
            }
          }
        }

        // Verify the user with Supabase Auth server (more secure than getSession)
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('[CFP Auth Callback] User verification error:', userError);
          throw userError;
        }

        if (!user) {
          // No authenticated user - redirect to login
          router.replace('/cfp/login');
          return;
        }

        console.log('[CFP Auth Callback] User verified:', user.email);

        // Get the current session to pass tokens to the API for server-side cookie setting
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        // Create/update speaker profile and set server-side session cookies
        const response = await fetch('/api/cfp/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include cookies for session
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            access_token: currentSession?.access_token,
            refresh_token: currentSession?.refresh_token,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to set up speaker profile');
        }

        setState('success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.replace('/cfp/dashboard');
        }, 1500);
      } catch (err) {
        console.error('[CFP Auth Callback] Error:', err);
        setState('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <>
      <SEO
        title="Signing In | CFP"
        description="Completing your sign in to ZurichJS Conf 2026 CFP"
        noindex
      />

      <main className="min-h-screen bg-brand-gray-darkest flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <img
              src="/images/logo/zurichjs-square.png"
              alt="ZurichJS"
              className="h-16 w-16 mx-auto"
            />
          </Link>

          {state === 'loading' && (
            <div className="space-y-4">
              {/* Loading Spinner */}
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <Heading level="h1" className="text-xl font-semibold text-white">
                Signing you in...
              </Heading>
              <p className="text-brand-gray-light">
                Please wait while we verify your credentials
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-4">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <Heading level="h1" className="text-xl font-semibold text-white">
                Welcome back!
              </Heading>
              <p className="text-brand-gray-light">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <Heading level="h1" className="text-xl font-semibold text-white">
                Authentication Failed
              </Heading>
              <p className="text-brand-gray-light">
                {error || 'We couldn\'t sign you in. Please try again.'}
              </p>
              <div className="pt-4">
                <Link
                  href="/cfp/login"
                  className="inline-flex items-center gap-2 text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
