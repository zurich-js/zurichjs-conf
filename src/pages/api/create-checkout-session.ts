/**
 * Create Stripe Checkout Session API
 * Creates a Stripe Checkout session with cart items and customer information
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import type { Cart, CheckoutFormData } from '@/types/cart';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';
import { validateCheckoutPrices } from '@/lib/stripe/validate-checkout';
import { isTicketProduct, isWorkshopPrice, isWorkshopVoucher, parseTicketInfo } from '@/lib/stripe/ticket-utils';
import { validateWorkshopCartItems } from '@/lib/workshops/validateCartItems';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Json } from '@/lib/types/database';

const log = logger.scope('Create Checkout Session');

/**
 * API request body
 */
interface CheckoutSessionRequest {
  cart: Cart;
  customerInfo: CheckoutFormData;
}

/**
 * API response
 */
interface CheckoutSessionResponse {
  clientSecret?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Initialize Stripe client
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
 * Convert country name to ISO 3166-1 alpha-2 country code
 * Stripe requires 2-letter country codes (e.g., 'CH' for Switzerland)
 */
const getCountryCode = (countryName: string): string => {
  // Common country mappings
  const countryMap: Record<string, string> = {
    'switzerland': 'CH',
    'germany': 'DE',
    'austria': 'AT',
    'france': 'FR',
    'italy': 'IT',
    'united kingdom': 'GB',
    'uk': 'GB',
    'united states': 'US',
    'usa': 'US',
    'netherlands': 'NL',
    'belgium': 'BE',
    'spain': 'ES',
    'portugal': 'PT',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'poland': 'PL',
    'czech republic': 'CZ',
    'ireland': 'IE',
    'luxembourg': 'LU',
    'liechtenstein': 'LI',
  };

  const normalized = countryName.toLowerCase().trim();

  // If it's already a 2-letter code, return it uppercase
  if (countryName.length === 2) {
    return countryName.toUpperCase();
  }

  // Look up in mapping
  return countryMap[normalized] || 'CH'; // Default to Switzerland if not found
};

const sanitizeSupabaseOrValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
};

type TicketCategory = 'standard' | 'vip' | 'student' | 'unemployed';
type ProductKind = 'ticket' | 'workshop';

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

  return normalizeTicketCategories(metadata.ticket_category)
    ?? normalizeTicketCategories(metadata.ticket_categories)
    ?? normalizeTicketCategories(metadata.allowed_ticket_category)
    ?? normalizeTicketCategories(metadata.allowed_ticket_categories)
    ?? normalizeTicketCategories(metadata.applies_to_ticket_category)
    ?? normalizeTicketCategories(metadata.applies_to_ticket_categories)
    ?? null;
}

function inferAllowedKindsFromMetadata(
  coupon: Stripe.Coupon,
  promotionCode: Stripe.PromotionCode | null
): Set<ProductKind> | 'all' | null {
  const metadata = {
    ...(coupon.metadata ?? {}),
    ...(promotionCode?.metadata ?? {}),
  };

  const explicitKind =
    normalizeProductKind(metadata.product_type) ??
    normalizeProductKind(metadata.product_kind) ??
    normalizeProductKind(metadata.applies_to_product_type) ??
    normalizeProductKind(metadata.applies_to_kind) ??
    normalizeProductKind(metadata.kind);

  if (explicitKind === 'all') return 'all';
  if (explicitKind) return new Set([explicitKind]);

  if (metadata.source === 'discount_popup' || metadata.source === 'utm_lottery') {
    return new Set(['ticket']);
  }

  return null;
}

