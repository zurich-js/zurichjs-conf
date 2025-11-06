/**
 * Query key factories for TanStack Query
 * Centralized management of all query keys
 */

/**
 * Tickets query keys
 */
export const ticketsKeys = {
  /**
   * Base key for all ticket queries
   */
  all: ['tickets'] as const,

  /**
   * Key for pricing queries
   */
  pricing: () => [...ticketsKeys.all, 'pricing'] as const,
} as const;

/**
 * Checkout query keys
 */
export const checkoutKeys = {
  /**
   * Base key for all checkout queries
   */
  all: ['checkout'] as const,

  /**
   * Key for session queries
   */
  sessions: () => [...checkoutKeys.all, 'session'] as const,
  session: (sessionId: string) => [...checkoutKeys.sessions(), sessionId] as const,
} as const;

/**
 * All query keys organized by domain
 */
export const queryKeys = {
  tickets: ticketsKeys,
  checkout: checkoutKeys,
} as const;

