/**
 * PostHog Analytics Server (Node.js)
 *
 * Type-safe wrapper around PostHog Node SDK for server-side analytics.
 * Use this in API routes, webhooks, and server-side rendering.
 *
 * Usage:
 *   import { serverAnalytics } from '@/lib/analytics/server'
 *   await serverAnalytics.track('ticket_purchased', userId, { ... })
 */

import { PostHog } from 'posthog-node'
import type { EventName, EventProperties } from './events'

class ServerAnalyticsClient {
  private client: PostHog | null = null
  private initialized = false

  /**
   * Initialize PostHog Node client
   */
  private init() {
    if (this.initialized) {
      return
    }

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      console.warn('[ServerAnalytics] PostHog key not configured')
      return
    }

    // Serverless-friendly flushing: a Vercel function is frozen the moment the
    // response is sent, so an event buffered for "20 events or 10 seconds"
    // usually never leaves the process. Sending each event immediately is what
    // the PostHog docs prescribe for lambdas — server events are low-volume.
    this.client = new PostHog(key, {
      host: 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })

    this.initialized = true

    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerAnalytics] PostHog server client initialized')
    }
  }

  /**
   * Track an analytics event from the server
   *
   * @param event - Event name
   * @param distinctId - User ID or anonymous ID
   * @param properties - Event properties
   *
   * @example
   * await serverAnalytics.track('ticket_purchased', userId, {
   *   ticket_category: 'standard',
   *   ticket_price: 4900,
   *   // ... other properties
   * })
   */
  async track<T extends EventName>(
    event: T,
    distinctId: string,
    properties: Omit<EventProperties<T>, 'timestamp' | 'page_url' | 'page_title' | 'user_agent' | 'referrer'>
  ): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ServerAnalytics] Event tracked (client not initialized):', event, properties)
      }
      return
    }

    const enrichedProperties = {
      timestamp: Date.now(),
      ...properties,
    }

    this.client.capture({
      distinctId,
      event,
      properties: enrichedProperties,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerAnalytics] Event tracked:', event, enrichedProperties)
    }
  }

  /**
   * Identify a user
   *
   * @example
   * await serverAnalytics.identify('user_123', {
   *   email: 'user@example.com',
   *   name: 'John Doe',
   * })
   */
  async identify(
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
  ): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      return
    }

    this.client.identify({
      distinctId: userId,
      properties,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerAnalytics] User identified:', userId, properties)
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(userId: string, properties: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      return
    }

    this.client.identify({
      distinctId: userId,
      properties,
    })
  }

  /**
   * Track revenue from server (e.g., in webhooks)
   *
   * @example
   * await serverAnalytics.revenue('user_123', {
   *   amount: 4900,
   *   currency: 'CHF',
   *   type: 'ticket',
   *   transactionId: 'cs_123',
   * })
   */
  async revenue(
    distinctId: string,
    params: {
      amount: number
      currency: string
      type: 'ticket' | 'workshop' | 'other'
      transactionId?: string
      productName?: string
      productCategory?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      return
    }

    this.client.capture({
      distinctId,
      event: 'purchase',
      properties: {
        revenue_amount: params.amount,
        revenue_currency: params.currency,
        revenue_type: params.type,
        transaction_id: params.transactionId,
        product_name: params.productName,
        product_category: params.productCategory,
        ...params.metadata,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[ServerAnalytics] Revenue tracked:', params)
    }
  }

  /**
   * Track an error from the server
   */
  async error(
    distinctId: string,
    message: string,
    context?: {
      type?: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
      severity?: 'low' | 'medium' | 'high' | 'critical'
      code?: string
      stack?: string
      [key: string]: unknown
    }
  ): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      return
    }

    const errorProperties: EventProperties<'error_occurred'> = {
      error_message: message,
      error_type: context?.type || 'unknown',
      error_severity: context?.severity || 'medium',
      error_code: context?.code,
      error_stack: context?.stack,
      error_context: context,
    }

    this.client.capture({
      distinctId,
      event: 'error_occurred',
      properties: errorProperties,
    })
  }

  /**
   * Capture an exception for PostHog Error Tracking.
   *
   * Goes through the SDK's native `captureException`, which builds the
   * structured `$exception_list` (parsed frames, error name, `cause` chain) that
   * the error-tracking UI needs for clean issue titles and grouping. The old
   * hand-rolled `$exception_message`/`$exception_stack_trace_raw` properties
   * produced issues titled with nothing but the exception class.
   *
   * Pass `fingerprint` to force grouping when one logical issue would otherwise
   * split across many groups.
   *
   * Returns a promise that resolves once the event has been handed to the
   * network. AWAIT it where the runtime allows (e.g. `onRequestError`) so a
   * serverless function is not frozen before delivery; a synchronous caller
   * (the logger) may fire-and-forget — the method never rejects.
   */
  async captureException(
    error: Error | unknown,
    context?: {
      distinctId?: string
      type?: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'
      severity?: 'low' | 'medium' | 'high' | 'critical'
      fingerprint?: string
      flow?: string
      action?: string
      [key: string]: unknown
    }
  ): Promise<void> {
    if (!this.initialized) {
      this.init()
    }

    if (!this.client) {
      return
    }

    const { distinctId, fingerprint, type, severity, ...rest } = context ?? {}

    const properties: Record<string, unknown> = {
      error_type: type || 'unknown',
      error_severity: severity || 'medium',
      ...rest,
    }
    if (fingerprint) {
      properties.$exception_fingerprint = fingerprint
    }

    try {
      // `captureExceptionImmediate` sends the request now instead of buffering —
      // buffered exceptions are routinely lost when the serverless function is
      // frozen after responding. No distinctId fallback: the SDK generates a
      // per-event id when it is absent, whereas a shared 'anonymous' id would
      // merge every unattributed error into one person profile.
      await this.client.captureExceptionImmediate(error, distinctId, properties)

      if (process.env.NODE_ENV === 'development') {
        // JSON-encoded so user input echoed in an error message cannot forge
        // log lines (log injection) — control characters arrive escaped.
        console.log('[ServerAnalytics] Exception captured:', JSON.stringify({
          message: error instanceof Error ? error.message : String(error),
          context,
        }))
      }
    } catch (captureError: unknown) {
      // Error reporting must never make the route that is already failing
      // also slower or crashier.
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[ServerAnalytics] Failed to capture exception:',
          JSON.stringify(captureError instanceof Error ? captureError.message : String(captureError))
        )
      }
    }
  }

  /**
   * Flush all pending events
   * Call this before serverless function terminates
   */
  async flush(): Promise<void> {
    if (!this.client) {
      return
    }

    await this.client.flush()
  }

  /**
   * Shutdown the client (call on process exit)
   */
  async shutdown(): Promise<void> {
    if (!this.client) {
      return
    }

    await this.client.shutdown()
  }

  /**
   * Get the PostHog client instance for advanced usage
   */
  getInstance(): PostHog | null {
    if (!this.initialized) {
      this.init()
    }
    return this.client
  }
}

// Export singleton instance
export const serverAnalytics = new ServerAnalyticsClient()

// Graceful shutdown on process exit
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await serverAnalytics.shutdown()
  })

  process.on('SIGTERM', async () => {
    await serverAnalytics.shutdown()
  })
}
