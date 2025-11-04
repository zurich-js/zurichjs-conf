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
 * All query keys organized by domain
 */
export const queryKeys = {
  tickets: ticketsKeys,
} as const;

