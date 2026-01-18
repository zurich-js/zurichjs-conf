/**
 * Stripe Webhook Event Handlers
 * Centralized handlers for different Stripe webhook events
 */

import type Stripe from 'stripe';
import { getStripeClient } from './client';
import { serverAnalytics } from '@/lib/analytics/server';
import type { EventProperties } from '@/lib/analytics/events';
import { logger } from '@/lib/logger';
import {
  stripCurrencySuffix,
  parseTicketInfo,
  getTicketDisplayName,
  toLegacyType,
  isTicketProduct,
  isWorkshopVoucher,
} from './ticket-utils';
import {
  processVouchers,
  processTickets,
  handleVipUpgradePayment,
  categorizeLineItems,
  cancelAbandonmentEmails,
  getOrCreateStripeCustomer,
} from './checkout';

/**
 * Handle successful checkout session
 * Creates ticket and user profile records
 *
 * Flow:
 * 1. Check for VIP upgrade payments (early return if found)
 * 2. Validate customer email
 * 3. Cancel any cart abandonment emails
 * 4. Get or create Stripe customer
 * 5. Fetch and categorize line items
 * 6. Process vouchers (fast path - no DB operations)
 * 7. Process tickets (slow path - DB + PDF generation + emails)
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const startTime = Date.now();
  const log = logger.scope('WebhookHandler', { sessionId: session.id });

  // Track webhook received
  await serverAnalytics.track('webhook_received', session.id, {
    webhook_source: 'stripe',
    webhook_event_type: 'checkout.session.completed',
    webhook_id: session.id,
    webhook_success: true,
    webhook_processing_time_ms: 0,
  } as EventProperties<'webhook_received'>);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check for VIP upgrade payment (early return)
  // ─────────────────────────────────────────────────────────────────────────────
  const isUpgradePayment = await handleVipUpgradePayment(session);
  if (isUpgradePayment) {
    log.info('Handled as VIP upgrade payment, skipping regular checkout processing');
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Validate and extract customer information
  // ─────────────────────────────────────────────────────────────────────────────
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Valued Customer';

  if (!customerEmail) {
    log.error('No customer email in checkout session', new Error('Customer email is required'), {
      type: 'payment',
      severity: 'high',
      code: 'MISSING_EMAIL',
    });
    await serverAnalytics.error(session.id, 'No customer email in checkout session', {
      type: 'payment',
      severity: 'high',
      code: 'MISSING_EMAIL',
      stack: new Error('Customer email is required').stack,
    });
    throw new Error('Customer email is required');
  }

  // Parse customer name
  const nameParts = customerName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  log.debug('Customer info extracted', { customerEmail, firstName, lastName });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Cancel any scheduled cart abandonment emails
  // ─────────────────────────────────────────────────────────────────────────────
  await cancelAbandonmentEmails(customerEmail, log);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Get or create Stripe customer
  // ─────────────────────────────────────────────────────────────────────────────
  const stripeCustomerId = await getOrCreateStripeCustomer(session, customerEmail, customerName, log);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Fetch and categorize line items
  // ─────────────────────────────────────────────────────────────────────────────
  const stripe = getStripeClient();

  log.debug('Fetching line items');
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  if (!lineItems.data.length) {
    log.error('No line items in checkout session', new Error('No line items in session'), {
      type: 'payment',
      severity: 'high',
      code: 'NO_LINE_ITEMS',
    });
    await serverAnalytics.error(session.id, 'No line items in checkout session', {
      type: 'payment',
      severity: 'high',
      code: 'NO_LINE_ITEMS',
      stack: new Error('No line items in session').stack,
    });
    throw new Error('No line items in session');
  }

  const { tickets, vouchers, unrecognized } = categorizeLineItems(lineItems.data);

  log.debug('Line items categorized', {
    total: lineItems.data.length,
    tickets: tickets.length,
    vouchers: vouchers.length,
    unrecognized: unrecognized.length,
  });

  // Warn about unrecognized products
  if (unrecognized.length > 0) {
    log.warn('Unrecognized products will be skipped', { count: unrecognized.length });
    unrecognized.forEach(item => {
      const price = item.price as Stripe.Price | undefined;
      log.warn('Unrecognized product', {
        description: item.description,
        lookupKey: price?.lookup_key,
        priceId: price?.id,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Process vouchers (fast path - no database operations)
  // ─────────────────────────────────────────────────────────────────────────────
  await processVouchers(vouchers, session, customerEmail, firstName, log);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Process tickets (slow path - DB + PDF generation + emails)
  // ─────────────────────────────────────────────────────────────────────────────
  await processTickets(tickets, session, stripeCustomerId, customerEmail, firstName, lastName, log);

  // ─────────────────────────────────────────────────────────────────────────────
  // DONE: Track completion
  // ─────────────────────────────────────────────────────────────────────────────
  const processingTime = Date.now() - startTime;
  await serverAnalytics.track('webhook_received', session.id, {
    webhook_source: 'stripe',
    webhook_event_type: 'checkout.session.completed',
    webhook_id: session.id,
    webhook_processing_time_ms: processingTime,
    webhook_success: true,
  } as EventProperties<'webhook_received'>);

  log.info('Checkout session processed successfully', { processingTimeMs: processingTime });
}

/**
 * Handle async payment succeeded
 */
export async function handleAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session
): Promise<void> {
  const log = logger.scope('WebhookHandler', { sessionId: session.id });
  log.info('Processing checkout.session.async_payment_succeeded');
  await handleCheckoutSessionCompleted(session);
}

/**
 * Handle async payment failed
 */
export async function handleAsyncPaymentFailed(
  session: Stripe.Checkout.Session
): Promise<void> {
  const log = logger.scope('WebhookHandler', { sessionId: session.id });
  log.error('Async payment failed', new Error('Payment failed'), {
    type: 'payment',
    severity: 'high',
    code: 'ASYNC_PAYMENT_FAILED',
    customerEmail: session.customer_details?.email,
    amount: session.amount_total,
  });
}

/**
 * Handle payment intent succeeded
 * This could be used for direct payment intents (not checkout sessions)
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const log = logger.scope('WebhookHandler', { paymentIntentId: paymentIntent.id });
  log.info('Processing payment_intent.succeeded');
}

// Export internal functions for testing
export const __testing = {
  stripCurrencySuffix,
  parseTicketInfo,
  getTicketDisplayName,
  toLegacyType,
  isTicketProduct,
  isWorkshopVoucher,
};
