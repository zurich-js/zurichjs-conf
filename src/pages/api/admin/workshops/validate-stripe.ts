/**
 * Validate a Stripe price lookup key for a workshop offering.
 * Ensures CHF + EUR + GBP prices all exist and are active under the same product id.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import { ValidateStripeSchema } from '@/lib/admin/workshopValidation';

const log = logger.scope('Validate Workshop Stripe');

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey, { apiVersion: '2025-10-29.clover' });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const parsed = ValidateStripeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    const body = parsed.data;

    const stripe = getStripe();
    const keys = [body.lookupKey, `${body.lookupKey}_eur`, `${body.lookupKey}_gbp`];

    const results = await Promise.all(
      keys.map(async (key) => {
        const { data } = await stripe.prices.list({
          lookup_keys: [key],
          active: true,
          limit: 1,
        });
        const price = data[0] ?? null;
        const productId = price
          ? typeof price.product === 'string'
            ? price.product
            : price.product.id
          : null;
        return {
          lookupKey: key,
          priceId: price?.id ?? null,
          unitAmount: price?.unit_amount ?? null,
          currency: price?.currency?.toUpperCase() ?? null,
          productId,
        };
      })
    );

    const missing = results.filter((r) => !r.priceId).map((r) => r.lookupKey);
    const productIds = new Set(results.map((r) => r.productId).filter(Boolean));
    const productMismatch = productIds.size > 1;
    const productMismatchWithExpected =
      body.stripeProductId &&
      results.some((r) => r.productId && r.productId !== body.stripeProductId);

    return res.status(200).json({
      valid: missing.length === 0 && !productMismatch && !productMismatchWithExpected,
      results,
      missing,
      productMismatch,
      productMismatchWithExpected: !!productMismatchWithExpected,
    });
  } catch (error) {
    log.error('Error validating Stripe lookup key', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to validate lookup key',
    });
  }
}
