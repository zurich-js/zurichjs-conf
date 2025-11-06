/**
 * Create Stripe Checkout Session API
 * Creates a Stripe Checkout session with cart items and customer information
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import type { Cart, CheckoutFormData } from '@/types/cart';

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
  url?: string;
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

    // Convert cart items to Stripe line items
    // Note: Prices in cart are in base currency units (e.g., CHF)
    // Stripe expects amounts in cents
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => ({
      price: item.priceId, // Use the Stripe price ID
      quantity: item.quantity,
    }));

    // Note: Voucher/discount handling
    // If cart has a voucher code with discount amount, we note it in metadata
    // In production, you would create a Stripe Coupon or Promotion Code
    // Stripe doesn't support direct discount amounts in checkout, so you'd need to:
    // 1. Create a coupon with the discount
    // 2. Or adjust the prices
    // For now, we note it in metadata and handle it server-side via allow_promotion_codes

    // Create customer metadata
    const metadata: Record<string, string> = {
      firstName: customerInfo.firstName,
      lastName: customerInfo.lastName,
      phone: customerInfo.phone || '',
      company: customerInfo.company || '',
      addressLine1: customerInfo.addressLine1,
      addressLine2: customerInfo.addressLine2 || '',
      city: customerInfo.city,
      postalCode: customerInfo.postalCode,
      country: customerInfo.country,
      subscribeNewsletter: customerInfo.subscribeNewsletter ? 'true' : 'false',
      voucherCode: cart.voucherCode || '',
    };

    // Determine success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout`;

    // Prepare discounts array if promotion code was applied
    const discounts = cart.promotionCodeId
      ? [{ promotion_code: cart.promotionCodeId }]
      : undefined;

    // Create Stripe Checkout Session
    // Note: Prices already include 8.1% Swiss VAT - no additional tax calculation
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: customerInfo.email,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['CH', 'DE', 'AT', 'FR', 'IT', 'LI'], // Switzerland and neighboring countries
      },
      phone_number_collection: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true, // Allow business customers to provide VAT ID for records
      },
      // Invoice creation for business customers
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'ZurichJS Conference 2026 Tickets (VAT included)',
          metadata,
          footer: 'Thank you for attending ZurichJS Conference 2026! All prices include 8.1% Swiss VAT.',
        },
      },
      // Apply pre-validated promotion code if available
      ...(discounts && { discounts }),
      // Still allow manual promotion codes if none was pre-applied
      allow_promotion_codes: !cart.promotionCodeId,
    });

    // Return the checkout URL
    res.status(200).json({
      url: session.url || undefined,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';

    res.status(500).json({
      error: errorMessage,
    });
  }
}

