/**
 * Pages-Router error page: SSR/getInitialProps throws and routing errors.
 * (Client render errors are caught by ErrorBoundary in _app.tsx instead.)
 *
 * Reports to Sentry (awaited so the lambda doesn't freeze before delivery)
 * and renders a branded page instead of Next's bare default. 404s are
 * handled by pages/404.tsx and never reach this component in production.
 */

import * as Sentry from "@sentry/nextjs";
import type { NextPageContext } from "next";
import Error from "next/error";
import Link from "next/link";

interface CustomErrorProps {
  statusCode: number;
}

const CustomErrorComponent = (props: CustomErrorProps) => {
  const isServerFault = props.statusCode >= 500;
  return (
    <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-brand-yellow-main font-mono text-sm mb-3">
          HTTP {props.statusCode || 'error'}
        </p>
        <h1 className="text-3xl font-bold text-brand-white mb-4">
          {isServerFault ? 'Something went wrong on our side' : 'That request didn’t work'}
        </h1>
        <p className="text-brand-gray-light text-sm mb-8">
          {isServerFault
            ? 'The error has been reported automatically. Retrying is safe — nothing is charged twice.'
            : 'The page could not handle that request. Heading back home is the quickest fix.'}
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
          Need help? Email{' '}
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
  );
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  await Sentry.captureUnderscoreErrorException(contextData);

  // This will contain the status code of the response
  return Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
