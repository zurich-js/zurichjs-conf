/**
 * Stripe Pricing API Handler
 * Fetches current ticket pricing from Stripe with stock availability
 * Supports multi-currency (CHF/EUR/GBP/USD) via query parameter
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

import {
  getCurrentStage,
  getEffectiveStageForCategory,
  getStagesAfter,
  getStockInfo,
  GLOBAL_STOCK_LIMITS,
  type PriceStage,
  type TicketCategory,
  type StockInfo,
} from '@/config/pricing-stages';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';
import { serverAnalytics } from '@/lib/analytics/server';

const log = logger.scope('Ticket Pricing API');
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

// Ticket categories to fetch
const TICKET_CATEGORIES: TicketCategory[] = ['standard_student_unemployed', 'standard', 'vip'];

// Category display titles
const CATEGORY_TITLES: Record<TicketCategory, string> = {
  standard_student_unemployed: 'Student / Unemployed',
  standard: 'Standard',
  vip: 'VIP',
};

interface TicketPlanResponse {
  id: TicketCategory;
  title: string;
  price: number;
  comparePrice?: number;
  /** Stage the comparePrice belongs to (the stage this ticket peaks at) */
  comparePriceStage?: PriceStage;
  currency: string;
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
  stock: StockInfo;
}

interface PricingResponse {
  plans: TicketPlanResponse[];
  currentStage: PriceStage;
  stageDisplayName: string;
  error?: string;
}

/**
 * Get Stripe client
 */
const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, { apiVersion: '2025-10-29.clover' });
};

/**
 * Build Stripe lookup key for a category/stage/currency combination
 * EUR prices use '_eur' suffix (e.g., 'standard_early_bird_eur')
 * GBP prices use '_gbp' suffix (e.g., 'standard_early_bird_gbp')
 */
const buildLookupKey = (
  category: TicketCategory,
  stage: PriceStage,
  currency: SupportedCurrency
): string => {
  // Determine currency suffix
  const currencySuffix = currency === 'EUR' ? '_eur' : currency === 'GBP' ? '_gbp' : currency === 'USD' ? '_usd' : '';

  // Student/Unemployed has fixed pricing (not stage-dependent)
  if (category === 'standard_student_unemployed') {
    return `standard_student_unemployed${currencySuffix}`;
  }

  const base = `${category}_${stage}`;
  return `${base}${currencySuffix}`;
};

/**
 * Fetch price from Stripe by lookup key
 */
