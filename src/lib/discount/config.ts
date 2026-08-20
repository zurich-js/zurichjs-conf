/**
 * Discount Pop-up Configuration
 *
 * The primary config lives in the admin-editable `discount_config` table and
 * is resolved server-side via getDiscountConfig() in config-server.ts. The
 * env-based values below are FALLBACKS ONLY (DB unreachable, or the client
 * config API failing) so the popup degrades gracefully instead of breaking.
 */

import type { ResolvedDiscountConfig } from './types';

/**
 * Last-resort defaults for the recurring-visitor offer, used only when
 * `discount_config` is unreachable. Mirrors the column defaults in
 * 20260804000000_add_recurring_visitor_config.sql — the DB row is the source of
 * truth and is edited in the admin Discount tab.
 */
export const RECURRING_OFFER_DEFAULTS = {
  percentOff: 30,
  durationMinutes: 30,
  minVisits: 3,
} as const;

export const COOKIE_NAMES = {
  DISMISSED: 'discount_dismissed',
  /**
   * Short-lived handoff from /corporate/<code>. That route redirects on the
   * server, so it can't touch localStorage — it leaves the organisation label
   * here for the landing page to promote into the durable marker. Deliberately
   * NOT httpOnly: the client is the whole point.
   */
  CORPORATE_HANDOFF: 'corporate_handoff',
  // httpOnly cookies (set by API, not readable client-side):
  // discount_code, discount_expires_at
} as const;

/**
 * Env-based server fallback. Prefer getDiscountConfig() from config-server.ts,
 * which reads the admin-editable DB row and only falls back to this.
 */
export function getServerConfig(): ResolvedDiscountConfig {
  return {
    percentOff: parseInt(process.env.DISCOUNT_PERCENT_OFF || '10', 10),
    durationMinutes: parseInt(process.env.DISCOUNT_DURATION_MINUTES || '120', 10),
    abPercentOff: parseInt(process.env.DISCOUNT_AB_PERCENT_OFF || '20', 10),
    abDurationMinutes: parseInt(process.env.DISCOUNT_AB_DURATION_MINUTES || '60', 10),
    // Recurring-visitor settings are admin config only (discount_config), never
    // env — these constants exist purely so a DB outage still yields a usable
    // offer, and they match the column defaults.
    recurringPercentOff: RECURRING_OFFER_DEFAULTS.percentOff,
    recurringDurationMinutes: RECURRING_OFFER_DEFAULTS.durationMinutes,
    recurringMinVisits: RECURRING_OFFER_DEFAULTS.minVisits,
    source: 'env',
  };
}
