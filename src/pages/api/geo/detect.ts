/**
 * API route for geo detection using external IP geolocation service
 * This replaces Vercel's unreliable geo detection with a direct IP lookup
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';

const log = logger.scope('Geo Detection');

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
      log.error('ipapi.co returned error status', { status: response.status });
      return null;
    }

    const country = await response.text();

    // ipapi.co returns "Undefined" for invalid IPs or errors
    if (country && country !== 'Undefined' && /^[A-Z]{2}$/.test(country.trim())) {
      return country.trim();
    }

    return null;
  } catch (error) {
    log.error('ipapi.co fetch failed', error);
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
      log.error('ip-api.com returned error status', { status: response.status });
      return null;
    }

    const data = await response.json();

    if (data.countryCode && /^[A-Z]{2}$/.test(data.countryCode)) {
      return data.countryCode;
    }

    return null;
  } catch (error) {
    log.error('ip-api.com fetch failed', error);
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
      log.info('Using dev override', { country });
      return res.status(200).json({ country, source: 'dev_override' });
    }
  }

  // Log all relevant headers for debugging
  log.info('Debug info', {
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-real-ip': req.headers['x-real-ip'],
    'x-vercel-forwarded-for': req.headers['x-vercel-forwarded-for'],
    'x-vercel-ip-country': req.headers['x-vercel-ip-country'],
    'socket.remoteAddress': req.socket?.remoteAddress,
  });

  // Get the client's IP
  const ip = getClientIP(req);
  log.info('Resolved IP', { ip });

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    log.info('Local/private IP detected, cannot determine country');
    return res.status(200).json({ country: null, source: 'local_ip' });
  }

  let country: string | null = null;
  let source = 'unknown';

  // Try ipapi.co first
  log.info('Trying ipapi.co', { ip });
  country = await fetchFromIpApi(ip);
  log.info('ipapi.co result', { country });
  if (country) {
    source = 'ipapi.co';
  } else {
    // Fallback to ip-api.com
    log.info('Trying ip-api.com', { ip });
    country = await fetchFromIpApiCom(ip);
    log.info('ip-api.com result', { country });
    if (country) {
      source = 'ip-api.com';
    }
  }

  if (country) {
    log.info('Final result', { country, source });

    // Set the cookie for future requests
    res.setHeader(
      'Set-Cookie',
      `${COUNTRY_COOKIE}=${country}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
  } else {
    log.info('Could not detect country from any source');
  }

  return res.status(200).json({ country, source });
}
