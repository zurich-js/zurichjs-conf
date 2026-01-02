/**
 * CFP Auth Callback Page
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

export default function CfpAuthCallback() {
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
          router.replace('/cfp/login?error=no_tokens');
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

        // Create speaker profile via API
        const response = await fetch('/api/cfp/auth/callback', {
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
          throw new Error(data.error || 'Failed to set up speaker profile');
        }

        setStatus('success');

        // Redirect to dashboard
        setTimeout(() => {
          router.replace('/cfp/dashboard');
        }, 1000);
      } catch (err) {
        console.error('[CFP Auth Callback] Error:', err);
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
        title="Signing In | CFP"
        description="Completing your sign in to ZurichJS Conf 2026 CFP"
        noindex
      />

      <main className="min-h-screen bg-brand-gray-darkest flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-block mb-8">
            <img
              src="/images/logo/zurichjs-square.png"
              alt="ZurichJS"
              className="h-16 w-16 mx-auto"
            />
          </Link>

          {status === 'loading' && (
            <div className="space-y-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <Heading level="h1" className="text-xl font-semibold text-white">
                Signing you in...
              </Heading>
              <p className="text-brand-gray-light">
                Please wait while we verify your credentials
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Heading level="h1" className="text-xl font-semibold text-white">
                Link Expired
              </Heading>
              <p className="text-brand-gray-light">
                This sign-in link has expired or is no longer valid.
              </p>
              <p className="text-brand-gray-medium text-sm">
                Magic links expire after 1 hour for security. Please request a new one.
              </p>
              <div className="pt-4">
                <Link
                  href="/cfp/login"
                  className="inline-block px-6 py-3 bg-brand-primary text-black font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors"
                >
                  Request New Link
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
