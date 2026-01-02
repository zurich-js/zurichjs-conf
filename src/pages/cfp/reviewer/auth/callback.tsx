/**
 * CFP Reviewer Auth Callback
 * Handles Supabase magic link redirect for reviewers
 * Uses getServerSideProps to process auth server-side (runs exactly once)
 */

import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { acceptReviewerInvite } from '@/lib/cfp/auth';
import { createAuthCallbackHandler, AuthCallbackPageProps } from '@/lib/cfp/auth-helpers';
import { serverAnalytics } from '@/lib/analytics/server';

export const getServerSideProps = createAuthCallbackHandler({
  flowType: 'reviewer',
  loginPath: '/cfp/reviewer/login',
  dashboardPath: '/cfp/reviewer/dashboard',
  onAuthenticated: async (userId, email) => {
    const { reviewer, error } = await acceptReviewerInvite(userId, email);
    return { data: reviewer, error };
  },
  trackSuccess: async (reviewer) => {
    await serverAnalytics.identify(reviewer.id, {
      email: reviewer.email,
      name: reviewer.name || undefined,
    });

    await serverAnalytics.track('cfp_reviewer_authenticated', reviewer.id, {
      reviewer_id: reviewer.id,
      reviewer_email: reviewer.email,
    });
  },
});

export default function ReviewerAuthCallback({ status, error }: AuthCallbackPageProps) {
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
