/**
 * Easter Egg Configuration
 *
 * Environment variables:
 * - EASTER_EGG_ENABLED: Enable/disable the feature (default: true)
 * - EASTER_EGG_PERCENT_OFF: Discount percentage (default: 5)
 * - EASTER_EGG_TOKEN_EXPIRY_MINUTES: Token validity (default: 15)
 * - EASTER_EGG_DAILY_CAP: Daily claim limit, 0 = unlimited (default: 0)
 */

import type { EasterEggConfig } from './types';

export function getEasterEggConfig(): EasterEggConfig {
  return {
    enabled: process.env.EASTER_EGG_ENABLED !== 'false',
    percentOff: parseInt(process.env.EASTER_EGG_PERCENT_OFF || '5', 10),
    tokenExpiryMinutes: parseInt(process.env.EASTER_EGG_TOKEN_EXPIRY_MINUTES || '15', 10),
    dailyClaimCap: parseInt(process.env.EASTER_EGG_DAILY_CAP || '0', 10),
  };
}
