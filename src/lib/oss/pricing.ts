/**
 * Resolve the current Stripe price ID for a chosen OSS ticket tier.
 *
 * The applicant picks "standard" or "vip" at submission time; we record their
 * choice, but resolve the *current* price at approval time so a multi-week
 * admin review delay doesn't lock the applicant into stale pricing.
 */

import { getStripeClient } from '@/lib/stripe/client';
import { getCurrentStage, type PriceStage } from '@/config/pricing-stages';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { logger } from '@/lib/logger';
import type { OssTicketTier } from './types';

const log = logger.scope('OSS Pricing');

function lookupKeyFor(tier: OssTicketTier, stage: PriceStage, currency: SupportedCurrency): string {
  const suffix = currency === 'EUR' ? '_eur' : currency === 'GBP' ? '_gbp' : currency === 'USD' ? '_usd' : '';
  return `${tier}_${stage}${suffix}`;
}

interface ResolveInput {
  ticketTier: OssTicketTier;
  currency?: string | null;
}

interface ResolveResult {
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
  currency: SupportedCurrency;
}

/**
 * Resolve the current ticket price for an OSS maintainer's chosen tier and
 * currency. Falls back to CHF when the requested currency isn't available
 * (mirrors the public pricing API).
 */
export async function resolveOssTicketPrice(input: ResolveInput): Promise<ResolveResult | null> {
  const stripe = getStripeClient();
  const requestedCurrency = parseCurrencyParam(input.currency ?? undefined);

  const { counts } = await getTicketCounts();
  const stage = getCurrentStage(counts).stage;

  const tryCurrencies: SupportedCurrency[] = requestedCurrency === 'CHF' ? ['CHF'] : [requestedCurrency, 'CHF'];

  for (const currency of tryCurrencies) {
    const lookupKey = lookupKeyFor(input.ticketTier, stage, currency);
    try {
      const { data } = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
      });
      const price = data[0];
      if (price) {
        return { priceId: price.id, lookupKey, stage, currency };
      }
    } catch (err) {
      log.warn('Failed to look up Stripe price', { lookupKey, error: err });
    }
  }

  return null;
}
