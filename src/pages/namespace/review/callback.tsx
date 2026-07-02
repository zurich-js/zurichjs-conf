import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { isExpiredLinkError } from '@/lib/cfp/auth-constants';
import { supabase } from '@/lib/supabase/client';

type CallbackStatus = 'loading' | 'success' | 'error' | 'expired';

export default function NamespaceReviewCallbackPage() {
  const router = useRouter();
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          const errorMessage = errorDescription || errorParam;
          setStatus(isExpiredLinkError(errorMessage) ? 'expired' : 'error');
          setError(errorMessage);
          return;
        }

        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashError = hashParams.get('error_description');

        if (hashError) {
          setStatus(isExpiredLinkError(hashError) ? 'expired' : 'error');
          setError(hashError);
          return;
        }

        if (!accessToken) {
          router.replace('/namespace/review?error=no_tokens');
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw sessionError;
        }

        setStatus('success');
        router.replace('/namespace/review');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setStatus(isExpiredLinkError(errorMessage) ? 'expired' : 'error');
        setError(errorMessage);
      }
    };

    void handleAuth();
  }, [router]);

  return (
    <>
      <SEO
        title="Signing In | Namespace Review"
        description="Completing Namespace sponsorship review sign in"
        noindex
      />
      <main className="flex min-h-screen items-center justify-center bg-brand-gray-darkest px-4">
        <div className="w-full max-w-md rounded-2xl bg-brand-gray-dark p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
              <Heading level="h1" className="mb-2 text-xl font-bold text-white">
                Signing you in...
              </Heading>
            </>
          )}

          {status === 'success' && (
            <>
              <Heading level="h1" className="mb-2 text-xl font-bold text-white">
                Signed in
              </Heading>
              <p className="text-brand-gray-light">Redirecting...</p>
            </>
          )}

          {(status === 'error' || status === 'expired') && (
            <>
              <Heading level="h1" className="mb-2 text-xl font-bold text-white">
                {status === 'expired' ? 'Link expired' : 'Sign in failed'}
              </Heading>
              <p className="mb-6 text-sm text-brand-gray-light">
                {error || 'Request a new magic link.'}
              </p>
              <Link
                href="/namespace/review"
                className="inline-flex rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-black"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
