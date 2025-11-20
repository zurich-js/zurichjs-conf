/**
 * PostHog Analytics Client (Browser)
 *
 * Type-safe wrapper around PostHog for client-side analytics.
 * Provides methods for tracking events, identifying users, and revenue tracking.
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics/client'
 *   analytics.track('ticket_purchased', { ... })
 */

import posthog from 'posthog-js'
import type { EventName, EventProperties } from './events'

class AnalyticsClient {
  private initialized = false

  /**
   * Initialize PostHog (now handled in _app.tsx)
   * This method is kept for backwards compatibility but does nothing
   */
  init() {
    // PostHog is now initialized directly in _app.tsx
    // We just check if it's available and mark as initialized
    if (typeof window === 'undefined') {
      return
    }

    // Check if PostHog has a distinct_id (meaning it's initialized)
    try {
      const distinctId = posthog.get_distinct_id()
      if (distinctId) {
        this.initialized = true
        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics] Using PostHog instance initialized in _app.tsx')
        }
      }
    } catch (error) {
      console.warn('[Analytics] PostHog not yet initialized')
    }
  }

  /**
   * Track an analytics event with full type safety
   *
   * @example
   * analytics.track('ticket_purchased', {
   *   ticket_category: 'standard',
   *   ticket_stage: 'early_bird',
   *   ticket_price: 4900,
   *   currency: 'CHF',
   *   revenue_amount: 4900,
   *   revenue_currency: 'CHF',
   *   revenue_type: 'ticket',
   *   // ... other properties
   * })
   */
  track<T extends EventName>(
    event: T,
    properties: Omit<EventProperties<T>, keyof typeof this.getCommonProperties>
  ): void {
    // Auto-detect if PostHog is initialized
    if (!this.initialized && typeof window !== 'undefined') {
      try {
        if (posthog.get_distinct_id()) {
          this.initialized = true
        }
      } catch {
        // PostHog not initialized yet
      }
    }

    if (!this.initialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Event tracked (not initialized):', event, properties)
      }
      return
    }

    const enrichedProperties = {
      ...this.getCommonProperties(),
      ...properties,
    }

    posthog.capture(event, enrichedProperties)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Event tracked:', event, enrichedProperties)
    }
  }

  /**
   * Identify a user with their properties
   *
   * @example
   * analytics.identify('user_123', {
   *   email: 'user@example.com',
   *   name: 'John Doe',
   *   company: 'Acme Inc',
   * })
   */
  identify(
    userId: string,
    properties?: {
      email?: string
      name?: string
      first_name?: string
      last_name?: string
      company?: string
      job_title?: string
      [key: string]: unknown
    }
  ): void {
    if (!this.initialized) {
      return
    }

    posthog.identify(userId, properties)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] User identified:', userId, properties)
    }
  }

  /**
   * Set properties for the current user
   */
  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.initialized) {
      return
    }

    posthog.people.set(properties)
  }

  /**
   * Reset user identity (on logout)
   */
  reset(): void {
    if (!this.initialized) {
      return
    }

    posthog.reset()

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] User reset')
    }
  }

  /**
   * Track a page view
   *
   * @example
   * analytics.pageView('/tickets', 'Tickets', 'tickets')
   */
  pageView(
    path: string,
    title?: string,
    category?: 'landing' | 'tickets' | 'workshops' | 'checkout' | 'admin' | 'other'
  ): void {
    if (!this.initialized) {
      return
    }

    posthog.capture('$pageview', {
      $current_url: window.location.href,
      page_path: path,
      page_name: title || document.title,
      page_category: category,
    })

    // Also track our custom event
    this.track('page_viewed', {
      page_path: path,
      page_name: title || document.title,
      page_category: category,
    } as EventProperties<'page_viewed'>)
  }

  /**
   * Track revenue (for revenue analytics)
   *
   * PostHog revenue tracking requires specific event structure.
   * This method ensures proper formatting.
   *
   * @example
   * analytics.revenue({
   *   amount: 4900,
   *   currency: 'CHF',
   *   type: 'ticket',
   *   transactionId: 'cs_123',
   *   productName: 'Early Bird Standard Ticket',
   * })
   */
  revenue(params: {
    /** Amount in smallest currency unit (cents) */
    amount: number
    /** ISO 4217 currency code */
    currency: string
    /** Type of revenue */
    type: 'ticket' | 'workshop' | 'voucher' | 'other'
    /** Transaction ID */
    transactionId?: string
    /** Product name */
    productName?: string
    /** Product category */
    productCategory?: string
    /** Additional metadata */
    metadata?: Record<string, unknown>
  }): void {
    if (!this.initialized) {
      return
    }

    // PostHog revenue tracking format
    posthog.capture('purchase', {
      revenue_amount: params.amount,
      revenue_currency: params.currency,
      revenue_type: params.type,
      transaction_id: params.transactionId,
      product_name: params.productName,
      product_category: params.productCategory,
      ...params.metadata,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Revenue tracked:', params)
    }
  }

  /**
   * Track an error
   */
  error(
    message: string,
    error?: Error,
    context?: {
      type?: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
      severity?: 'low' | 'medium' | 'high' | 'critical'
      code?: string
      [key: string]: unknown
    }
  ): void {
    if (!this.initialized) {
      return
    }

    const errorProperties: EventProperties<'error_occurred'> = {
      error_message: message,
      error_type: context?.type || 'unknown',
      error_severity: context?.severity || 'medium',
      error_code: context?.code,
      error_stack: error?.stack,
      error_context: context,
    }

    this.track('error_occurred', errorProperties)

    // Also use PostHog's exception tracking
    if (error) {
      posthog.captureException(error, {
        tags: {
          type: context?.type,
          severity: context?.severity,
        },
      })
    }
  }

  /**
   * Get the PostHog instance for advanced usage
   */
  getInstance() {
    return posthog
  }

  /**
   * Check if PostHog is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get common properties added to all events
   */
  private getCommonProperties() {
    if (typeof window === 'undefined') {
      return {}
    }

    return {
      timestamp: Date.now(),
      page_url: window.location.href,
      page_title: document.title,
      user_agent: navigator.userAgent,
      referrer: document.referrer || undefined,
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsClient()

// NOTE: Do not auto-initialize here!
// PostHog initialization is handled in _app.tsx using PostHogProvider
// This ensures proper timing and avoids the 401 api_key errors with session recording
