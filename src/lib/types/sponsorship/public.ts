/**
 * Sponsorship Public Types
 * Types for public-facing sponsor display
 */

export interface GridSize {
  cols: number;
  rows: number;
}

/**
 * Public sponsor data for homepage display
 */
export interface PublicSponsor {
  id: string;
  name: string;
  logo: string;
  logoColor: string | null;
  url: string | null;
  tier: string;
  sizes: Record<string, GridSize>;
  priority: number;
}

/**
 * Tier to grid display config mapping
 * sizes: responsive grid spans per breakpoint
 * priority: packing order (lower = placed first)
 * sizeCategory: used for minimum empty slot calculation
 */
export const TIER_DISPLAY_CONFIG: Record<string, { sizes: Record<string, GridSize>; priority: number; sizeCategory: string }> = {
  diamond:   { sizes: { base: { cols: 2, rows: 2 }, xs: { cols: 3, rows: 2 } }, priority: 1, sizeCategory: 'large' },
  platinum:  { sizes: { base: { cols: 2, rows: 2 }, xs: { cols: 3, rows: 2 } }, priority: 1, sizeCategory: 'large' },
  gold:      { sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 2 } }, priority: 2, sizeCategory: 'medium' },
  silver:    { sizes: { base: { cols: 2, rows: 1 }, sm: { cols: 2, rows: 1 } }, priority: 3, sizeCategory: 'default' },
  bronze:    { sizes: { base: { cols: 1, rows: 1 } }, priority: 4, sizeCategory: 'small' },
  supporter: { sizes: { base: { cols: 1, rows: 1 } }, priority: 4, sizeCategory: 'small' },
};
