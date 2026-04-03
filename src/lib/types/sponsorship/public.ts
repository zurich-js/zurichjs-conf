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
  diamond:   {
      sizes: {
        base: { cols: 4, rows: 4 },
        xs: { cols: 6, rows: 4 },
        sm: { cols: 6, rows: 4 }
      },
      priority: 1,
      sizeCategory: 'extralarge'
  },
  platinum:  {
      sizes: {
        base: { cols: 4, rows: 3 },
        xs: { cols: 6, rows: 4 }
      },
      priority: 2,
      sizeCategory: 'large'
  },
  gold:      {
      sizes: {
        base: { cols: 4, rows: 2 },
        sm: { cols: 5, rows: 4 }
      },
      priority: 3,
      sizeCategory: 'medium'
  },
  silver:    {
      sizes: {
        base: { cols: 2, rows: 2 },
        sm: { cols: 4, rows: 2 }
      },
      priority: 4,
      sizeCategory: 'default'
  },
  bronze:    {
      sizes: {
        base: { cols: 2, rows: 1 },
        md: { cols: 3, rows: 2 }
      },
      priority: 5,
      sizeCategory: 'small'
  },
  supporter: {
      sizes: {
        base: { cols: 1, rows: 1 },
        md: { cols: 2, rows: 2 }
      },
      priority: 6,
      sizeCategory: 'tiny'
  },
};
