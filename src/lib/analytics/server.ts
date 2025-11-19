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

    this.client = new PostHog(key, {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
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
      type: 'ticket' | 'workshop' | 'voucher' | 'other'
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
