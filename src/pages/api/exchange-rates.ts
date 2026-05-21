/**
 * Public exchange rates API.
 * Returns server-fetched CHF rates so client surfaces do not call FX providers directly.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import {
  getExchangeRates,
  isSponsorshipDisplayCurrency,
  type SponsorshipDisplayCurrency,
} from '@/lib/sponsorship/currency';
import { logger } from '@/lib/logger';

const log = logger.scope('Exchange Rates API');

const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

const querySchema = z.object({
  base: z.string().optional(),
  symbols: z.string().optional(),
});

function parseSymbols(symbols: string | undefined, base: SponsorshipDisplayCurrency): SponsorshipDisplayCurrency[] {
  const requested = symbols?.split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
    ?? ['EUR', 'GBP', 'USD'];

  const parsed = requested.filter(isSponsorshipDisplayCurrency);
  return parsed.filter((symbol) => symbol !== base);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const rateLimit = rateLimiter.check(ip);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: 'Too many requests' });
  }

  const parsedQuery = querySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsedQuery.error.issues });
  }

  const requestedBase = parsedQuery.data.base?.toUpperCase() ?? 'CHF';
  if (!isSponsorshipDisplayCurrency(requestedBase)) {
    return res.status(400).json({ error: 'Unsupported base currency' });
  }

  const symbols = parseSymbols(parsedQuery.data.symbols, requestedBase);

  try {
    const result = await getExchangeRates(requestedBase, symbols);
    return res.status(200).json(result);
  } catch (error) {
    log.error('Failed to fetch exchange rates', error, { base: requestedBase, symbols });
    return res.status(502).json({ error: 'Failed to fetch exchange rates' });
  }
}
