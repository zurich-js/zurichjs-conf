/**
 * Public networking QR image.
 * Encodes only the namespaced public share path and campaign attribution.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';
import { logger } from '@/lib/logger';
import { isValidNetworkingPublicId } from '@/lib/networking/profiles';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getAbsoluteUrl } from '@/lib/url';

const log = logger.scope('Networking QR API');
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';
const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (typeof id !== 'string' || !isValidNetworkingPublicId(id)) {
    res.status(400).json({ error: 'Invalid networking profile ID' });
    return;
  }

  const rateLimit = rateLimiter.check(getClientIp(req));
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  try {
    // Publicly cached QR payloads must never depend on attacker-controlled Host
    // or Origin headers. Calling without req requires the configured base URL.
    const shareUrl = new URL(getAbsoluteUrl(`/share/${id}`));
    shareUrl.searchParams.set('utm_source', 'offline');
    shareUrl.searchParams.set('utm_medium', 'qr_code');
    shareUrl.searchParams.set('utm_campaign', 'zurichjs_networking');

    const image = await QRCode.toBuffer(shareUrl.toString(), {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(image);
  } catch (error) {
    log.error('Failed to generate networking QR code', error, { publicId: id });
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}
