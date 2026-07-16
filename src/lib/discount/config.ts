/**
 * Discount Pop-up Configuration
 *
 * The primary config lives in the admin-editable `discount_config` table and
 * is resolved server-side via getDiscountConfig() in config-server.ts. The
 * env-based values below are FALLBACKS ONLY (DB unreachable, or the client
 * config API failing) so the popup degrades gracefully instead of breaking.
 */

import type { DiscountConfig, ResolvedDiscountConfig } from './types';

export const COOKIE_NAMES = {
  COOLDOWN: 'discount_cooldown',
  DISMISSED: 'discount_dismissed',
  // httpOnly cookies (set by API, not readable client-side):
  // discount_code, discount_expires_at
} as const;

/** Env-based client fallback, used only if GET /api/discount/config fails. */
export function getClientConfig(): Pick<DiscountConfig, 'forceShow' | 'showProbability'> {
  return {
    forceShow: process.env.NEXT_PUBLIC_DISCOUNT_FORCE_SHOW === 'true',
    showProbability: parseFloat(process.env.NEXT_PUBLIC_DISCOUNT_SHOW_PROBABILITY || '0.25'),
  };
}

/**
 * Env-based server fallback. Prefer getDiscountConfig() from config-server.ts,
 * which reads the admin-editable DB row and only falls back to this.
 */
export function getServerConfig(): ResolvedDiscountConfig {
  return {
    showProbability: parseFloat(process.env.DISCOUNT_SHOW_PROBABILITY || '0.25'),
    percentOff: parseInt(process.env.DISCOUNT_PERCENT_OFF || '10', 10),
    durationMinutes: parseInt(process.env.DISCOUNT_DURATION_MINUTES || '120', 10),
    cooldownHours: parseInt(process.env.DISCOUNT_COOLDOWN_HOURS || '24', 10),
    forceShow: process.env.NEXT_PUBLIC_DISCOUNT_FORCE_SHOW === 'true',
    abPercentOff: parseInt(process.env.DISCOUNT_AB_PERCENT_OFF || '20', 10),
    abDurationMinutes: parseInt(process.env.DISCOUNT_AB_DURATION_MINUTES || '60', 10),
    abcPercentOff: parseInt(process.env.DISCOUNT_ABC_PERCENT_OFF || '30', 10),
    abcDurationMinutes: parseInt(process.env.DISCOUNT_ABC_DURATION_MINUTES || '30', 10),
    source: 'env',
  };
}
