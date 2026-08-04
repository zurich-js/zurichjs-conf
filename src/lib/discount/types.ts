/**
 * Discount Pop-up System Types
 */

export type DiscountState = 'idle' | 'loading' | 'modal_open' | 'minimized' | 'expired';

export interface DiscountData {
  code: string;
  expiresAt: string;
  percentOff: number;
}

export interface DiscountConfig {
  percentOff: number;
  durationMinutes: number;
}

/**
 * Full runtime config including the live popup offer (the former
 * aggressive-20 experiment winner, stored in the ab fields). Resolved from
 * the admin-editable `discount_config` table (see config-server.ts), falling
 * back to env vars when the DB is unreachable.
 */
export interface ResolvedDiscountConfig extends DiscountConfig {
  abPercentOff: number;
  abDurationMinutes: number;
  /** Where this config came from — 'env' means the DB fallback path was used */
  source: 'database' | 'env';
}

/** Client-safe subset served by GET /api/discount/config */
export interface DiscountClientConfigResponse {
  /** Advertised offer (%) shown on the email-gate step before a code exists */
  offerPercentOff: number;
}

export interface GenerateDiscountResponse {
  code: string;
  expiresAt: string;
  percentOff: number;
}

export interface DiscountStatusResponse {
  active: boolean;
  code?: string;
  expiresAt?: string;
  percentOff?: number;
}
