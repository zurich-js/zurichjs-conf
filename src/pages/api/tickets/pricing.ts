/**
 * Stripe Pricing API Handler
 * Fetches current ticket pricing from Stripe with stock availability
 * Supports multi-currency (CHF/EUR) via query parameter
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

import {
  getCurrentStage,
  getStockInfo,
  GLOBAL_STOCK_LIMITS,
  type PriceStage,
  type TicketCategory,
  type StockInfo,
} from '@/config/pricing-stages';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { getTicketCounts } from '@/lib/tickets/getTicketCounts';

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
 */
const buildLookupKey = (
  category: TicketCategory,
  stage: PriceStage,
  currency: SupportedCurrency
): string => {
  // Student/Unemployed has fixed pricing (not stage-dependent)
  if (category === 'standard_student_unemployed') {
    return currency === 'EUR'
      ? 'standard_student_unemployed_eur'
      : 'standard_student_unemployed';
  }

  const base = `${category}_${stage}`;
  return currency === 'EUR' ? `${base}_eur` : base;
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
  if (req.method !== 'GET') {
    res.status(405).json({
      plans: [],
      currentStage: 'standard',
      stageDisplayName: 'Standard',
      error: 'Method not allowed',
    });
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

    // Fetch all prices in parallel
    const pricePromises = TICKET_CATEGORIES.map(async (category) => {
      const lookupKey = buildLookupKey(category, currentStage, currency);
      const price = await fetchPrice(stripe, lookupKey);

      if (!price?.unit_amount || !price?.currency) {
        return null;
      }

      // Get comparison price (late_bird price for non-student categories)
      let comparePrice: number | undefined;
      if (category !== 'standard_student_unemployed' && currentStage !== 'late_bird') {
        const lateBirdKey = buildLookupKey(category, 'late_bird', currency);
        const lateBirdPrice = await fetchPrice(stripe, lateBirdKey);
        comparePrice = lateBirdPrice?.unit_amount ?? undefined;
      }

      // Calculate stock info
      const stock = counts
        ? getStockInfo(category, currentStage, counts)
        : { remaining: null, total: null, soldOut: false };

      // For VIP, always show global stock limit
      const finalStock: StockInfo = category === 'vip'
        ? {
            remaining: counts
              ? Math.max(0, GLOBAL_STOCK_LIMITS.vip - (counts.byCategory.vip || 0))
              : GLOBAL_STOCK_LIMITS.vip,
            total: GLOBAL_STOCK_LIMITS.vip,
            soldOut: counts ? (counts.byCategory.vip || 0) >= GLOBAL_STOCK_LIMITS.vip : false,
          }
        : stock;

      return {
        id: category,
        title: CATEGORY_TITLES[category],
        price: price.unit_amount,
        comparePrice,
        currency: price.currency.toUpperCase(),
        priceId: price.id,
        lookupKey,
        stage: category === 'standard_student_unemployed' ? 'standard' : currentStage,
        stock: finalStock,
      } satisfies TicketPlanResponse;
    });

    const results = await Promise.all(pricePromises);
    const plans = results.filter((p): p is NonNullable<typeof p> => p !== null);

    res.status(200).json({
      plans,
      currentStage,
      stageDisplayName: currentStageConfig.displayName,
    });
  } catch (error) {
    console.error('Error fetching ticket prices:', error);
    res.status(500).json({
      plans: [],
      currentStage: 'standard',
      stageDisplayName: 'Standard',
      error: error instanceof Error ? error.message : 'Failed to fetch prices',
    });
  }
}
