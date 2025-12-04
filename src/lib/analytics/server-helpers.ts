/**
 * Server-side Analytics Helper Functions
 *
 * These helpers are for server-side code only (API routes, webhooks).
 * DO NOT import this file in client-side code.
 */

import { serverAnalytics } from './server'
import type { TicketCategory, TicketStage } from '@/lib/types/database'

/**
 * Track ticket purchase from server (webhook)
 */
export async function trackTicketPurchaseServer(params: {
  distinctId: string
  ticketId: string
  category: TicketCategory
  stage: TicketStage
  price: number
  currency: string
  attendeeCount: number
  attendeeNames?: string[]
  stripeSessionId: string
  stripeCustomerId?: string
  paymentIntentId?: string
  email: string
  firstName?: string
  lastName?: string
}) {
  await serverAnalytics.track('ticket_purchased', params.distinctId, {
    ticket_id: params.ticketId,
    ticket_category: params.category,
    ticket_stage: params.stage,
    ticket_price: params.price,
    currency: params.currency,
    ticket_count: params.attendeeCount,
    attendee_count: params.attendeeCount,
    attendee_names: params.attendeeNames,
    stripe_session_id: params.stripeSessionId,
    stripe_customer_id: params.stripeCustomerId,
    payment_intent_id: params.paymentIntentId,
    payment_status: 'succeeded',
    revenue_amount: params.price,
    revenue_currency: params.currency,
    revenue_type: 'ticket' as const,
    transaction_id: params.stripeSessionId,
    product_name: `${params.category} ${params.stage} ticket`,
    product_category: params.category,
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
  })

  // Also track revenue separately for PostHog revenue analytics
  await serverAnalytics.revenue(params.distinctId, {
    amount: params.price,
    currency: params.currency,
    type: 'ticket',
    transactionId: params.stripeSessionId,
    productName: `${params.category} ${params.stage} ticket`,
    productCategory: params.category,
    metadata: {
      attendee_count: params.attendeeCount,
      ticket_id: params.ticketId,
    },
  })
}

/**
 * Track workshop voucher purchase from server
 */
export async function trackWorkshopVoucherPurchaseServer(params: {
  distinctId: string
  workshopId: string
  workshopTitle: string
  voucherCount: number
  price: number
  currency: string
  stripeSessionId: string
  stripeCustomerId?: string
  email: string
}) {
  await serverAnalytics.track('workshop_voucher_purchased', params.distinctId, {
    workshop_id: params.workshopId,
    workshop_title: params.workshopTitle,
    voucher_count: params.voucherCount,
    stripe_session_id: params.stripeSessionId,
    stripe_customer_id: params.stripeCustomerId,
    payment_status: 'succeeded',
    revenue_amount: params.price,
    revenue_currency: params.currency,
    revenue_type: 'workshop' as const,
    transaction_id: params.stripeSessionId,
    email: params.email,
  })

  await serverAnalytics.revenue(params.distinctId, {
    amount: params.price,
    currency: params.currency,
    type: 'workshop',
    transactionId: params.stripeSessionId,
    productName: params.workshopTitle,
    productCategory: 'workshop_voucher',
    metadata: {
      voucher_count: params.voucherCount,
      workshop_id: params.workshopId,
    },
  })
}

/**
 * Track checkout completion from server
 */
export async function trackCheckoutCompletedServer(params: {
  distinctId: string
  cartItemCount: number
  cartTotalAmount: number
  cartCurrency: string
  stripeSessionId: string
  paymentStatus: 'succeeded' | 'failed' | 'pending'
  email: string
}) {
  await serverAnalytics.track('checkout_completed', params.distinctId, {
    cart_item_count: params.cartItemCount,
    cart_total_amount: params.cartTotalAmount,
    cart_currency: params.cartCurrency,
    cart_items: [], // Can be populated if needed
    stripe_session_id: params.stripeSessionId,
    payment_status: params.paymentStatus,
    revenue_amount: params.cartTotalAmount,
    revenue_currency: params.cartCurrency,
    revenue_type: 'ticket' as const,
    transaction_id: params.stripeSessionId,
    email: params.email,
  })
}

/**
 * Track payment failure from server
 */
export async function trackPaymentFailedServer(params: {
  distinctId: string
  stripeSessionId: string
  errorMessage: string
  errorCode?: string
}) {
  await serverAnalytics.track('payment_failed', params.distinctId, {
    stripe_session_id: params.stripeSessionId,
    payment_status: 'failed',
    error_message: params.errorMessage,
    error_type: 'payment' as const,
    error_severity: 'critical' as const,
    error_code: params.errorCode,
  })
}

/**
 * Track webhook received
 */
export async function trackWebhookReceivedServer(params: {
  distinctId: string
  webhookSource: 'stripe' | 'other'
  webhookEventType: string
  webhookId?: string
  processingTimeMs?: number
  success: boolean
}) {
  await serverAnalytics.track('webhook_received', params.distinctId, {
    webhook_source: params.webhookSource,
    webhook_event_type: params.webhookEventType,
    webhook_id: params.webhookId,
    webhook_processing_time_ms: params.processingTimeMs,
    webhook_success: params.success,
  })
}

/**
 * Identify user from server
 */
export async function identifyUserServer(params: {
  userId: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  jobTitle?: string
}) {
  await serverAnalytics.identify(params.userId, {
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
    name:
      params.firstName && params.lastName
        ? `${params.firstName} ${params.lastName}`
        : undefined,
    company: params.company,
    job_title: params.jobTitle,
  })
}
