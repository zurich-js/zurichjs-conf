/**
 * Easter Egg System Types
 */

export interface EasterEggConfig {
  /** Whether the easter egg is enabled */
  enabled: boolean;
  /** Discount percentage (e.g., 5 for 5%) */
  percentOff: number;
  /** How long the discount token is valid (minutes) */
  tokenExpiryMinutes: number;
  /** Optional daily cap on total claims (0 = unlimited) */
  dailyClaimCap: number;
}

export interface ClaimResponse {
  code: string;
  expiresAt: string;
  percentOff: number;
  message: string;
}

export interface ErrorResponse {
  error: string;
  retryAfter?: number;
}
