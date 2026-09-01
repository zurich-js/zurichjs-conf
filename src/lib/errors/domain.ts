/**
 * Domain error classes.
 *
 * Each subclass presets `type` and `severity` so a throw site only supplies
 * what is specific to the failure (message, code, cause, context). The class
 * name becomes the grouped issue title in PostHog and Sentry; the
 * auto-fingerprint in `AppError` (`ClassName/CODE`) keeps one logical failure
 * in one group even when messages vary.
 *
 * Rethrow-with-cause at lib boundaries:
 *
 *   try {
 *     await stripe.refunds.create(...)
 *   } catch (err) {
 *     throw new PaymentError('Stripe refund failed', {
 *       cause: err,
 *       code: ErrorCodes.REFUND_FAILED,
 *       context: { ticketId },
 *     })
 *   }
 *
 * Log each failure ONCE, where it is finally caught (usually the API route) —
 * the logger reads type/severity/code/fingerprint/context off the error.
 */

import { AppError, type AppErrorOptions } from './base'
import { ErrorCodes } from './codes'

type DomainErrorOptions = Omit<AppErrorOptions, 'type' | 'severity'> &
  Partial<Pick<AppErrorOptions, 'type' | 'severity'>>

/** Supabase/Postgres failure. Use `throwIfDbError` at destructure sites. */
export class DatabaseError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'system', severity: 'high', code: ErrorCodes.DB_QUERY_FAILED, ...options })
  }
}

/** Stripe (or other payment-provider) call failed. */
export class PaymentError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'payment', severity: 'critical', ...options })
  }
}

/**
 * Money was taken but delivering what was paid for failed (ticket row, seat
 * registration, refund bookkeeping). Always critical: someone paid and does
 * not have the thing.
 */
export class FulfillmentError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'payment', severity: 'critical', ...options })
  }
}

/** Resend (or other mail) send failed. */
export class EmailDeliveryError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'system', severity: 'high', code: ErrorCodes.EMAIL_SEND_FAILED, ...options })
  }
}

/** A third-party dependency (API, feed, exchange rates…) failed or timed out. */
export class ExternalServiceError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'network', severity: 'medium', code: ErrorCodes.EXTERNAL_SERVICE_FAILED, ...options })
  }
}

export class AuthError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'auth', severity: 'medium', code: ErrorCodes.AUTH_REQUIRED, ...options })
  }
}

/** Missing/invalid env or config. Critical: the deploy itself is broken. */
export class ConfigError extends AppError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super(message, { type: 'system', severity: 'critical', code: ErrorCodes.CONFIG_MISSING, ...options })
  }
}

/**
 * Route-level error carrying an HTTP status. `withApiHandler` maps it straight
 * to the response, so a handler can `throw new HttpError(404, 'No such ticket',
 * { code: ErrorCodes.NOT_FOUND })` instead of hand-rolling `res.status(...)`.
 * 4xx defaults to low severity (expected traffic), 5xx to high.
 */
export class HttpError extends AppError {
  readonly status: number

  constructor(status: number, message: string, options: DomainErrorOptions = {}) {
    super(message, {
      type: status === 401 || status === 403 ? 'auth' : status < 500 ? 'validation' : 'system',
      severity: status < 500 ? 'low' : 'high',
      ...options,
    })
    this.status = status
  }
}
