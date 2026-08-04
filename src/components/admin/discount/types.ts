/**
 * Discount Admin Types
 */

import type { Database } from '@/lib/types/database';

/** Full discount_config row as returned by /api/admin/discount/config */
export type DiscountConfigRow = Database['public']['Tables']['discount_config']['Row'];

/**
 * Editable fields for the PUT request.
 *
 * The popup has no eligibility gating any more, so `show_probability`,
 * `cooldown_hours` and `force_show` are no longer accepted — nor are the
 * `abc_*` fields from the concluded price-sensitive experiment.
 */
export interface DiscountConfigUpdateInput {
  percent_off?: number;
  duration_minutes?: number;
  ab_percent_off?: number;
  ab_duration_minutes?: number;
}

/** Request body for minting a corporate access link */
export interface CorporateLinkInput {
  label: string;
  validDays: number;
}

export interface CorporateLinkResponse {
  code: string;
  url: string;
  label: string;
}
