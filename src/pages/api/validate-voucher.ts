/**
 * API Route: Validate Voucher/Promotion Code with Stripe
 * POST /api/validate-voucher
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase/client';

const log = logger.scope('Voucher Validation API');

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
  couponId?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  amountOff?: number;
  percentOff?: number;
  minPurchase?: number;
  currency?: string;
  error?: string;
  /** Price IDs the coupon applies to (for per-item discount calculation) */
  applicablePriceIds?: string[];
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

    // Retrieve coupon - try direct lookup first, then promotion code lookup
    let coupon: Stripe.Coupon;
    try {
      log.info('Retrieving coupon with code', { code: code.trim() });

      // First, try direct coupon lookup
      try {
        coupon = await stripe.coupons.retrieve(code.trim());
      } catch {
        // If direct lookup fails, try finding via promotion code
        log.info('Direct coupon lookup failed, trying promotion code lookup');
        const promotionCodes = await stripe.promotionCodes.list({
          code: code.trim(),
          limit: 1,
        });

        if (promotionCodes.data.length === 0) {
          throw new Error('Promotion code not found');
        }

        const promoCode = promotionCodes.data[0];
        // In newer Stripe API versions, coupon is nested under promotion
        const couponRef = (promoCode as { promotion?: { coupon?: string | Stripe.Coupon }; coupon?: string | Stripe.Coupon }).promotion?.coupon
          ?? (promoCode as { coupon?: string | Stripe.Coupon }).coupon;

        if (!couponRef) {
          throw new Error('Promotion code has no associated coupon');
        }

        if (typeof couponRef === 'string') {
          coupon = await stripe.coupons.retrieve(couponRef);
        } else {
          coupon = couponRef;
        }
        log.info('Found coupon via promotion code', { promoCodeId: promoCode.id });
      }

      log.info('Found coupon', {
        id: coupon.id,
        name: coupon.name,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        valid: coupon.valid,
        appliesTo: coupon.applies_to,
        hasProductRestrictions: !!(coupon.applies_to?.products?.length),
      });
    } catch (error) {
      log.error('Error retrieving coupon', error);
      return res.status(200).json({
        valid: false,
        error: 'Invalid voucher code',
      });
    }

    // Fetch product IDs from the price IDs and build a mapping
    const priceToProductMap: Map<string, string> = new Map();
    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (typeof price.product === 'string') {
          priceToProductMap.set(priceId, price.product);
        }
      } catch (error) {
        log.error('Error fetching price', { priceId, error });
      }
    }

    // Log the price-to-product mapping for debugging
    log.info('Price to product mapping', {
      cartPriceIds: priceIds,
      mappedProducts: Object.fromEntries(priceToProductMap),
    });

    // Determine which price IDs the coupon applies to
    let applicablePriceIds: string[] = priceIds; // Default: applies to all items
    let restrictedProductIds: string[] = [];

    // Check if coupon applies to specific products (from Stripe's applies_to)
    if (coupon.applies_to?.products && coupon.applies_to.products.length > 0) {
      restrictedProductIds = coupon.applies_to.products;
      log.info('Found product restrictions in Stripe applies_to', {
        restrictedToProducts: restrictedProductIds,
      });
    } else {
      // Stripe API doesn't expose Dashboard-set restrictions via applies_to
      // Check our database for coupons created via admin panel
      log.info('No applies_to in Stripe response, checking database for restrictions');
      const supabase = createServiceRoleClient();
      const { data: dbCoupon } = await supabase
        .from('partnership_coupons')
        .select('restricted_product_ids')
        .or(`code.eq.${coupon.id},stripe_coupon_id.eq.${coupon.id}`)
        .single();

      if (dbCoupon?.restricted_product_ids && dbCoupon.restricted_product_ids.length > 0) {
        restrictedProductIds = dbCoupon.restricted_product_ids;
        log.info('Found product restrictions in database', {
          restrictedToProducts: restrictedProductIds,
        });
      } else {
        log.warn('Coupon has NO product restrictions (not in Stripe or database)', {
          couponId: coupon.id,
          couponName: coupon.name,
          hint: 'For Dashboard-created coupons, restrictions are not exposed via API. Create coupons via admin panel for full restriction support.',
        });
      }
    }

    // Apply product restrictions if any were found
    if (restrictedProductIds.length > 0) {
      log.info('Applying product restrictions', {
        restrictedToProducts: restrictedProductIds,
        cartProductIds: Array.from(priceToProductMap.values()),
      });

      // Find which priceIds have products that match the restrictions
      applicablePriceIds = priceIds.filter((priceId) => {
        const productId = priceToProductMap.get(priceId);
        return productId && restrictedProductIds.includes(productId);
      });

      log.info('Filtered applicable price IDs', {
        applicablePriceIds,
        allPriceIds: priceIds,
      });

      if (applicablePriceIds.length === 0) {
        log.warn('No applicable products in cart for this coupon', {
          couponId: coupon.id,
          restrictedToProducts: restrictedProductIds,
          cartProductIds: Array.from(priceToProductMap.values()),
        });
        return res.status(200).json({
          valid: false,
          error: 'This voucher is not applicable to the items in your cart',
        });
      }
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

      const response = {
        valid: true,
        code: coupon.id,
        couponId: coupon.id,
        type: 'fixed' as const,
        value: coupon.amount_off / 100,
        amountOff: coupon.amount_off / 100,
        currency: coupon.currency,
        minPurchase: 0,
        applicablePriceIds,
      };
      log.info('Returning fixed discount response', response);
      return res.status(200).json(response);
    } else if (coupon.percent_off) {
      // Percentage discount
      const response = {
        valid: true,
        code: coupon.id,
        couponId: coupon.id,
        type: 'percentage' as const,
        value: coupon.percent_off,
        percentOff: coupon.percent_off,
        minPurchase: 0,
        applicablePriceIds,
      };
      log.info('Returning percentage discount response', response);
      return res.status(200).json(response);
    } else {
      return res.status(200).json({
        valid: false,
        error: 'Invalid voucher configuration',
      });
    }
  } catch (error) {
    log.error('Error validating voucher', error);
    return res.status(500).json({
      valid: false,
      error: 'Failed to validate voucher. Please try again.',
    });
  }
}

