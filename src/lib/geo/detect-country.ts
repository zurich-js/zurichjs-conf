/**
 * Server-side geo-detection utilities
 * Detects user country from request headers set by CDN/hosting providers
 *
 * Local Development:
 * - Set cookie `dev_country=DE` to simulate being in Germany
 * - Or add query param `?dev_country=DE` to the URL
 */

import type { GetServerSidePropsContext, NextApiRequest } from 'next';
import type { IncomingMessage } from 'http';

type RequestLike = NextApiRequest | IncomingMessage | GetServerSidePropsContext['req'];

/**
 * Header names for country detection from various providers
 * Listed in priority order
 */
const COUNTRY_HEADERS = [
  'x-vercel-ip-country', // Vercel Edge Network
  'cf-ipcountry', // Cloudflare
  'cloudfront-viewer-country', // AWS CloudFront
] as const;

/**
 * Cookie name for local development country override
 */
const DEV_COUNTRY_COOKIE = 'dev_country';

/**
 * Extract a header value from a request object
 * Handles both string and string[] header values
 */
function getHeaderValue(
  headers: RequestLike['headers'],
  headerName: string
): string | null {
  const value = headers[headerName];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  return null;
}

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
      return cookies;
    },
    {} as Record<string, string>
  );
}

/**
 * Detect user's country from request headers
 *
 * Works with:
 * - Vercel Edge Network (x-vercel-ip-country)
 * - Cloudflare (cf-ipcountry)
 * - AWS CloudFront (cloudfront-viewer-country)
 *
 * Local Development Override:
 * - Set cookie `dev_country=DE` in browser to simulate Germany
 * - Example: `document.cookie = 'dev_country=DE; path=/'`
 * - To clear: `document.cookie = 'dev_country=; path=/; max-age=0'`
 *
 * @param req - Next.js API request or incoming message from getServerSideProps
 * @returns ISO 3166-1 alpha-2 country code (uppercase) or null if not detected
 *
 * @example
 * // In getServerSideProps
 * const country = detectCountryFromRequest(context.req);
 * // Returns 'DE' for Germany, 'CH' for Switzerland, etc.
 *
 * @example
 * // In API route
 * const country = detectCountryFromRequest(req);
 */
export function detectCountryFromRequest(req: RequestLike): string | null {
  const { headers } = req;

  // Development override via cookie (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    const cookieHeader = headers.cookie;
    const cookies = parseCookies(
      typeof cookieHeader === 'string' ? cookieHeader : cookieHeader?.[0]
    );

    const devCountry = cookies[DEV_COUNTRY_COOKIE];
    if (devCountry && isValidCountryCode(devCountry)) {
      console.log(`[Geo] Using dev override country: ${devCountry.toUpperCase()}`);
      return devCountry.toUpperCase();
    }
  }

  // Production: check CDN headers
  for (const headerName of COUNTRY_HEADERS) {
    const value = getHeaderValue(headers, headerName);
    if (value) {
      // Normalize to uppercase
      return value.toUpperCase();
    }
  }

  return null;
}

/**
 * Check if a country code is valid (basic validation)
 * @param countryCode - Country code to validate
 * @returns True if the code appears to be a valid ISO 3166-1 alpha-2 code
 */
export function isValidCountryCode(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  // ISO 3166-1 alpha-2 codes are exactly 2 uppercase letters
  return /^[A-Z]{2}$/.test(countryCode.toUpperCase());
}