async function validateDiscountProductsForCheckout(
  stripe: Stripe,
  cart: Cart,
  priceIds: string[]
): Promise<{ valid: boolean; error?: string }> {
  if (!cart.couponCode && !cart.promotionCodeId) {
    return { valid: true };
  }

  let coupon: Stripe.Coupon | null = null;
  let promotionCode: Stripe.PromotionCode | null = null;

  if (cart.promotionCodeId) {
    promotionCode = await stripe.promotionCodes.retrieve(cart.promotionCodeId);
    const couponRef = (promotionCode as { promotion?: { coupon?: string | Stripe.Coupon }; coupon?: string | Stripe.Coupon }).promotion?.coupon
      ?? (promotionCode as { coupon?: string | Stripe.Coupon }).coupon;

    if (!promotionCode.active || !couponRef) {
      return { valid: false, error: 'This promo code is no longer active' };
    }

    coupon = typeof couponRef === 'string'
      ? await stripe.coupons.retrieve(couponRef)
      : couponRef;
  } else if (cart.couponCode) {
    coupon = await stripe.coupons.retrieve(cart.couponCode);
  }

  if (!coupon?.valid) {
    return { valid: false, error: 'This promo code is no longer valid' };
  }

  const prices = await Promise.all(
    Array.from(new Set(priceIds)).map((priceId) =>
      stripe.prices.retrieve(priceId, { expand: ['product'] })
    )
  );
  const priceProductIds = new Map<string, string>();
  const priceTicketCategories = new Map<string, TicketCategory>();
  const priceKinds = new Map<string, ProductKind | 'unknown'>();

  for (const price of prices) {
    const product = price.product;
    const productId = typeof product === 'string' ? product : product.id;
    priceProductIds.set(price.id, productId);
    const isWorkshop = isWorkshopPrice(price) || isWorkshopVoucher(price);
    const isTicket = isTicketProduct(price);
    priceKinds.set(price.id, isWorkshop ? 'workshop' : isTicket ? 'ticket' : 'unknown');
    if (isTicket && price.lookup_key) {
      priceTicketCategories.set(price.id, parseTicketInfo(price.lookup_key).category as TicketCategory);
    }
  }

  let restrictedProductIds = coupon.applies_to?.products ?? [];
  if (restrictedProductIds.length === 0) {
    const supabase = createServiceRoleClient();
    const sanitizedCouponId = sanitizeSupabaseOrValue(coupon.id);
    const sanitizedCouponCode = sanitizeSupabaseOrValue(cart.couponCode);
    const sanitizedPromotionCodeId = sanitizeSupabaseOrValue(cart.promotionCodeId);
    const filters = [
      sanitizedCouponId ? `stripe_coupon_id.eq.${sanitizedCouponId}` : null,
      sanitizedCouponCode ? `code.eq.${sanitizedCouponCode}` : null,
      sanitizedPromotionCodeId ? `stripe_promotion_code_id.eq.${sanitizedPromotionCodeId}` : null,
    ].filter(Boolean).join(',');
    const { data: dbCoupon } = filters
      ? await supabase
        .from('partnership_coupons')
        .select('restricted_product_ids')
        .or(filters)
        .maybeSingle()
      : { data: null };
    restrictedProductIds = dbCoupon?.restricted_product_ids ?? [];
  }

  if (restrictedProductIds.length > 0) {
    const eligiblePriceIds = Array.from(priceProductIds.entries())
      .filter(([, productId]) => restrictedProductIds.includes(productId))
      .map(([priceId]) => priceId);
    if (eligiblePriceIds.length === 0) {
      return { valid: false, error: 'This promo code is not applicable to the product type in your cart' };
    }

    const allowedTicketCategories = inferAllowedTicketCategoriesFromMetadata(coupon, promotionCode);
    if (allowedTicketCategories && allowedTicketCategories !== 'all') {
      const disallowedEligibleTicket = eligiblePriceIds.some((priceId) => {
        const category = priceTicketCategories.get(priceId);
        return category && !allowedTicketCategories.has(category);
      });
      if (disallowedEligibleTicket) {
        return {
          valid: false,
          error: `This promo code is only valid for ${Array.from(allowedTicketCategories).join(', ')} tickets`,
        };
      }
    }
    return { valid: true };
  }

  const allowedTicketCategories = inferAllowedTicketCategoriesFromMetadata(coupon, promotionCode);
  if (allowedTicketCategories && allowedTicketCategories !== 'all') {
    const disallowedTicket = Array.from(priceTicketCategories.values()).some((category) =>
      !allowedTicketCategories.has(category)
    );
    if (disallowedTicket) {
      return {
        valid: false,
        error: `This promo code is only valid for ${Array.from(allowedTicketCategories).join(', ')} tickets`,
      };
    }
  }

  // Unrestricted Stripe coupons apply to the whole Checkout Session. Respect
  // metadata-driven product-kind allowances; otherwise default unrestricted
  // coupons to ticket-only so generic ticket promos cannot discount workshops.
  const allowedKinds = inferAllowedKindsFromMetadata(coupon, promotionCode) ?? new Set<ProductKind>(['ticket']);
  if (allowedKinds !== 'all') {
    const hasDisallowedKind = Array.from(priceKinds.values()).some((kind) =>
      kind === 'unknown' || !allowedKinds.has(kind)
    );
    if (hasDisallowedKind) {
      return {
        valid: false,
        error: allowedKinds.has('ticket')
          ? 'This promo code is only valid for conference tickets. Remove workshop seats before applying it.'
          : 'This promo code is not applicable to the product type in your cart',
      };
    }
  }

  return { valid: true };
}

