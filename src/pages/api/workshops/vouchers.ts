/**
 * Workshop Vouchers API Handler
 * Fetches workshop voucher pricing from Stripe product
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const log = logger.scope('Workshop Vouchers API');

/**
 * Response structure for a single workshop voucher
 */
interface WorkshopVoucherResponse {
  id: string;
  amount: number;
  currency: string;
  priceId: string;
}

/**
 * API response structure
 */
interface VouchersResponse {
  vouchers: WorkshopVoucherResponse[];
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
 * Get the workshop voucher product ID based on environment
 * Test mode: prod_TPrGcfPjJf2ssT
 * Production mode: prod_TPrjTwxt72tKHV
 */
const getWorkshopVoucherProductId = (): string => {
  const productId = process.env.WORKSHOP_VOUCHER_PRODUCT_ID;

  if (!productId) {
    throw new Error('WORKSHOP_VOUCHER_PRODUCT_ID is not configured in environment variables');
  }

  return productId;
};

/**
 * Fetch all active prices for the workshop voucher product
 */
const fetchWorkshopVouchers = async (): Promise<WorkshopVoucherResponse[]> => {
  const stripe = getStripeClient();
  const productId = getWorkshopVoucherProductId();

  // Fetch all active prices for this product
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    expand: ['data.product'],
  });

  // Map prices to voucher responses
  const vouchers: WorkshopVoucherResponse[] = prices.data
    .filter(price => price.unit_amount && price.currency)
    .map(price => ({
      id: `workshop-voucher-${price.unit_amount}`,
      amount: price.unit_amount!,
      currency: price.currency.toUpperCase(),
      priceId: price.id,
    }))
    // Sort by amount ascending
    .sort((a, b) => a.amount - b.amount);

  return vouchers;
};

/**
 * API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VouchersResponse>
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      vouchers: [],
      error: 'Method not allowed',
    });
    return;
  }

  try {
    // Fetch vouchers from Stripe
    const vouchers = await fetchWorkshopVouchers();

    // Return successful response
    res.status(200).json({
      vouchers,
    });
  } catch (error) {
    log.error('Error fetching workshop vouchers', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch workshop vouchers';

    res.status(500).json({
      vouchers: [],
      error: errorMessage,
    });
  }
}
