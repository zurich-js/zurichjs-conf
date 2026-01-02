/**
 * CFP Speaker Login Page
 * Magic link authentication for speakers
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Input, Button, Heading } from '@/components/atoms';
import { cfpLoginSchema } from '@/lib/validations/cfp';
import { trackCfpLoginAttempt, captureValidationError } from '@/lib/analytics/helpers';

type LoginState = 'idle' | 'loading' | 'success' | 'error';

function CfpLogin() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<LoginState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const result = cfpLoginSchema.safeParse({ email });
    if (!result.success) {
      const errorMessage = result.error.issues[0].message;
      setError(errorMessage);
      captureValidationError(errorMessage, {
        flow: 'cfp_speaker_login',
        action: 'validate_email',
        userEmail: email,
      });
      return;
    }

    setState('loading');

    try {
      const response = await fetch('/api/cfp/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      // Track successful login request
      trackCfpLoginAttempt({ type: 'speaker', email, success: true });
      setState('success');
    } catch (err) {
      setState('error');
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);

      // Track failed login attempt
      trackCfpLoginAttempt({ type: 'speaker', email, success: false, errorMessage });
    }
  };

  return (
    <>
      <SEO
        title="Speaker Login | CFP"
        description="Log in to manage your CFP submissions for ZurichJS Conf 2026"
        canonical="/cfp/login"
        noindex
      />

      <main className="min-h-screen bg-brand-gray-darkest flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-6">
              <img
                src="/images/logo/zurichjs-square.png"
                alt="ZurichJS"
                className="h-16 w-16 mx-auto"
              />
            </Link>
            <Heading level="h1" className="text-2xl font-bold text-white mb-2">
              Speaker Login
            </Heading>
            <p className="text-brand-gray-light">
              ZurichJS Conf 2026 - Call for Papers
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-brand-gray-dark rounded-2xl p-8">
            {state === 'success' ? (
              /* Success State */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
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
                <Heading level="h2" className="text-xl font-semibold text-white mb-2">
                  Check your email
                </Heading>
                <p className="text-brand-gray-light mb-4">
                  We&apos;ve sent a magic link to <span className="text-white font-medium">{email}</span>
                </p>
                <p className="text-sm text-brand-gray-medium">
                  Click the link in the email to sign in. The link expires in 1 hour.
                </p>
                <button
                  onClick={() => {
                    setState('idle');
                    setEmail('');
                  }}
                  className="mt-6 text-brand-primary hover:text-brand-primary/80 text-sm font-medium transition-colors cursor-pointer"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              /* Login Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-white mb-2"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    fullWidth
                    error={error || undefined}
                    disabled={state === 'loading'}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={state === 'loading'}
                  disabled={state === 'loading'}
                  className="w-full"
                >
                  {state === 'loading' ? 'Sending...' : 'Send Magic Link'}
                </Button>

                <p className="text-center text-sm text-brand-gray-medium">
                  We&apos;ll send you a secure link to sign in. No password needed.
                </p>
              </form>
            )}
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <Link
              href="/cfp"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to CFP
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default CfpLogin;
