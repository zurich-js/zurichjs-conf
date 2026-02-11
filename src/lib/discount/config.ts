/**
 * Discount Pop-up Configuration
 */

import type { DiscountConfig } from './types';

export const COOKIE_NAMES = {
  COOLDOWN: 'discount_cooldown',
  DISMISSED: 'discount_dismissed',
  // httpOnly cookies (set by API, not readable client-side):
  // discount_code, discount_expires_at
} as const;

export function getClientConfig(): Pick<DiscountConfig, 'forceShow'> {
  return {
    forceShow: process.env.NEXT_PUBLIC_DISCOUNT_FORCE_SHOW === 'true',
  };
}

export function getServerConfig(): DiscountConfig {
  return {
    showProbability: parseFloat(process.env.DISCOUNT_SHOW_PROBABILITY || '0.25'),
    percentOff: parseInt(process.env.DISCOUNT_PERCENT_OFF || '10', 10),
    durationMinutes: parseInt(process.env.DISCOUNT_DURATION_MINUTES || '120', 10),
    cooldownHours: parseInt(process.env.DISCOUNT_COOLDOWN_HOURS || '24', 10),
    forceShow: process.env.NEXT_PUBLIC_DISCOUNT_FORCE_SHOW === 'true',
  };
}
