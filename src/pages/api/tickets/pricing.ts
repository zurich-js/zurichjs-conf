/**
 * Stripe Pricing API Handler
 * Fetches current ticket pricing from Stripe based on lookup keys
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

import { getCurrentStage, type PriceStage } from '@/config/pricing-stages';

/**
 * Ticket category types
 */
type TicketCategory = 'standard_student_unemployed' | 'standard' | 'vip';

/**
 * Response structure for a single ticket plan
 */
interface TicketPlanResponse {
  id: string;
  title: string;
  price: number;
  comparePrice?: number;
  currency: string;
  priceId: string;
  lookupKey: string;
  stage: PriceStage;
}

/**
 * API response structure
 */
interface PricingResponse {
  plans: TicketPlanResponse[];
  currentStage: PriceStage;
  error?: string;
}

/**
 * Initialize Stripe with secret key from environment variables
 */
const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-10-29.clover',
  });
};

/**
 * Build lookup key from category and stage
 * Note: Student/Unemployed tickets have fixed pricing regardless of stage
 */
const buildLookupKey = (category: TicketCategory, stage: PriceStage): string => {
  // Student/Unemployed always uses fixed lookup key
  if (category === 'standard_student_unemployed') {
    return 'standard_student_unemployed';
  }
  return `${category}_${stage}`;
};

/**
 * Get display title for each category
 */
const getCategoryTitle = (category: TicketCategory): string => {
  switch (category) {
    case 'standard_student_unemployed':
      return 'Student / Unemployed';
    case 'standard':
      return 'Standard';
    case 'vip':
      return 'VIP';
    default:
      return category;
  }
};

/**
 * Fetch a single price from Stripe using lookup key
 */
const fetchPriceByLookupKey = async (
  stripe: Stripe,
  lookupKey: string
): Promise<Stripe.Price | null> => {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    return prices.data[0] || null;
  } catch (error) {
    console.error(`Error fetching price for lookup key ${lookupKey}:`, error);
    return null;
  }
};

/**
 * Get the comparison price to show savings
 * Always compares against the FINAL/HIGHEST price stage for each category
 */
const getComparisonPrice = async (
  stripe: Stripe,
  category: TicketCategory,
  currentStage: PriceStage
): Promise<number | undefined> => {
  // Student/Unemployed tickets don't have comparison prices (fixed discount)
  if (category === 'standard_student_unemployed') {
    return undefined;
  }

    // Standard and VIP's final stage is 'late_bird'
  const finalStage: PriceStage = 'late_bird';

  // Don't show comparison if we're already at the final stage
  if (currentStage === finalStage) {
    return undefined;
  }

  // Fetch the final stage price to use as comparison
  const lookupKey = buildLookupKey(category, finalStage);
  const price = await fetchPriceByLookupKey(stripe, lookupKey);
  
  return price?.unit_amount ?? undefined;
};

/**
 * Fetch all current ticket prices from Stripe
 */
const fetchTicketPrices = async (
  currentStage: PriceStage
): Promise<TicketPlanResponse[]> => {
  const stripe = getStripeClient();
  const categories: TicketCategory[] = ['standard_student_unemployed', 'standard', 'vip'];
  const plans: TicketPlanResponse[] = [];

  for (const category of categories) {
    // Student/Unemployed tickets have fixed pricing (always use the same lookup key)
    const lookupKey = buildLookupKey(category, currentStage);
    const price = await fetchPriceByLookupKey(stripe, lookupKey);

    if (price && price.unit_amount && price.currency) {
      // Student/Unemployed tickets don't have comparison prices
      const comparePrice = category === 'standard_student_unemployed' 
        ? undefined 
        : await getComparisonPrice(stripe, category, currentStage);
      
      plans.push({
        id: category,
        title: getCategoryTitle(category),
        price: price.unit_amount,
        comparePrice,
        currency: price.currency.toUpperCase(),
        priceId: price.id,
        lookupKey,
        stage: category === 'standard_student_unemployed' ? 'standard' : currentStage,
      });
    }
  }

  return plans;
};

/**
 * API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PricingResponse>
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      plans: [],
      currentStage: 'standard',
      error: 'Method not allowed',
    });
    return;
  }

  try {
    // Determine current pricing stage from centralized config
    const currentStageConfig = getCurrentStage();
    const currentStage = currentStageConfig.stage;

    // Fetch prices from Stripe
    const plans = await fetchTicketPrices(currentStage);

    // Return successful response
    res.status(200).json({
      plans,
      currentStage,
    });
  } catch (error) {
    console.error('Error fetching ticket prices:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch prices';
    
    res.status(500).json({
      plans: [],
      currentStage: 'standard',
      error: errorMessage,
    });
  }
}