/**
 * API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckoutSessionResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const { cart, customerInfo } = req.body as CheckoutSessionRequest;

    // Validation
    if (!cart || !cart.items || cart.items.length === 0) {
      res.status(400).json({
        error: 'Cart is empty',
      });
      return;
    }

    if (!customerInfo || !customerInfo.email) {
      res.status(400).json({
        error: 'Customer information is required',
      });
      return;
    }

    const stripe = getStripeClient();

    // Validate all prices correspond to the current pricing stage
    const priceIds = cart.items.map((item) => item.priceId);
    const validation = await validateCheckoutPrices(stripe, priceIds);
    if (!validation.valid) {
      log.warn('Checkout blocked: price stage mismatch', { priceIds, currentStage: validation.currentStage });
      res.status(400).json({ error: validation.error });
      return;
    }

    // Cross-check every workshop cart item against the DB + Stripe so a user
    // can't pair a cheap priceId with an expensive workshop by tampering the
    // URL-encoded cart state.
    const workshopValidation = await validateWorkshopCartItems({ items: cart.items, stripe });
    if (!workshopValidation.valid) {
      log.warn('Checkout blocked: workshop cart validation failed', {
        error: workshopValidation.error,
      });
      res.status(400).json({ error: workshopValidation.error ?? 'Invalid workshop in cart' });
      return;
    }

    const discountValidation = await validateDiscountProductsForCheckout(stripe, cart, priceIds);
    if (!discountValidation.valid) {
      log.warn('Checkout blocked: discount product validation failed', {
        error: discountValidation.error,
        couponCode: cart.couponCode,
        promotionCodeId: cart.promotionCodeId,
      });
      res.status(400).json({ error: discountValidation.error ?? 'Invalid promo code for cart' });
      return;
    }

    // Convert cart items to Stripe line items
    // Note: Prices in cart are in base currency units (e.g., CHF)
    // Stripe expects amounts in cents
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => ({
      price: item.priceId, // Use the Stripe price ID
      quantity: item.quantity,
    }));

    // Note: Voucher/discount handling
    // Pre-validated coupons are passed to Stripe checkout via the discounts parameter

    // Create customer metadata
    const metadata: Record<string, string> = {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      email: customerInfo.email,
      phone: customerInfo.phone || '',
      company: customerInfo.company || '',
      jobTitle: customerInfo.jobTitle || '',
      addressLine1: customerInfo.addressLine1,
      addressLine2: customerInfo.addressLine2 || '',
      city: customerInfo.city,
      state: customerInfo.state || '',
      postalCode: customerInfo.postalCode,
      country: customerInfo.country,
      subscribeNewsletter: customerInfo.subscribeNewsletter ? 'true' : 'false',
      couponCode: cart.couponCode || '',
      // Store attendee information as JSON string for multi-ticket purchases
      attendees: customerInfo.attendees ? JSON.stringify(customerInfo.attendees) : '',
      totalTickets: cart.totalItems.toString(),
    };

    // Workshop-specific session context is persisted in checkout_cart_snapshots,
    // not Stripe metadata. This keeps us clear of the 500-char metadata limit
    // and makes per-seat attendee info round-trip cleanly to the webhook.
    const workshopCartItems = cart.items.filter((item) => item.kind === 'workshop');
    if (workshopCartItems.length > 0) {
      metadata.has_workshops = 'true';
    }

    log.info('Cart coupon info', {
      couponCode: cart.couponCode,
      discountAmount: cart.discountAmount,
    });

    // Get or create Stripe Customer to avoid duplicates
    // First check if customer exists with this email
    log.info('Searching for existing customer', { email: customerInfo.email });
    const existingCustomers = await stripe.customers.list({
      email: customerInfo.email,
      limit: 1,
    });

    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      // Reuse existing customer
      customer = existingCustomers.data[0];
      log.info('Found existing customer', { customerId: customer.id });

      // Update customer with latest information
      customer = await stripe.customers.update(customer.id, {
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        phone: customerInfo.phone || undefined,
        address: {
          line1: customerInfo.addressLine1,
          line2: customerInfo.addressLine2 || undefined,
          city: customerInfo.city,
          state: customerInfo.state || undefined,
          postal_code: customerInfo.postalCode,
          country: getCountryCode(customerInfo.country),
        },
        metadata: {
          company: customerInfo.company || '',
          jobTitle: customerInfo.jobTitle || '',
        },
      });
      log.info('Updated existing customer info', { customerId: customer.id });
    } else {
      // Create new customer if none exists
      log.info('No existing customer found, creating new one', { email: customerInfo.email });
      customer = await stripe.customers.create({
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        email: customerInfo.email,
        phone: customerInfo.phone || undefined,
        address: {
          line1: customerInfo.addressLine1,
          line2: customerInfo.addressLine2 || undefined,
          city: customerInfo.city,
          state: customerInfo.state || undefined,
          postal_code: customerInfo.postalCode,
          country: getCountryCode(customerInfo.country),
        },
        metadata: {
          company: customerInfo.company || '',
          jobTitle: customerInfo.jobTitle || '',
        },
      });
      log.info('Created new customer', { customerId: customer.id });
    }

    // Prepare discounts array if coupon/promotion code was applied.
    // Promotion codes must be sent by ID so Stripe enforces active state,
    // expiry, redemption limits, and minimum amount restrictions at checkout.
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined = cart.promotionCodeId
      ? [{ promotion_code: cart.promotionCodeId }]
      : cart.couponCode
        ? [{ coupon: cart.couponCode }]
        : undefined;

    // Create Checkout Session in embedded mode.
    // This returns a client_secret for use with Custom Checkout Elements
    // (PaymentElement, BillingAddressElement, etc.) while preserving the
    // checkout.session.completed webhook flow.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      ui_mode: 'custom',
      line_items: lineItems,
      customer: customer.id,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      metadata,
      return_url: `${getBaseUrl(req)}/success?session_id={CHECKOUT_SESSION_ID}`,
      phone_number_collection: {
        enabled: true,
      },
    };

    if (discounts && discounts.length > 0) {
      sessionParams.discounts = discounts;
      log.info('Applying discount to checkout session', {
        couponCode: cart.couponCode,
        promotionCodeId: cart.promotionCodeId,
      });
    }

    log.info('Creating checkout session', { customerId: customer.id, totalItems: cart.totalItems });

    const session = await stripe.checkout.sessions.create(sessionParams);

    log.info('Checkout session created', { sessionId: session.id });

    // Persist cart snapshot so the webhook can hydrate workshop attendee info.
    if (workshopCartItems.length > 0) {
      try {
        const supabase = createServiceRoleClient();
        const { error: snapshotError } = await supabase
          .from('checkout_cart_snapshots')
          .upsert(
            {
              stripe_session_id: session.id,
              workshop_attendees: (customerInfo.workshopAttendees ?? {}) as unknown as Json,
              cart_items: workshopCartItems.map((item) => ({
                workshopId: item.workshopId,
                priceId: item.priceId,
                quantity: item.quantity,
                title: item.title,
              })) as unknown as Json,
            },
            { onConflict: 'stripe_session_id' }
          );
        if (snapshotError) {
          log.warn('Failed to persist checkout cart snapshot', {
            sessionId: session.id,
            error: snapshotError.message,
          });
        }
      } catch (error) {
        log.warn('Unexpected error persisting checkout cart snapshot', {
          sessionId: session.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(200).json({
      clientSecret: session.client_secret || undefined,
      sessionId: session.id,
    });
  } catch (error) {
    log.error('Error creating checkout session', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';

    res.status(500).json({
      error: errorMessage,
    });
  }
}
