/**
 * Sponsorship Public Types
 * Types for public-facing sponsor display
 */

/**
 * Public sponsor data for homepage display
 */
export interface PublicSponsor {
  id: string;
  name: string;
  logo: string;
  url: string | null;
  tier: string;
  width: number;
  height: number;
}

/**
 * Tier to display size mapping for public sponsor logos
 */
export const TIER_DISPLAY_CONFIG: Record<string, { width: number; height: number }> = {
  diamond: { width: 4, height: 120 },
  platinum: { width: 4, height: 100 },
  gold: { width: 3, height: 100 },
  silver: { width: 2, height: 80 },
  bronze: { width: 2, height: 80 },
  supporter: { width: 2, height: 60 },
};
