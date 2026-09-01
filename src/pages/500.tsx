/**
 * Branded 500 page. Statically generated — must not depend on runtime data,
 * because it renders exactly when the server is having a bad day.
 */

import Link from 'next/link';
import { SEO } from '@/components/SEO';

export default function InternalServerErrorPage() {
  return (
    <>
      <SEO
        title="Something went wrong"
        description="An unexpected error occurred on the ZurichJS Conference site."
        noindex
      />
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <p className="text-brand-yellow-main font-mono text-sm mb-3">HTTP 500</p>
          <h1 className="text-3xl font-bold text-brand-white mb-4">
            Something went wrong on our side
          </h1>
          <p className="text-brand-gray-light text-sm mb-8">
            The error has been reported automatically and we&apos;re on it. Your tickets and
            payments are safe — nothing is charged twice by retrying.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-yellow-main px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-main focus-visible:ring-offset-2 focus-visible:ring-offset-brand-gray-darkest"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-brand-gray-dark px-5 py-2.5 text-sm font-semibold text-brand-white hover:border-brand-gray-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-main"
            >
              Back to home
            </Link>
          </div>
          <p className="mt-8 text-xs text-brand-gray-light">
            Urgent (e.g. at the venue)? Email{' '}
            <a
              href="mailto:hello@zurichjs.com?subject=Site%20error"
              className="underline hover:text-brand-yellow-main"
            >
              hello@zurichjs.com
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
