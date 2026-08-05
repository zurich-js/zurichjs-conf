/**
 * Corporate Access Claim API
 * POST /api/discount/corporate/claim — verifies a signed corporate access code.
 *
 * The code arrives in the request body rather than the query string so it stays
 * out of server access logs and Referer headers. On success the client marks
 * itself as a corporate buyer; this endpoint stores nothing.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyCorporateCode } from '@/lib/discount/corporate-code';
import { logger } from '@/lib/logger';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const log = logger.scope('CorporateClaim');

// Public unauthenticated endpoint doing HMAC work — keep the per-IP budget
// tight. A legitimate client calls this once per link.
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

const bodySchema = z.object({
  code: z.string().trim().min(1).max(512),
});

interface ClaimResponse {
  valid: boolean;
  label?: string;
  expiresAt?: string;
  reason?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { allowed } = limiter.check(getClientIp(req));
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ valid: false, reason: 'malformed' });
  }

  try {
    const result = verifyCorporateCode(parsed.data.code);

    if (!result.valid) {
      // Not an error condition — an old or mistyped link is expected traffic.
      log.info('Corporate code rejected', { reason: result.reason });
      return res.status(200).json({ valid: false, reason: result.reason });
    }

    log.info('Corporate code accepted', { label: result.label });
    return res.status(200).json({
      valid: true,
      label: result.label,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    log.error('Failed to verify corporate code', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
