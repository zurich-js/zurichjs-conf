/**
 * Analytics Module - Client-side exports only
 *
 * This barrel file only exports client-safe modules.
 *
 * For server-side analytics, import directly:
 *   import { serverAnalytics } from '@/lib/analytics/server'
 *   import { trackTicketPurchaseServer } from '@/lib/analytics/server-helpers'
 */

// Client-side analytics
export { analytics } from './client'

// Event types (types only, no runtime code)
export type * from './events'

// Client-side helper functions (safe for browser)
export * from './helpers'
