/**
 * URL Utility
 * Centralized URL handling for client and server environments
 */

import type { NextApiRequest } from 'next';
import type { IncomingMessage } from 'http';
import { clientEnv } from '@/config/env';

/**
 * The URL of the current Vercel PREVIEW deployment, if this is one.
 *
 * Returns null on production and on any non-Vercel environment, so the normal
 * NEXT_PUBLIC_BASE_URL path is untouched everywhere that matters.
 *
 * Both spellings are read because only the NEXT_PUBLIC_ ones exist in the
 * browser bundle, and only the bare ones are guaranteed on the server.
 */
function getVercelPreviewUrl(): string | null {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  if (env !== 'preview') return null;

  const host = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  // VERCEL_URL is a bare host with no scheme.
  return host ? `https://${host}` : null;
}

/**
 * Get the base URL for the application
 *
 * Client-side: Uses NEXT_PUBLIC_BASE_URL from environment
 * Server-side: Uses NEXT_PUBLIC_BASE_URL, or falls back to request headers if provided
 *
 * @param req - Optional request object (server-side only)
 * @returns The base URL (e.g., 'https://zurichjs.com')
 * @throws Error if NEXT_PUBLIC_BASE_URL is not set and no request is provided
 */
export function getBaseUrl(req?: NextApiRequest | IncomingMessage): string {
  // A Vercel preview deployment must describe ITSELF, never production.
  //
  // NEXT_PUBLIC_BASE_URL is normally set once at the project level, so it points
  // at the production domain in every environment. That is actively dangerous on
  // a preview: this value builds the door staff magic-link redirect and the QR
  // payload printed on badges, so a volunteer testing a preview would be sent to
  // the PRODUCTION app and sign in against the production database — checking
  // real attendees in while trying to rehearse.
  //
  // Vercel sets VERCEL_ENV/VERCEL_URL on every deployment, and their
  // NEXT_PUBLIC_ twins when "Automatically expose System Environment Variables"
  // is on (the default).
  const previewUrl = getVercelPreviewUrl();
  if (previewUrl) {
    return previewUrl;
  }

  // Client-side: Always use NEXT_PUBLIC_BASE_URL
  if (typeof window !== 'undefined') {
    return clientEnv.baseUrl;
  }

  // Server-side: Try NEXT_PUBLIC_BASE_URL first
  const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }

  // Server-side fallback: Use request headers if provided
  if (req?.headers) {
    const origin = req.headers.origin;
    if (origin) {
      return origin;
    }

    const host = req.headers.host;
    if (host) {
      // Determine protocol based on host
      // localhost and .local domains use http, everything else uses https
      const protocol = host.includes('localhost') || host.endsWith('.local') ? 'http' : 'https';
      return `${protocol}://${host}`;
    }
  }

  // If we reach here, configuration is incomplete
  throw new Error(
    'NEXT_PUBLIC_BASE_URL environment variable is not set and no request object was provided. ' +
    'Please set NEXT_PUBLIC_BASE_URL in your environment variables.'
  );
}

/**
 * Create an absolute URL from a path
 *
 * @param path - The path to convert to absolute URL (e.g., '/api/tickets')
 * @param req - Optional request object for server-side URL generation
 * @returns Absolute URL (e.g., 'https://zurichjs.com/api/tickets')
 */
export function getAbsoluteUrl(path: string, req?: NextApiRequest | IncomingMessage): string {
  const baseUrl = getBaseUrl(req);
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get Stripe redirect URLs for checkout sessions
 *
 * @param req - Request object for server-side URL generation
 * @param encodedCartState - Optional encoded cart state to include in cancel URL
 * @returns Object containing success and cancel URLs with placeholders for Stripe
 */
export function getStripeRedirectUrls(
  req: NextApiRequest | IncomingMessage,
  encodedCartState?: string
): {
  successUrl: string;
  cancelUrl: string;
} {
  const baseUrl = getBaseUrl(req);

  // Include cart state in cancel URL so user can resume checkout
  const cancelUrl = encodedCartState
    ? `${baseUrl}/cart?cart=${encodedCartState}`
    : `${baseUrl}/cart`;

  return {
    successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl,
  };
}

/**
 * Get Stripe return URL for embedded checkout sessions.
 * Embedded checkout uses a single return_url instead of success_url + cancel_url.
 */
export function getStripeReturnUrl(
  req: NextApiRequest | IncomingMessage
): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
}
