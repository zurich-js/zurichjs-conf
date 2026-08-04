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
  /**
   * Sweetened offer for recurring visitors — someone on their 3rd+ visit who
   * still hasn't bought is hesitating, and price is the most likely reason.
   * Stored in the abc_* columns, which previously held the retired
   * price-sensitive experiment variant.
   */
  recurringPercentOff: number;
  recurringDurationMinutes: number;
  /** Where this config came from — 'env' means the DB fallback path was used */
  source: 'database' | 'env';
}

/** Client-safe subset served by GET /api/discount/config */
export interface DiscountClientConfigResponse {
  /** Advertised offer (%) shown on the email-gate step before a code exists */
  offerPercentOff: number;
  /** Advertised offer (%) for recurring visitors (3rd+ visit) */
  recurringOfferPercentOff: number;
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
