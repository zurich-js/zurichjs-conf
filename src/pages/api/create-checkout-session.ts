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
      voucherCode: cart.voucherCode || '',
      // Store attendee information as JSON string for multi-ticket purchases
      attendees: customerInfo.attendees ? JSON.stringify(customerInfo.attendees) : '',
      totalTickets: cart.totalItems.toString(),
    };

    // Determine success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout`;

    // Prepare discounts array if promotion code was applied
    const discounts = cart.promotionCodeId
      ? [{ promotion_code: cart.promotionCodeId }]
      : undefined;

    // Get or create Stripe Customer to avoid duplicates
    // First check if customer exists with this email
    console.log('[CreateCheckout] Searching for existing customer with email:', customerInfo.email);
    const existingCustomers = await stripe.customers.list({
      email: customerInfo.email,
      limit: 1,
    });

    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      // Reuse existing customer
      customer = existingCustomers.data[0];
      console.log('[CreateCheckout] ✅ Found existing customer:', customer.id);

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
      console.log('[CreateCheckout] Updated existing customer info');
    } else {
      // Create new customer if none exists
      console.log('[CreateCheckout] No existing customer found, creating new one...');
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
      console.log('[CreateCheckout] ✅ Created new customer:', customer.id);
    }

    // Create Stripe Checkout Session
    // Note: Prices already include 8.1% Swiss VAT - no additional tax calculation
    // By passing a customer with address, Stripe will prefill the billing address in checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer: customer.id, // Use the customer we just created with prefilled address
      customer_update: {
        // Allow Stripe to update customer with any changes made in checkout
        address: 'auto',
        name: 'auto',
      },
      metadata, // Stored for retrieval in webhook
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto', // Use customer's saved address, prefilling the checkout form
      phone_number_collection: {
        enabled: true,
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

