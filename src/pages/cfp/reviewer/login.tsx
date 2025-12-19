/**
 * CFP Reviewer Login Page
 * Magic link authentication for reviewers
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Button, Heading, Input } from '@/components/atoms';
import { withCfpGate } from '@/components/cfp/CfpGate';

function ReviewerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from URL query params (from invitation link)
  useEffect(() => {
    if (router.isReady && router.query.email) {
      setEmail(router.query.email as string);
    }
  }, [router.isReady, router.query.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/cfp/reviewer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send login link');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Reviewer Login | CFP"
        description="Log in to review CFP submissions for ZurichJS Conf 2026"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest flex flex-col">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">CFP Reviewer</span>
            </Link>
            <Link
              href="/cfp/login"
              className="text-brand-gray-light hover:text-white text-sm transition-colors"
            >
              Speaker Login
            </Link>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {success ? (
              <div className="bg-brand-gray-dark rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-4">
                  Check Your Email
                </Heading>
                <p className="text-brand-gray-light mb-6">
                  We sent a login link to <span className="text-white font-medium">{email}</span>.
                  Click the link in your email to access the reviewer dashboard.
                </p>
                <p className="text-sm text-brand-gray-medium">
                  Link expires in 1 hour. Check spam if not received.
                </p>
              </div>
            ) : (
              <div className="bg-brand-gray-dark rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <Heading level="h1" className="text-2xl font-bold text-white mb-2">
                    Reviewer Login
                  </Heading>
                  <p className="text-brand-gray-light">
                    Enter your email to access the review dashboard
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      fullWidth
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    disabled={isSubmitting || !email}
                    className="w-full"
                  >
                    Send Login Link
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-brand-gray-medium text-center">
                  <p className="text-sm text-brand-gray-medium">
                    Only invited reviewers can access this portal.
                    Contact an admin if you need access.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default withCfpGate(ReviewerLoginPage);
