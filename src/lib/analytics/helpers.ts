/**
 * Analytics Helper Functions
 *
 * Convenience functions for common analytics tracking scenarios.
 * These helpers make it easy to track events consistently across the app.
 */

import { analytics } from './client'
import type { TicketCategory, TicketStage } from '@/lib/types/database'

// ============================================================================
// Variant Mapping Utilities
// ============================================================================

/**
 * UI variant type used in cart and pricing components
 * 'member' represents the combined Student/Unemployed ticket in the UI
 */
export type UIVariant = 'standard' | 'vip' | 'member';

/**
 * Maps UI variant to analytics TicketCategory
 *
 * The UI uses 'member' as a combined variant for Student/Unemployed tickets,
 * but analytics tracks these as 'student' category.
 *
 * Valid categories: standard, student, unemployed, vip
 * - 'member' → 'student' (combined student/unemployed in UI)
 * - undefined → 'standard' (fallback)
 *
 * @param variant - The UI variant from cart item
 * @returns The corresponding TicketCategory for analytics
 */
export function mapVariantToCategory(variant: UIVariant | string | undefined): TicketCategory {
  if (variant === 'member') {
    return 'student';
  }
  if (variant === 'standard' || variant === 'student' || variant === 'unemployed' || variant === 'vip') {
    return variant;
  }
  // Fallback for undefined or unknown variants
  return 'standard';
}

/**
 * Maps an array of cart items to analytics format
 * Centralizes the cart item transformation logic for consistent analytics tracking
 *
 * @param items - Array of cart items with variant and other properties
 * @returns Array of items formatted for analytics events
 */
export function mapCartItemsToAnalytics(items: Array<{
  title: string;
  variant?: string;
  quantity: number;
  price: number;
}>) {
  return items.map((item) => ({
    type: item.title.includes('Workshop') ? ('workshop_voucher' as const) : ('ticket' as const),
    category: mapVariantToCategory(item.variant),
    stage: 'general_admission' as TicketStage,
    quantity: item.quantity,
    price: item.price,
  }));
}

// ============================================================================
// Client-side Helpers
// ============================================================================

/**
 * Track ticket added to cart
 */
export function trackTicketAddedToCart(params: {
  category: TicketCategory
  stage: TicketStage
  price: number
  quantity: number
  currency?: string
}) {
  analytics.track('ticket_added_to_cart', {
    ticket_category: params.category,
    ticket_stage: params.stage,
    ticket_price: params.price,
    ticket_count: params.quantity,
    currency: params.currency || 'CHF',
    quantity: params.quantity,
  })
}

/**
 * Track checkout started
 */
export function trackCheckoutStarted(params: {
  cartItemCount: number
  cartTotalAmount: number
  cartCurrency: string
  cartItems: Array<{
    type: 'ticket' | 'workshop_voucher'
    category?: TicketCategory
    stage?: TicketStage
    quantity: number
    price: number
  }>
  email?: string
  firstName?: string
  lastName?: string
}) {
  analytics.track('checkout_started', {
    cart_item_count: params.cartItemCount,
    cart_total_amount: params.cartTotalAmount,
    cart_currency: params.cartCurrency,
    cart_items: params.cartItems,
    email: params.email,
    first_name: params.firstName,
    last_name: params.lastName,
  })
}

/**
 * Track form error
 */
export function trackFormError(params: {
  formName: string
  formField?: string
  errorMessage: string
  errorType?: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
}) {
  analytics.track('form_error', {
    form_name: params.formName,
    form_field: params.formField,
    error_message: params.errorMessage,
    error_type: params.errorType || 'validation',
    error_severity: 'low',
  })
}

/**
 * Track button click
 */
export function trackButtonClick(params: {
  buttonText: string
  buttonId?: string
  buttonLocation: string
  buttonAction: string
}) {
  analytics.track('button_clicked', {
    button_text: params.buttonText,
    button_id: params.buttonId,
    button_location: params.buttonLocation,
    button_action: params.buttonAction,
  })
}

/**
 * Track workshop viewed
 */
export function trackWorkshopViewed(params: {
  workshopId: string
  workshopTitle: string
  workshopInstructor?: string
  workshopCapacity?: number
}) {
  analytics.track('workshop_viewed', {
    workshop_id: params.workshopId,
    workshop_title: params.workshopTitle,
    workshop_instructor: params.workshopInstructor,
    workshop_capacity: params.workshopCapacity,
  })
}

// ============================================================================
// Error Tracking Helpers
// ============================================================================

export type ErrorType = 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

interface CaptureExceptionOptions {
  type?: ErrorType
  severity?: ErrorSeverity
  code?: string
  context?: Record<string, unknown>
  /** The flow/feature where the error occurred */
  flow?: string
  /** The specific action that failed */
  action?: string
  /** User email (for identification) */
  userEmail?: string
}

/**
 * Capture an exception to PostHog with full context
 * This is the primary method for manual error capturing in components
 *
 * @example
 * try {
 *   await loginUser(email)
 * } catch (error) {
 *   captureException(error, {
 *     type: 'auth',
 *     severity: 'high',
 *     flow: 'cfp_login',
 *     action: 'send_magic_link',
 *     userEmail: email,
 *   })
 * }
 */
