/**
 * Completes a door staff sign-in.
 *
 * Supabase sends the volunteer back here with tokens in the URL fragment (the
 * implicit flow). This page establishes the session, links the invitation to the
 * account on first sign-in, and forwards to the station.
 *
 * WHY IT REDIRECTS RATHER THAN SHOWING A "DONE" SCREEN
 * The next action is always the same: open the station and start scanning. A
 * confirmation screen would add a tap for every volunteer, every shift, and the
 * one thing this whole system is spending effort on is taps.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { isExpiredLinkError } from '@/lib/cfp/auth-constants';

type CallbackStatus = 'working' | 'expired' | 'error';

export default function DoorAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('working');
  const [message, setMessage] = useState<string | null>(null);

  // Strict mode mounts effects twice in development; exchanging the same tokens
  // twice fails the second time and would show a spurious error.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fail = (reason: string) => {
      setStatus(isExpiredLinkError(reason) ? 'expired' : 'error');
      setMessage(reason);
    };

    const run = async () => {
      try {
        // Supabase reports a refusal in the query string and a token exchange in
        // the fragment, so both have to be read.
        const query = new URLSearchParams(window.location.search);
        const queryError = query.get('error_description') ?? query.get('error');
        if (queryError) return fail(queryError);

        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const fragmentError = fragment.get('error_description');
        if (fragmentError) return fail(fragmentError);

        const accessToken = fragment.get('access_token');
        if (!accessToken) {
          // Landing here with no tokens means the link was opened twice or
          // truncated by a mail client. Sending them back to sign in is more
          // useful than an error they cannot act on.
          void router.replace('/checkin/login');
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: fragment.get('refresh_token') ?? '',
        });
        if (sessionError) return fail(sessionError.message);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user?.email) {
          return fail(userError?.message ?? 'Could not read the signed-in account');
        }

        const response = await fetch('/api/checkin/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: user.id, email: user.email }),
        });

        if (!response.ok) {
          const body: { error?: string } = await response.json().catch(() => ({}));
          return fail(body.error ?? 'This account is not on the door crew');
        }

        // Replace, not push: the back button must not return to a URL still
        // carrying an access token in its fragment.
        void router.replace('/checkin');
      } catch (caught) {
        fail(caught instanceof Error ? caught.message : 'Sign-in failed');
      }
    };

    void run();
  }, [router]);

  return (
    <>
      <SEO title="Signing in" description="Completing door staff sign-in." noindex />

      <main className="flex min-h-screen items-center justify-center bg-surface-page p-4">
        <div
          className="w-full max-w-md rounded-2xl bg-surface-card p-8 text-center"
          aria-live="polite"
        >
          {status === 'working' ? (
            <>
              <Loader2
                className="mx-auto mb-5 h-10 w-10 animate-spin text-brand-primary"
                aria-hidden="true"
              />
              <Heading level="h1" className="mb-2 text-xl font-bold">
                Signing you in
              </Heading>
              <p className="text-text-secondary">One moment.</p>
            </>
          ) : null}

          {status === 'expired' ? (
            <>
              <Clock className="mx-auto mb-5 h-10 w-10 text-warning" aria-hidden="true" />
              <Heading level="h1" className="mb-2 text-xl font-bold">
                That link has expired
              </Heading>
              <p className="mb-6 text-text-secondary">
                Sign-in links last an hour. Request a fresh one — it takes a few seconds.
              </p>
              <Link
                href="/checkin/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-6 font-semibold text-brand-black transition-colors hover:bg-brand-dark"
              >
                Get a new link
              </Link>
            </>
          ) : null}

          {status === 'error' ? (
            <>
              <AlertCircle className="mx-auto mb-5 h-10 w-10 text-error" aria-hidden="true" />
              <Heading level="h1" className="mb-2 text-xl font-bold">
                Could not sign you in
              </Heading>
              <p className="mb-6 text-text-secondary">
                {message ?? 'Something went wrong.'}
              </p>
              <Link
                href="/checkin/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-6 font-semibold text-brand-black transition-colors hover:bg-brand-dark"
              >
                Try again
              </Link>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
