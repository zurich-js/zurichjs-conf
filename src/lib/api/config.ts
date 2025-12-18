/**
 * API Configuration
 * Type-safe base URL and endpoint management
 */

import type { SupportedCurrency } from '@/config/currency';

/**
 * API environment configuration
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

/**
 * Get the base URL for API calls
 * On server, uses absolute URL; on client, uses relative URL
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser: use relative URL
    return '';
  }

  // Server: use absolute URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Default API configuration
 */
export const defaultApiConfig: ApiConfig = {
  baseUrl: getBaseUrl(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * API endpoint definitions
 * Type-safe endpoint paths with parameter support
 */
export const endpoints = {
  tickets: {
    pricing: (currency?: SupportedCurrency) =>
      currency
        ? (`/api/tickets/pricing?currency=${currency}` as const)
        : ('/api/tickets/pricing' as const),
    purchase: () => '/api/tickets/purchase' as const,
    byId: (id: string) => `/api/tickets/${id}` as const,
  },
  workshops: {
    vouchers: () => '/api/workshops/vouchers' as const,
  },
  checkout: {
    session: (sessionId: string) => `/api/checkout/session?session_id=${sessionId}` as const,
    createSession: () => '/api/checkout/create-session' as const,
  },
  newsletter: {
    subscribe: () => '/api/newsletter/subscribe' as const,
  },
  // Add more endpoint groups as your API grows
  // Example:
  // speakers: {
  //   list: () => '/api/speakers' as const,
  //   byId: (id: string) => `/api/speakers/${id}` as const,
  // },
  // schedule: {
  //   list: () => '/api/schedule' as const,
  //   byDate: (date: string) => `/api/schedule/${date}` as const,
  // },
} as const;

/**
 * Type helper to extract endpoint paths
 */
export type EndpointPath = ReturnType<
  | typeof endpoints.tickets.pricing
  | typeof endpoints.tickets.purchase
  | typeof endpoints.tickets.byId
  | typeof endpoints.workshops.vouchers
  | typeof endpoints.checkout.session
  | typeof endpoints.checkout.createSession
  | typeof endpoints.newsletter.subscribe
>;

/**
 * Build full URL from endpoint path
 */
export function buildUrl(endpoint: string, config: ApiConfig = defaultApiConfig): string {
  return `${config.baseUrl}${endpoint}`;
}



