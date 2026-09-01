/**
 * Machine-readable error codes.
 *
 * One registry for the whole platform. Every code appears in three places at
 * incident time and must match across them:
 *
 * 1. the API error response body (`{ error, code, requestId }`),
 * 2. the PostHog / Sentry event (`code` tag — searchable),
 * 3. the runbook (`docs/INCIDENT_RESPONSE.md`), which maps each code to a fix.
 *
 * Add a code here rather than inventing an inline string; `clientMessageFor`
 * is what API responses show users, so raw Stripe/Postgres text never leaks.
 */

export const ErrorCodes = {
  // Payments & fulfillment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CHECKOUT_SESSION_FAILED: 'CHECKOUT_SESSION_FAILED',
  WEBHOOK_SIGNATURE_INVALID: 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_PROCESSING_FAILED: 'WEBHOOK_PROCESSING_FAILED',
  TICKET_CREATION_FAILED: 'TICKET_CREATION_FAILED',
  TICKET_EMAIL_FAILED: 'TICKET_EMAIL_FAILED',
  REFUND_FAILED: 'REFUND_FAILED',
  REFUND_DB_UPDATE_FAILED: 'REFUND_DB_UPDATE_FAILED',
  TICKET_CANCEL_DB_UPDATE_FAILED: 'TICKET_CANCEL_DB_UPDATE_FAILED',
  TICKET_REASSIGN_FAILED: 'TICKET_REASSIGN_FAILED',
  WORKSHOP_SEAT_FULFILLMENT_FAILED: 'WORKSHOP_SEAT_FULFILLMENT_FAILED',
  WORKSHOP_OVERSOLD: 'WORKSHOP_OVERSOLD',

  // Infrastructure
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  EXTERNAL_SERVICE_FAILED: 'EXTERNAL_SERVICE_FAILED',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  CONFIG_MISSING: 'CONFIG_MISSING',

  // Request lifecycle
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
  /** Kept in sync with CFP_CLOSED_ERROR_CODE in `@/lib/cfp/closure`. */
  CFP_CLOSED: 'CFP_CLOSED',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Safe, actionable user-facing message per code. Shown verbatim in API error
 * responses — never put internal detail (table names, Stripe error text,
 * stack fragments) here.
 */
const clientMessages: Record<ErrorCode, string> = {
  PAYMENT_FAILED: 'The payment could not be completed. You have not been charged twice — please try again.',
  CHECKOUT_SESSION_FAILED: 'We could not start the checkout. Please try again in a moment.',
  WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature.',
  WEBHOOK_PROCESSING_FAILED: 'Webhook processing failed.',
  TICKET_CREATION_FAILED: 'Your payment succeeded but we hit a problem issuing the ticket. Our team has been alerted — please contact hello@zurichjs.com with your order email.',
  TICKET_EMAIL_FAILED: 'The ticket was created but the confirmation email could not be sent yet. It will be retried automatically.',
  REFUND_FAILED: 'The refund could not be processed.',
  REFUND_DB_UPDATE_FAILED: 'The refund went through on Stripe, but updating the ticket failed. Retry to reconcile — do not refund again.',
  TICKET_CANCEL_DB_UPDATE_FAILED: 'The ticket could not be marked as cancelled. Retry to reconcile.',
  TICKET_REASSIGN_FAILED: 'The ticket could not be reassigned.',
  WORKSHOP_SEAT_FULFILLMENT_FAILED: 'The workshop seat could not be registered after payment. Our team has been alerted.',
  WORKSHOP_OVERSOLD: 'This workshop is fully booked.',
  DB_QUERY_FAILED: 'A database operation failed. Please try again.',
  EMAIL_SEND_FAILED: 'The email could not be sent.',
  EXTERNAL_SERVICE_FAILED: 'An external service is currently unavailable. Please try again shortly.',
  RETRY_EXHAUSTED: 'The operation kept failing after several attempts.',
  CONFIG_MISSING: 'The server is misconfigured. Please contact hello@zurichjs.com.',
  VALIDATION_FAILED: 'Some of the submitted data is invalid.',
  AUTH_REQUIRED: 'You need to be signed in to do this.',
  AUTH_FORBIDDEN: 'You do not have permission to do this.',
  NOT_FOUND: 'The requested resource was not found.',
  METHOD_NOT_ALLOWED: 'This HTTP method is not supported here.',
  RATE_LIMITED: 'Too many requests — please wait a moment and try again.',
  CFP_CLOSED: 'The call for papers is closed.',
  INTERNAL: 'Something went wrong on our side. Please try again — if it keeps failing, contact hello@zurichjs.com.',
}

export function clientMessageFor(code: ErrorCode | string | undefined): string {
  if (code && code in clientMessages) {
    return clientMessages[code as ErrorCode]
  }
  return clientMessages.INTERNAL
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && value in clientMessages
}