const fetchPrice = async (stripe: Stripe, lookupKey: string): Promise<Stripe.Price | null> => {
  try {
    const { data } = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    return data[0] || null;
  } catch {
    return null;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PricingResponse>
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({
      plans: [],
      currentStage: 'standard',
      stageDisplayName: 'Standard',
      error: 'Method not allowed',
    });
    return;
  }

  if (req.method === 'HEAD') {
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.status(200).end();
    return;
  }

  try {
    const stripe = getStripe();

    // Parse currency from query parameter (defaults to CHF)
    const currency = parseCurrencyParam(req.query.currency);

    // Get ticket counts for stock-aware stage determination
    const { counts } = await getTicketCounts();
    const currentStageConfig = getCurrentStage(counts);
    const currentStage = currentStageConfig.stage;

    // Helper to fetch plans for a given currency
    const fetchPlansForCurrency = async (targetCurrency: SupportedCurrency): Promise<TicketPlanResponse[]> => {
      const pricePromises = TICKET_CATEGORIES.map(async (category) => {
        // Categories capped at an earlier stage (VIP tops out at late bird)
        // keep selling at their cap-stage price once the ladder moves past it.
        const effectiveStage = getEffectiveStageForCategory(category, currentStage);
        const lookupKey = buildLookupKey(category, effectiveStage, targetCurrency);
        const price = await fetchPrice(stripe, lookupKey);

        if (!price?.unit_amount || !price?.currency) {
          return null;
        }

        // Get comparison price: the highest price this category still climbs to
        // in a later stage. Anchoring to the final stage alone loses the increase
        // for categories that peak earlier — VIP tops out at late bird and has no
        // last_minute price, so its rise was never shown.
        let comparePrice: number | undefined;
        let comparePriceStage: PriceStage | undefined;
        if (category !== 'standard_student_unemployed') {
          const laterAmounts = await Promise.all(
            getStagesAfter(effectiveStage).map(async ({ stage }) => {
              const laterPrice = await fetchPrice(stripe, buildLookupKey(category, stage, targetCurrency));
              return { stage, amount: laterPrice?.unit_amount ?? null };
            })
          );

          for (const { stage, amount } of laterAmounts) {
            // Only compare against prices that are actually higher — a flat later
            // stage must not render as a fake discount
            if (amount === null || amount <= price.unit_amount) continue;
            if (comparePrice === undefined || amount > comparePrice) {
              comparePrice = amount;
              comparePriceStage = stage;
            }
          }
        }

        // Calculate stock info
        const stock = counts
          ? getStockInfo(category, currentStage, counts)
          : { remaining: null, total: null, soldOut: false };

        // For VIP and Student/Unemployed, always show global stock limit
        let finalStock: StockInfo = stock;
        if (category === 'vip') {
          finalStock = {
            remaining: counts
              ? Math.max(0, GLOBAL_STOCK_LIMITS.vip - (counts.byCategory.vip || 0))
              : GLOBAL_STOCK_LIMITS.vip,
            total: GLOBAL_STOCK_LIMITS.vip,
            soldOut: counts ? (counts.byCategory.vip || 0) >= GLOBAL_STOCK_LIMITS.vip : false,
          };
        } else if (category === 'standard_student_unemployed') {
          const sold = counts?.byCategory.standard_student_unemployed || 0;
          finalStock = {
            remaining: counts
              ? Math.max(0, GLOBAL_STOCK_LIMITS.student_unemployed - sold)
              : GLOBAL_STOCK_LIMITS.student_unemployed,
            total: GLOBAL_STOCK_LIMITS.student_unemployed,
            soldOut: counts ? sold >= GLOBAL_STOCK_LIMITS.student_unemployed : false,
          };
        }

        return {
          id: category,
          title: CATEGORY_TITLES[category],
          price: price.unit_amount,
          comparePrice,
          comparePriceStage,
          currency: price.currency.toUpperCase(),
          priceId: price.id,
          lookupKey,
          stage: category === 'standard_student_unemployed' ? 'standard' : effectiveStage,
          stock: finalStock,
        } satisfies TicketPlanResponse;
      });

      const results = await Promise.all(pricePromises);
      return results.filter((p): p is NonNullable<typeof p> => p !== null);
    };

    // Fetch plans for requested currency
    let plans = await fetchPlansForCurrency(currency);

    // If no plans found and currency is not CHF, fall back to CHF
    if (plans.length === 0 && currency !== 'CHF') {
      const attemptedLookupKeys = TICKET_CATEGORIES.map((category) =>
        buildLookupKey(category, getEffectiveStageForCategory(category, currentStage), currency)
      );

      log.warn('No pricing plans found for currency, falling back to CHF', {
        requestedCurrency: currency,
        currentStage,
        attemptedLookupKeys,
      });

      await serverAnalytics.error('pricing-api', `No pricing plans found for ${currency}, falling back to CHF`, {
        type: 'system',
        severity: 'medium',
        code: 'CURRENCY_FALLBACK',
        stack: JSON.stringify({
          requestedCurrency: currency,
          fallbackCurrency: 'CHF',
          currentStage,
          attemptedLookupKeys,
          message: `Stripe prices with lookup keys [${attemptedLookupKeys.join(', ')}] not found. Falling back to CHF. Create these prices in Stripe Dashboard to enable ${currency} pricing.`,
        }),
      });

      // Fetch CHF plans as fallback
      plans = await fetchPlansForCurrency('CHF');
    }

    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.status(200).json({
      plans,
      currentStage,
      stageDisplayName: currentStageConfig.displayName,
    });
  } catch (error) {
    log.error('Error fetching ticket prices', error);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      plans: [],
      currentStage: 'standard',
      stageDisplayName: 'Standard',
      error: error instanceof Error ? error.message : 'Failed to fetch prices',
    });
  }
}
