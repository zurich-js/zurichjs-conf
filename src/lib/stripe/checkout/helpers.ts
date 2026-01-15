/**
 * Checkout Session Helpers
 * Common utilities for processing Stripe checkout sessions
 */

import type Stripe from 'stripe';
import { Resend } from 'resend';
import { getStripeClient } from '../client';
import { createServiceRoleClient } from '@/lib/supabase';
import { isTicketProduct, isWorkshopVoucher } from '../ticket-utils';
import { logger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Categorized line items from checkout session
 */
export interface CategorizedLineItems {
  tickets: Stripe.LineItem[];
  vouchers: Stripe.LineItem[];
  unrecognized: Stripe.LineItem[];
}

/**
 * Categorize line items into tickets, vouchers, and unrecognized products
 */
export function categorizeLineItems(lineItems: Stripe.LineItem[]): CategorizedLineItems {
  const result: CategorizedLineItems = {
    tickets: [],
    vouchers: [],
    unrecognized: [],
  };

  for (const item of lineItems) {
    const price = item.price as Stripe.Price | undefined;

    if (isWorkshopVoucher(price)) {
      result.vouchers.push(item);
    } else if (isTicketProduct(price)) {
      result.tickets.push(item);
    } else {
      result.unrecognized.push(item);
    }
  }

  return result;
}

/**
 * Cancel any scheduled abandonment emails for a customer
 */
export async function cancelAbandonmentEmails(
  customerEmail: string,
  log: ReturnType<typeof logger.scope>
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { data: scheduledEmails } = await supabase
      .from('scheduled_abandonment_emails')
      .select('resend_email_id')
      .eq('email', customerEmail);

    if (scheduledEmails && scheduledEmails.length > 0) {
      log.info('Cancelling scheduled abandonment emails', { count: scheduledEmails.length, email: customerEmail });

      for (const scheduled of scheduledEmails) {
        try {
          await resend.emails.cancel(scheduled.resend_email_id);
          log.debug('Cancelled abandonment email', { emailId: scheduled.resend_email_id });
        } catch (cancelError) {
          log.debug('Could not cancel abandonment email (may already be sent)', {
            emailId: scheduled.resend_email_id,
            error: cancelError instanceof Error ? cancelError.message : 'Unknown error',
          });
        }
      }

      await supabase
        .from('scheduled_abandonment_emails')
        .delete()
        .eq('email', customerEmail);
    }
  } catch (error) {
    log.warn('Failed to cancel abandonment emails', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: customerEmail,
    });
  }
}

/**
 * Get or create Stripe customer for checkout session
 */
export async function getOrCreateStripeCustomer(
  session: Stripe.Checkout.Session,
  customerEmail: string,
  customerName: string,
  log: ReturnType<typeof logger.scope>
): Promise<string> {
  const stripe = getStripeClient();

  if (typeof session.customer === 'string') {
    log.debug('Using existing customer ID from session', { stripeCustomerId: session.customer });
    return session.customer;
  }

  if (session.customer) {
    log.debug('Using customer ID from object', { stripeCustomerId: session.customer.id });
    return session.customer.id;
  }

  log.info('No customer found, creating new customer');
  const customer = await stripe.customers.create({
    email: customerEmail,
    name: customerName,
    metadata: {
      session_id: session.id,
    },
  });
  log.info('Created new customer', { stripeCustomerId: customer.id });
  return customer.id;
}

/**
 * Partnership discount info extracted from checkout session
 */
export interface PartnershipDiscountInfo {
  couponCode: string | null;
  partnershipCouponId: string | null;
  partnershipVoucherId: string | null;
  partnershipId: string | null;
  discountAmount: number;
}

/**
 * Extract partnership discount info from checkout session
 * Looks up coupon/voucher codes in our database to link to partnerships
 */
export async function extractPartnershipDiscountInfo(
  session: Stripe.Checkout.Session
): Promise<PartnershipDiscountInfo> {
  const result: PartnershipDiscountInfo = {
    couponCode: null,
    partnershipCouponId: null,
    partnershipVoucherId: null,
    partnershipId: null,
    discountAmount: session.total_details?.amount_discount || 0,
  };

  const couponCode = session.metadata?.couponCode;
  if (!couponCode) {
    return result;
  }

  result.couponCode = couponCode;

  const supabase = createServiceRoleClient();

  // First, try to find it as a partnership coupon
  const { data: coupon } = await supabase
    .from('partnership_coupons' as 'tickets')
    .select('id, partnership_id')
    .eq('code', couponCode.toUpperCase())
    .single();

  const couponData = coupon as unknown as { id: string; partnership_id: string } | null;
  if (couponData) {
    result.partnershipCouponId = couponData.id;
    result.partnershipId = couponData.partnership_id;
    return result;
  }

  // If not found as coupon, try as a voucher
  const { data: voucher } = await supabase
    .from('partnership_vouchers' as 'tickets')
    .select('id, partnership_id')
    .eq('code', couponCode.toUpperCase())
    .single();

  const voucherData = voucher as unknown as { id: string; partnership_id: string } | null;
  if (voucherData) {
    result.partnershipVoucherId = voucherData.id;
    result.partnershipId = voucherData.partnership_id;

    // Mark voucher as redeemed
    await supabase
      .from('partnership_vouchers' as 'tickets')
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by_email: session.customer_details?.email || null,
      } as unknown as Record<string, unknown>)
      .eq('id', voucherData.id);
  }

  return result;
}
