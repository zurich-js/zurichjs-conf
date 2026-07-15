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
  showProbability: number;
  percentOff: number;
  durationMinutes: number;
  cooldownHours: number;
  forceShow: boolean;
}

/**
 * Full runtime config including the experiment variant offers.
 * Resolved from the admin-editable `discount_config` table (see
 * config-server.ts), falling back to env vars when the DB is unreachable.
 */
export interface ResolvedDiscountConfig extends DiscountConfig {
  abPercentOff: number;
  abDurationMinutes: number;
  abcPercentOff: number;
  abcDurationMinutes: number;
  /** Where this config came from — 'env' means the DB fallback path was used */
  source: 'database' | 'env';
}

/** Client-safe subset served by GET /api/discount/config */
export interface DiscountClientConfigResponse {
  showProbability: number;
  forceShow: boolean;
  cooldownHours: number;
}

/** Offer parameters resolved server-side for one experiment variant */
export interface DiscountVariantConfig {
  percentOff: number;
  durationMinutes: number;
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