export function captureException(
  error: Error | unknown,
  options: CaptureExceptionOptions = {}
): void {
  const err = error instanceof Error ? error : new Error(String(error))

  analytics.error(err.message, err, {
    type: options.type || 'unknown',
    severity: options.severity || 'medium',
    code: options.code,
    flow: options.flow,
    action: options.action,
    user_email: options.userEmail,
    ...options.context,
  })
}

/**
 * Capture a network/API error with automatic context extraction
 *
 * @example
 * const response = await fetch('/api/cfp/auth/login', { ... })
 * if (!response.ok) {
 *   const data = await response.json()
 *   captureNetworkError(response, data.error, {
 *     flow: 'cfp_login',
 *     action: 'send_magic_link',
 *   })
 * }
 */
export function captureNetworkError(
  response: Response,
  errorMessage?: string,
  options: Omit<CaptureExceptionOptions, 'type'> = {}
): void {
  const error = new Error(errorMessage || `HTTP ${response.status}: ${response.statusText}`)

  const severity: ErrorSeverity = response.status >= 500 ? 'high' :
    response.status === 401 || response.status === 403 ? 'medium' : 'low'

  captureException(error, {
    type: 'network',
    severity,
    code: `HTTP_${response.status}`,
    context: {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
    },
    ...options,
  })
}

/**
 * Capture an authentication error
 *
 * @example
 * captureAuthError('Magic link expired', {
 *   flow: 'cfp_speaker_login',
 *   action: 'verify_magic_link',
 *   userEmail: email,
 * })
 */
export function captureAuthError(
  message: string,
  options: Omit<CaptureExceptionOptions, 'type'> = {}
): void {
  captureException(new Error(message), {
    type: 'auth',
    severity: options.severity || 'high',
    ...options,
  })
}

/**
 * Capture a validation error (typically low severity)
 */
export function captureValidationError(
  message: string,
  options: Omit<CaptureExceptionOptions, 'type' | 'severity'> = {}
): void {
  captureException(new Error(message), {
    type: 'validation',
    severity: 'low',
    ...options,
  })
}

/**
 * Create an error handler for async operations with automatic error capturing
 * Returns a wrapper function that captures errors and optionally rethrows
 *
 * @example
 * const handleLogin = withErrorCapture(
 *   async () => {
 *     const response = await fetch('/api/login', { ... })
 *     if (!response.ok) throw new Error('Login failed')
 *     return response.json()
 *   },
 *   { flow: 'login', action: 'submit', type: 'auth' }
 * )
 */
export function withErrorCapture<T>(
  fn: () => Promise<T>,
  options: CaptureExceptionOptions & { rethrow?: boolean } = {}
): () => Promise<T | undefined> {
  return async () => {
    try {
      return await fn()
    } catch (error) {
      captureException(error, options)
      if (options.rethrow !== false) {
        throw error
      }
      return undefined
    }
  }
}

// ============================================================================
// CFP-Specific Error Tracking
// ============================================================================

/**
 * Track CFP login attempt and result
 */
export function trackCfpLoginAttempt(params: {
  type: 'speaker' | 'reviewer'
  email: string
  success: boolean
  errorMessage?: string
}) {
  if (params.success) {
    analytics.track('cfp_login_requested', {
      login_type: params.type,
      email: params.email,
    } as Parameters<typeof analytics.track<'cfp_login_requested'>>[1])
  } else {
    captureAuthError(params.errorMessage || 'Login failed', {
      flow: `cfp_${params.type}_login`,
      action: 'send_magic_link',
      userEmail: params.email,
      context: { login_type: params.type },
    })
  }
}

/**
 * Track CFP auth callback result
 */
export function trackCfpAuthCallback(params: {
  type: 'speaker' | 'reviewer'
  success: boolean
  errorMessage?: string
  isExpired?: boolean
}) {
  if (params.success) {
    // Use the type-specific authentication event
    if (params.type === 'speaker') {
      analytics.track('cfp_speaker_authenticated', {} as Parameters<typeof analytics.track<'cfp_speaker_authenticated'>>[1])
    } else {
      analytics.track('cfp_reviewer_authenticated', {} as Parameters<typeof analytics.track<'cfp_reviewer_authenticated'>>[1])
    }
  } else {
    captureAuthError(params.errorMessage || 'Auth callback failed', {
      flow: `cfp_${params.type}_auth_callback`,
      action: params.isExpired ? 'expired_link' : 'verify_session',
      severity: params.isExpired ? 'low' : 'high',
      context: {
        auth_type: params.type,
        is_expired: params.isExpired,
      },
    })
  }
}

/**
 * Track CFP submission errors
 */
export function trackCfpSubmissionError(params: {
  action: 'create' | 'update' | 'submit' | 'withdraw' | 'delete'
  submissionId?: string
  errorMessage: string
}) {
  captureException(new Error(params.errorMessage), {
    type: 'network',
    severity: 'medium',
    flow: 'cfp_submission',
    action: params.action,
    context: {
      submission_id: params.submissionId,
    },
  })
}

/**
 * Track CFP review errors
 */
export function trackCfpReviewError(params: {
  action: 'submit' | 'update'
  submissionId: string
  errorMessage: string
}) {
  captureException(new Error(params.errorMessage), {
    type: 'network',
    severity: 'medium',
    flow: 'cfp_review',
    action: params.action,
    context: {
      submission_id: params.submissionId,
    },
  })
}

