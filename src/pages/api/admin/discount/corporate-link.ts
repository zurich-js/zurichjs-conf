/**
 * Corporate Access Link Admin API
 * POST /api/admin/discount/corporate-link — mint a signed link that marks the
 * browser opening it as a corporate buyer, so the discount popup stops offering
 * money off to someone spending a training budget.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { signCorporateCode } from '@/lib/discount/corporate-code';
import { logger } from '@/lib/logger';
import { getBaseUrl } from '@/lib/url';

const log = logger.scope('CorporateLinkAPI');

const bodySchema = z.object({
  label: z.string().trim().min(1).max(80),
  validDays: z.number().int().min(1).max(365).default(90),
});

interface CorporateLinkResponse {
  code: string;
  url: string;
  label: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CorporateLinkResponse | { error: string; issues?: unknown }>
) {
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || isBot) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  try {
    const { label, validDays } = parsed.data;
    const code = signCorporateCode({ label, validDays });

    log.info('Corporate access link created', { label, validDays });

    return res.status(200).json({
      code,
      url: `${getBaseUrl(req)}/corporate/${code}`,
      label,
    });
  } catch (error) {
    log.error('Failed to create corporate access link', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
