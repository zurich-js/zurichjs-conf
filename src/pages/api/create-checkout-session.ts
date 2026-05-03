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

    // Prepare discounts array if coupon was applied
    const discounts = cart.couponCode
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
      log.info('Applying coupon to checkout session', { couponCode: cart.couponCode });
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

