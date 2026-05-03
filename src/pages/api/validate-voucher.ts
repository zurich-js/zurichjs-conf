/**
 * API Route: Validate Voucher/Promotion Code with Stripe
 * POST /api/validate-voucher
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { isTicketProduct, isWorkshopPrice, isWorkshopVoucher, parseTicketInfo } from '@/lib/stripe/ticket-utils';

const log = logger.scope('Voucher Validation API');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export interface ValidateVoucherRequest {
  code: string;
  cartTotal: number;
  currency: string;
  priceIds: string[]; // Stripe price IDs from cart items
  items?: Array<{
    priceId: string;
    kind?: 'ticket' | 'workshop';
    quantity: number;
  }>;
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
  promotionCodeId?: string;
}

type ProductKind = 'ticket' | 'workshop';
type TicketCategory = 'standard' | 'vip' | 'student' | 'unemployed';

const DISCOUNT_RESTRICTED_TO_TICKETS_MESSAGE =
  'This promo code is only valid for conference tickets. Remove workshop seats before applying it.';

function normalizeProductKind(value: unknown): ProductKind | 'all' | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['ticket', 'tickets', 'conference_ticket', 'conference_tickets'].includes(normalized)) {
    return 'ticket';
  }
  if (['workshop', 'workshops', 'workshop_seat', 'workshop_seats'].includes(normalized)) {
    return 'workshop';
  }
  if (['all', 'any', 'both'].includes(normalized)) {
    return 'all';
  }
  return undefined;
}

function normalizeTicketCategory(value: unknown): TicketCategory | 'all' | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['standard', 'standard_ticket', 'standard_tickets'].includes(normalized)) return 'standard';
  if (['vip', 'vip_ticket', 'vip_tickets'].includes(normalized)) return 'vip';
  if (['student', 'student_ticket', 'student_tickets'].includes(normalized)) return 'student';
  if (['unemployed', 'unemployed_ticket', 'unemployed_tickets'].includes(normalized)) return 'unemployed';
  if (['all', 'any', 'both'].includes(normalized)) return 'all';
  return undefined;
}

function normalizeTicketCategories(value: unknown): Set<TicketCategory> | 'all' | undefined {
  if (Array.isArray(value)) {
    const categories = value
      .map(normalizeTicketCategory)
      .filter((category): category is TicketCategory | 'all' => Boolean(category));
    if (categories.includes('all')) return 'all';
    const ticketCategories = categories.filter((category): category is TicketCategory => category !== 'all');
    return ticketCategories.length > 0 ? new Set(ticketCategories) : undefined;
  }

  if (typeof value === 'string' && value.includes(',')) {
    return normalizeTicketCategories(value.split(','));
  }

  const category = normalizeTicketCategory(value);
  if (category === 'all') return 'all';
  return category ? new Set([category]) : undefined;
}

function inferAllowedTicketCategoriesFromMetadata(
  coupon: Stripe.Coupon,
  promotionCode: Stripe.PromotionCode | null
): Set<TicketCategory> | 'all' | null {
  const metadata = {
    ...coupon.metadata,
    ...promotionCode?.metadata,
  };

  const categories =
    normalizeTicketCategories(metadata.ticket_category) ??
    normalizeTicketCategories(metadata.ticket_categories) ??
    normalizeTicketCategories(metadata.allowed_ticket_category) ??
    normalizeTicketCategories(metadata.allowed_ticket_categories) ??
    normalizeTicketCategories(metadata.applies_to_ticket_category) ??
    normalizeTicketCategories(metadata.applies_to_ticket_categories);

  return categories ?? null;
}

function inferAllowedKindsFromMetadata(
  coupon: Stripe.Coupon,
  promotionCode: Stripe.PromotionCode | null
): Set<ProductKind> | 'all' | null {
  const metadata = {
    ...coupon.metadata,
    ...promotionCode?.metadata,
  };

  const explicitKind =
    normalizeProductKind(metadata.product_type) ??
    normalizeProductKind(metadata.product_kind) ??
    normalizeProductKind(metadata.applies_to_product_type) ??
    normalizeProductKind(metadata.applies_to_kind) ??
    normalizeProductKind(metadata.kind);

  if (explicitKind === 'all') return 'all';
  if (explicitKind) return new Set([explicitKind]);

  // Popup and UTM lottery discounts are ticket promotions. They are created
  // without Stripe product restrictions, so keep them away from workshops.
  if (metadata.source === 'discount_popup' || metadata.source === 'utm_lottery') {
    return new Set(['ticket']);
  }

  return null;
}

function sanitizeOrFilterValue(value: string): string | null {
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
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
    const { code, cartTotal, currency, priceIds, items } = req.body as ValidateVoucherRequest;

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

    const trimmedCode = code.trim();
    const normalizedCurrency = currency.toLowerCase();
    const cartItems = (items?.length ? items : priceIds.map((priceId) => ({
      priceId,
      kind: undefined,
      quantity: 1,
    }))).filter((item) => typeof item.priceId === 'string' && item.priceId.length > 0);
    const uniqueCartPriceIds = Array.from(new Set(cartItems.map((item) => item.priceId)));

    // Retrieve coupon, preferring promotion-code lookup over direct coupon ID.
    let coupon: Stripe.Coupon;
    let promotionCode: Stripe.PromotionCode | null = null;
    try {
      log.info('Retrieving coupon with code', { code: trimmedCode });

      // Treat user-entered codes as promotion codes first. Some internally
      // generated coupons use the same text for coupon id and promotion code;
      // looking up the coupon first would bypass promotion-code restrictions.
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: trimmedCode,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          const promoCode = promotionCodes.data[0];
          promotionCode = promoCode;
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
        } else {
          coupon = await stripe.coupons.retrieve(trimmedCode);
        }
      } catch (error) {
        log.info('Promotion code lookup failed, trying direct coupon lookup', { error });
        coupon = await stripe.coupons.retrieve(trimmedCode);
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

    if (promotionCode) {
      if (!promotionCode.active) {
        return res.status(200).json({
          valid: false,
          error: 'This promo code is no longer active',
        });
      }

      if (promotionCode.expires_at && promotionCode.expires_at * 1000 < Date.now()) {
        return res.status(200).json({
          valid: false,
          error: 'This promo code has expired',
        });
      }

      if (promotionCode.max_redemptions && promotionCode.times_redeemed >= promotionCode.max_redemptions) {
        return res.status(200).json({
          valid: false,
          error: 'This promo code has reached its maximum number of uses',
        });
      }

      const minimumAmount = promotionCode.restrictions?.minimum_amount;
      const minimumCurrency = promotionCode.restrictions?.minimum_amount_currency;
      if (minimumAmount && minimumCurrency?.toLowerCase() === normalizedCurrency && cartTotal * 100 < minimumAmount) {
        return res.status(200).json({
          valid: false,
          error: `Minimum purchase of ${(minimumAmount / 100).toFixed(2)} ${currency.toUpperCase()} required`,
        });
      }
    }

    // Fetch product IDs from the price IDs and build a mapping
    const priceToProductMap = new Map<string, string>();
    const priceToKindMap = new Map<string, ProductKind | 'unknown'>();
    const priceToTicketCategoryMap = new Map<string, TicketCategory>();
    const priceToActiveMap = new Map<string, boolean>();

    for (const item of cartItems.filter((cartItem, index, allItems) =>
      allItems.findIndex((candidate) => candidate.priceId === cartItem.priceId) === index
    )) {
      try {
        const price = await stripe.prices.retrieve(item.priceId, {
          expand: ['product'],
        });
        priceToActiveMap.set(item.priceId, price.active);

        const product = price.product;
        const productId = typeof product === 'string' ? product : product.id;
        priceToProductMap.set(item.priceId, productId);

        const isExpandedActiveProduct = typeof product !== 'string' && !('deleted' in product);
        const productMetadataKind = isExpandedActiveProduct
          ? product.metadata?.kind ?? product.metadata?.type ?? product.metadata?.product_type
          : undefined;
        const metadataKind = normalizeProductKind(productMetadataKind);
        const kind = metadataKind === 'ticket' || metadataKind === 'workshop'
          ? metadataKind
          : isWorkshopPrice(price) || isWorkshopVoucher(price)
            ? 'workshop'
            : isTicketProduct(price)
              ? 'ticket'
              : item.kind ?? 'unknown';
        priceToKindMap.set(item.priceId, kind);
        if (kind === 'ticket' && price.lookup_key) {
          priceToTicketCategoryMap.set(item.priceId, parseTicketInfo(price.lookup_key).category as TicketCategory);
        }

        if (typeof price.product === 'string') {
          priceToProductMap.set(item.priceId, price.product);
        }
      } catch (error) {
        log.error('Error fetching price', { priceId: item.priceId, error });
      }
    }

    const missingPriceIds = uniqueCartPriceIds.filter((priceId) => !priceToProductMap.has(priceId));
    if (missingPriceIds.length > 0) {
      log.warn('Unable to resolve all cart prices during promo validation', { missingPriceIds });
      return res.status(200).json({
        valid: false,
        error: 'Unable to validate this promo code for one or more cart items',
      });
    }

    const inactivePriceIds = Array.from(priceToActiveMap.entries())
      .filter(([, active]) => !active)
      .map(([priceId]) => priceId);

    if (inactivePriceIds.length > 0) {
      return res.status(200).json({
        valid: false,
        error: 'This promo code cannot be applied because one or more cart prices are no longer active',
      });
    }

    // Log the price-to-product mapping for debugging
    log.info('Price to product mapping', {
      cartPriceIds: priceIds,
      mappedProducts: Object.fromEntries(priceToProductMap),
      mappedKinds: Object.fromEntries(priceToKindMap),
      mappedTicketCategories: Object.fromEntries(priceToTicketCategoryMap),
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
      const sanitizedCouponId = sanitizeOrFilterValue(coupon.id);
      const sanitizedCode = sanitizeOrFilterValue(trimmedCode);
      const sanitizedUpperCode = sanitizeOrFilterValue(trimmedCode.toUpperCase());
      const sanitizedPromotionCodeId = promotionCode ? sanitizeOrFilterValue(promotionCode.id) : null;
      const lookupFilters = [
        sanitizedCouponId ? `stripe_coupon_id.eq.${sanitizedCouponId}` : null,
        sanitizedCode ? `code.eq.${sanitizedCode}` : null,
        sanitizedUpperCode ? `code.eq.${sanitizedUpperCode}` : null,
        sanitizedPromotionCodeId ? `stripe_promotion_code_id.eq.${sanitizedPromotionCodeId}` : null,
      ].filter(Boolean).join(',');
      const { data: dbCoupon } = lookupFilters
        ? await supabase
          .from('partnership_coupons')
          .select('restricted_product_ids')
          .or(lookupFilters)
          .maybeSingle()
        : { data: null };

      if (dbCoupon?.restricted_product_ids && dbCoupon.restricted_product_ids.length > 0) {
        restrictedProductIds = dbCoupon.restricted_product_ids;
        log.info('Found product restrictions in database', {
          restrictedToProducts: restrictedProductIds,
        });
      } else {
        log.warn('Coupon has NO product restrictions (not in Stripe or database)', {
          couponId: coupon.id,
          couponName: coupon.name,
          promotionCodeId: promotionCode?.id,
          hint: 'Unrestricted coupons are only accepted for ticket-only carts unless metadata explicitly allows another product type.',
        });
      }
    }

    // Apply product restrictions if any were found
    if (restrictedProductIds.length > 0) {
      log.info('Applying product restrictions', {
        restrictedToProducts: restrictedProductIds,
        cartProductIds: Array.from(priceToProductMap.values()),
      });

      const disallowedPriceIds = uniqueCartPriceIds.filter((priceId) => {
        const productId = priceToProductMap.get(priceId);
        return !productId || !restrictedProductIds.includes(productId);
      });

      if (disallowedPriceIds.length > 0) {
        log.warn('Cart contains products outside this coupon restriction', {
          couponId: coupon.id,
          restrictedToProducts: restrictedProductIds,
          cartProductIds: Array.from(priceToProductMap.values()),
          disallowedPriceIds,
        });
        return res.status(200).json({
          valid: false,
          error: 'This promo code is not applicable to the product type in your cart',
        });
      }

      applicablePriceIds = uniqueCartPriceIds;

      log.info('All cart price IDs match product restriction', {
        applicablePriceIds,
        allPriceIds: uniqueCartPriceIds,
      });
    } else {
      const allowedKinds = inferAllowedKindsFromMetadata(coupon, promotionCode) ?? new Set<ProductKind>(['ticket']);
      if (allowedKinds !== 'all') {
        const disallowedKinds = cartItems
          .map((item) => priceToKindMap.get(item.priceId) ?? 'unknown')
          .filter((kind) => kind === 'unknown' || !allowedKinds.has(kind));

        if (disallowedKinds.length > 0) {
          log.warn('Rejecting unrestricted promo for disallowed product kinds', {
            couponId: coupon.id,
            promotionCodeId: promotionCode?.id,
            allowedKinds: Array.from(allowedKinds),
            cartKinds: Array.from(new Set(cartItems.map((item) => priceToKindMap.get(item.priceId) ?? 'unknown'))),
          });
          return res.status(200).json({
            valid: false,
            error: allowedKinds.has('ticket')
              ? DISCOUNT_RESTRICTED_TO_TICKETS_MESSAGE
              : 'This promo code is not applicable to the product type in your cart',
          });
        }

        applicablePriceIds = uniqueCartPriceIds.filter((priceId) => {
          const kind = priceToKindMap.get(priceId);
          return kind === 'ticket' || kind === 'workshop'
            ? allowedKinds.has(kind)
            : false;
        });
      }
    }

    const allowedTicketCategories = inferAllowedTicketCategoriesFromMetadata(coupon, promotionCode);
    if (allowedTicketCategories && allowedTicketCategories !== 'all') {
      const disallowedApplicablePriceIds = applicablePriceIds.filter((priceId) => {
        const kind = priceToKindMap.get(priceId);
        if (kind !== 'ticket') return false;
        const category = priceToTicketCategoryMap.get(priceId);
        return !category || !allowedTicketCategories.has(category);
      });

      if (disallowedApplicablePriceIds.length > 0) {
        log.warn('Rejecting promo for disallowed ticket category', {
          couponId: coupon.id,
          promotionCodeId: promotionCode?.id,
          allowedTicketCategories: Array.from(allowedTicketCategories),
          cartTicketCategories: Array.from(new Set(priceToTicketCategoryMap.values())),
          disallowedApplicablePriceIds,
        });
        return res.status(200).json({
          valid: false,
          error: `This promo code is only valid for ${Array.from(allowedTicketCategories).join(', ')} tickets`,
        });
      }

      applicablePriceIds = applicablePriceIds.filter((priceId) => {
        const kind = priceToKindMap.get(priceId);
        if (kind !== 'ticket') return true;
        const category = priceToTicketCategoryMap.get(priceId);
        return Boolean(category && allowedTicketCategories.has(category));
      });

      if (applicablePriceIds.length === 0) {
        return res.status(200).json({
          valid: false,
          error: `This promo code is only valid for ${Array.from(allowedTicketCategories).join(', ')} tickets`,
        });
      }
    }

    const applicableKinds = new Set(
      applicablePriceIds
        .map((priceId) => priceToKindMap.get(priceId))
        .filter(Boolean)
    );
    const cartKinds = new Set(
      cartItems
        .map((item) => priceToKindMap.get(item.priceId))
        .filter(Boolean)
    );
    if (applicableKinds.size === 0 || cartKinds.size === 0) {
      return res.status(200).json({
        valid: false,
        error: 'Unable to validate this promo code for the product type in your cart',
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
      if (coupon.currency.toLowerCase() !== normalizedCurrency) {
        return res.status(200).json({
          valid: false,
          error: `This promo code is only valid for ${coupon.currency.toUpperCase()} purchases`,
        });
      }

      // Fixed amount discount
      if (cartTotal <= 0) {
        return res.status(200).json({
          valid: false,
          error: 'Cart total is required',
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
        promotionCodeId: promotionCode?.id,
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
        promotionCodeId: promotionCode?.id,
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
