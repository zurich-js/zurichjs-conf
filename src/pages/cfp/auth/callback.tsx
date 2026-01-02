/**
 * CFP Auth Callback Page
 * Handles magic link authentication redirect from Supabase
 * Uses getServerSideProps to process auth server-side (runs exactly once)
 */

import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { getOrCreateSpeaker } from '@/lib/cfp/auth';
import { createAuthCallbackHandler, AuthCallbackPageProps } from '@/lib/cfp/auth-helpers';
import { serverAnalytics } from '@/lib/analytics/server';

export const getServerSideProps = createAuthCallbackHandler({
  flowType: 'speaker',
  loginPath: '/cfp/login',
  dashboardPath: '/cfp/dashboard',
  onAuthenticated: async (userId, email) => {
    const { speaker, error } = await getOrCreateSpeaker(userId, email);
    return { data: speaker, error };
  },
  trackSuccess: async (speaker) => {
    await serverAnalytics.identify(speaker.id, {
      email: speaker.email,
      first_name: speaker.first_name || undefined,
      last_name: speaker.last_name || undefined,
      company: speaker.company || undefined,
      job_title: speaker.job_title || undefined,
    });

    await serverAnalytics.track('cfp_speaker_authenticated', speaker.id, {
      speaker_id: speaker.id,
      is_new_speaker: !speaker.first_name,
      is_profile_complete: !!(speaker.first_name && speaker.last_name && speaker.bio),
    });
  },
});

export default function CfpAuthCallback({ status, error }: AuthCallbackPageProps) {
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

          {status === 'success' && (
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

          {status === 'expired' && (
            <div className="space-y-4">
              {/* Clock/Expired Icon */}
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
