/**
 * API Route: Validate Voucher/Promotion Code with Stripe
 * POST /api/validate-voucher
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export interface ValidateVoucherRequest {
  code: string;
  cartTotal: number;
  currency: string;
  priceIds: string[]; // Stripe price IDs from cart items
}

export interface ValidateVoucherResponse {
  valid: boolean;
  code?: string;
  promotionCodeId?: string;
  couponId?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  amountOff?: number;
  percentOff?: number;
  minPurchase?: number;
  currency?: string;
  error?: string;
}

/**
 * Validate voucher/promotion code with Stripe
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateVoucherResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }

  try {
    const { code, cartTotal, currency, priceIds } = req.body as ValidateVoucherRequest;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        valid: false,
        error: 'Voucher code is required',
      });
    }

    if (!cartTotal || typeof cartTotal !== 'number') {
      return res.status(400).json({
        valid: false,
        error: 'Cart total is required',
      });
    }

    if (!priceIds || !Array.isArray(priceIds) || priceIds.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Cart items are required',
      });
    }

    // Search for promotion code in Stripe - case sensitive!
    // Stripe promotion codes can be case-sensitive depending on how they were created
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.trim(), // Preserve exact case, just trim whitespace
      active: true,
      limit: 1,
      expand: ['data.coupon'], // Expand coupon data
    });

    if (promotionCodes.data.length === 0) {
      return res.status(200).json({
        valid: false,
        error: 'Invalid voucher code',
      });
    }

    const promotionCode = promotionCodes.data[0];
    // Type assertion needed due to Stripe API version changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupon = (promotionCode as any).coupon as Stripe.Coupon;

    // Fetch product IDs from the price IDs
    const productIds: string[] = [];
    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (typeof price.product === 'string') {
          productIds.push(price.product);
        }
      } catch (error) {
        console.error(`Error fetching price ${priceId}:`, error);
      }
    }

    // Check if coupon applies to specific products
    if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
      // Coupon is restricted to specific products
      const hasApplicableProduct = productIds.some((productId) =>
        coupon.applies_to!.products!.includes(productId)
      );

      if (!hasApplicableProduct) {
        return res.status(200).json({
          valid: false,
          error: 'This voucher is not applicable to the items in your cart',
        });
      }
    }

    // Check if promotion code is active
    if (!promotionCode.active) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher code is no longer active',
      });
    }

    // Check if promotion code has expired
    if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher code has expired',
      });
    }

    // Check if promotion code has reached max redemptions
    if (
      promotionCode.max_redemptions &&
      promotionCode.times_redeemed >= promotionCode.max_redemptions
    ) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher code has reached its maximum number of uses',
      });
    }

    // Check if coupon is valid
    if (!coupon.valid) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher is no longer valid',
      });
    }

    // Check coupon redemption limits
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher has reached its maximum number of uses',
      });
    }

    // Check if coupon has expired
    if (coupon.redeem_by && coupon.redeem_by * 1000 < Date.now()) {
      return res.status(200).json({
        valid: false,
        error: 'This voucher has expired',
      });
    }

    // Check minimum purchase amount
    if (coupon.amount_off && coupon.currency) {
      // Fixed amount discount
      const minAmount = coupon.amount_off / 100; // Convert cents to currency units

      if (cartTotal < minAmount) {
        return res.status(200).json({
          valid: false,
          error: `Minimum purchase of ${minAmount.toFixed(2)} ${currency.toUpperCase()} required`,
        });
      }

      return res.status(200).json({
        valid: true,
        code: promotionCode.code,
        promotionCodeId: promotionCode.id,
        couponId: coupon.id,
        type: 'fixed',
        value: coupon.amount_off / 100,
        amountOff: coupon.amount_off / 100,
        currency: coupon.currency,
        minPurchase: 0,
      });
    } else if (coupon.percent_off) {
      // Percentage discount
      return res.status(200).json({
        valid: true,
        code: promotionCode.code,
        promotionCodeId: promotionCode.id,
        couponId: coupon.id,
        type: 'percentage',
        value: coupon.percent_off,
        percentOff: coupon.percent_off,
        minPurchase: 0,
      });
    } else {
      return res.status(200).json({
        valid: false,
        error: 'Invalid voucher configuration',
      });
    }
  } catch (error) {
    console.error('Error validating voucher:', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate voucher. Please try again.',
    });
  }
}

