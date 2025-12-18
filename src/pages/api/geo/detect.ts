/**
 * API route for geo detection using external IP geolocation service
 * This replaces Vercel's unreliable geo detection with a direct IP lookup
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const COUNTRY_COOKIE = 'detected-country';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

interface GeoResponse {
  country: string | null;
  source: string;
}

/**
 * Get the client's real IP address from various headers
 */
function getClientIP(req: NextApiRequest): string | null {
  // Check various headers that might contain the real IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    return ip.trim();
  }

  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  // Vercel-specific header
  const vercelIP = req.headers['x-vercel-forwarded-for'];
  if (vercelIP) {
    const ip = Array.isArray(vercelIP) ? vercelIP[0] : vercelIP.split(',')[0];
    return ip.trim();
  }

  return req.socket?.remoteAddress || null;
}

/**
 * Fetch country from ipapi.co (free tier: 1000 requests/day)
 */
async function fetchFromIpApi(ip: string): Promise<string | null> {
  try {
    // ipapi.co returns just the country code when you append /country/
    const response = await fetch(`https://ipapi.co/${ip}/country/`, {
      headers: {
        'User-Agent': 'ZurichJS-Conference/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[Geo] ipapi.co returned ${response.status}`);
      return null;
    }

    const country = await response.text();

    // ipapi.co returns "Undefined" for invalid IPs or errors
    if (country && country !== 'Undefined' && /^[A-Z]{2}$/.test(country.trim())) {
      return country.trim();
    }

    return null;
  } catch (error) {
    console.error('[Geo] ipapi.co fetch failed:', error);
    return null;
  }
}

/**
 * Fetch country from ip-api.com (free tier: 45 requests/minute, non-commercial)
 * Used as fallback
 */
async function fetchFromIpApiCom(ip: string): Promise<string | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      headers: {
        'User-Agent': 'ZurichJS-Conference/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[Geo] ip-api.com returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.countryCode && /^[A-Z]{2}$/.test(data.countryCode)) {
      return data.countryCode;
    }

    return null;
  } catch (error) {
    console.error('[Geo] ip-api.com fetch failed:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeoResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ country: null, source: 'error' });
  }

  // Check if we already have a country cookie
  const existingCountry = req.cookies[COUNTRY_COOKIE];
  if (existingCountry && /^[A-Z]{2}$/.test(existingCountry)) {
    return res.status(200).json({ country: existingCountry, source: 'cookie' });
  }

  // Check for dev override
  if (process.env.NODE_ENV !== 'production') {
    const devCountry = req.cookies['dev_country'];
    if (devCountry && /^[A-Z]{2}$/i.test(devCountry)) {
      const country = devCountry.toUpperCase();
      console.log(`[Geo] Using dev override: ${country}`);
      return res.status(200).json({ country, source: 'dev_override' });
    }
  }

  // Get the client's IP
  const ip = getClientIP(req);
  console.log(`[Geo] Detecting country for IP: ${ip}`);

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    console.log('[Geo] Local/private IP detected, cannot determine country');
    return res.status(200).json({ country: null, source: 'local_ip' });
  }

  let country: string | null = null;
  let source = 'unknown';

  // Try ipapi.co first
  country = await fetchFromIpApi(ip);
  if (country) {
    source = 'ipapi.co';
  } else {
    // Fallback to ip-api.com
    country = await fetchFromIpApiCom(ip);
    if (country) {
      source = 'ip-api.com';
    }
  }

  if (country) {
    console.log(`[Geo] Detected country: ${country} from ${source}`);

    // Set the cookie for future requests
    res.setHeader(
      'Set-Cookie',
      `${COUNTRY_COOKIE}=${country}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
  } else {
    console.log('[Geo] Could not detect country');
  }

  return res.status(200).json({ country, source });
}
