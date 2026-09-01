/**
 * Door staff sign-in.
 *
 * WHY NO getServerSideProps
 * Every other login page in this repo blocks the first byte of HTML on a
 * Supabase round trip. A volunteer opening this on venue wifi twenty minutes
 * before doors gets a white screen for the length of that request. Here the
 * shell renders immediately and the session check happens alongside it — if they
 * are already signed in they land on the station a moment later, and if they are
 * not they are already looking at the form.
 *
 * The invitation email links here with `?email=`, so the common path is: tap the
 * link, tap "Send sign-in link", tap the link in the mail. No typing at all.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, MailCheck, ScanLine } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { useDoorSession } from '@/hooks/checkin/useDoorSession';

export default function DoorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolves concurrently with the form rendering. A volunteer who is already
  // signed in never sees this page for more than a moment.
  const session = useDoorSession();

  useEffect(() => {
    if (session.data) void router.replace('/checkin');
  }, [session.data, router]);

  // The invitation link carries the address, so the volunteer types nothing.
  useEffect(() => {
    if (!router.isReady) return;
    const fromLink = router.query.email;
    if (typeof fromLink === 'string') setEmail(fromLink);
  }, [router.isReady, router.query.email]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/checkin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not send the sign-in link');
      }

      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Door check-in"
        description="Sign in to the ZurichJS Conf door check-in station."
        noindex
      />

      <main className="flex min-h-screen items-center justify-center bg-surface-page p-4">
        <div className="w-full max-w-md">
          {sent ? (
            <div className="rounded-2xl bg-surface-card p-8 text-center">
              <MailCheck
                className="mx-auto mb-5 h-12 w-12 text-success"
                aria-hidden="true"
              />
              <Heading level="h1" className="mb-3 text-2xl font-bold">
                Check your email
              </Heading>
              {/* Deliberately does NOT confirm the address is on the crew: this
                  page must not be usable to test who is a volunteer. */}
              <p className="mb-4 text-text-secondary">
                If <span className="font-medium text-text-primary">{email}</span> is on the door
                crew, a sign-in link is on its way. Open it on this phone.
              </p>
              <p className="text-sm text-text-muted">
                Links expire after an hour. Nothing arrived? Check spam, then ask a lead to
                confirm the address they invited.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-card p-8">
              <div className="mb-8 text-center">
                <ScanLine
                  className="mx-auto mb-5 h-12 w-12 text-brand-primary"
                  aria-hidden="true"
                />
                <Heading level="h1" className="mb-2 text-2xl font-bold">
                  Door check-in
                </Heading>
                <p className="text-text-secondary">
                  Sign in with the address a lead invited.
                </p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-error/40 bg-error/10 px-4 py-3"
                >
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-error"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-secondary">{error}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="door-email"
                    className="mb-2 block text-sm font-semibold text-text-primary"
                  >
                    Email address
                  </label>
                  <Input
                    id="door-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    // Keeps a phone keyboard from capitalising and autocorrecting
                    // an address, which on iOS it will do by default.
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    required
                    fullWidth
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  disabled={isSubmitting || email.trim().length === 0}
                  className="w-full"
                >
                  Send sign-in link
                </Button>
              </form>

              <p className="mt-6 border-t border-divider pt-6 text-center text-sm text-text-muted">
                Only invited door staff can sign in. An admin adds volunteers from the admin
                panel.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
