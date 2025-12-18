/**
 * Server-side geo-detection utilities
 * Detects user country from cookies set by the geo detection API
 *
 * Local Development:
 * - Set cookie `dev_country=DE` to simulate being in Germany
 */

import type { GetServerSidePropsContext, NextApiRequest } from 'next';
import type { IncomingMessage } from 'http';

type RequestLike = NextApiRequest | IncomingMessage | GetServerSidePropsContext['req'];

/**
 * Cookie name for local development country override
 */
const DEV_COUNTRY_COOKIE = 'dev_country';

/**
 * Cookie name set by geo detection API (/api/geo/detect)
 */
const DETECTED_COUNTRY_COOKIE = 'detected-country';

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
 * Detect user's country from request cookies
 *
 * The country is detected via /api/geo/detect which uses external IP geolocation APIs.
 * This function reads the cookie set by that API.
 *
 * Local Development Override:
 * - Set cookie `dev_country=DE` in browser to simulate Germany
 * - Example: `document.cookie = 'dev_country=DE; path=/'`
 * - To clear: `document.cookie = 'dev_country=; path=/; max-age=0'`
 *
 * @param req - Next.js API request or incoming message from getServerSideProps
 * @returns ISO 3166-1 alpha-2 country code (uppercase) or null if not detected
 */
export function detectCountryFromRequest(req: RequestLike): string | null {
  const { headers } = req;

  // Parse cookies once
  const cookieHeader = headers.cookie;
  const cookies = parseCookies(
    typeof cookieHeader === 'string' ? cookieHeader : cookieHeader?.[0]
  );

  // Development override via cookie (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    const devCountry = cookies[DEV_COUNTRY_COOKIE];
    if (devCountry && isValidCountryCode(devCountry)) {
      console.log(`[Geo] Using dev override country: ${devCountry.toUpperCase()}`);
      return devCountry.toUpperCase();
    }
  }

  // Read country from cookie set by /api/geo/detect
  const detectedCountry = cookies[DETECTED_COUNTRY_COOKIE];
  if (detectedCountry && isValidCountryCode(detectedCountry)) {
    return detectedCountry.toUpperCase();
  }

  // Fallback: Check Vercel's geo header directly (works on first visit before cookie is set)
  const vercelCountry = headers['x-vercel-ip-country'];
  if (vercelCountry) {
    const country = Array.isArray(vercelCountry) ? vercelCountry[0] : vercelCountry;
    if (isValidCountryCode(country)) {
      console.log(`[Geo] Using Vercel geo header: ${country.toUpperCase()}`);
      return country.toUpperCase();
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
