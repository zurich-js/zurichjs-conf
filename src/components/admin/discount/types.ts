/**
 * Discount Admin Types
 */

import type { Database } from '@/lib/types/database';

/**
 * Full discount_config row as returned by /api/admin/discount/config.
 *
 * `recurring_min_visits` is added by
 * 20260804000000_add_recurring_visitor_config.sql, so it's absent from
 * database.generated.ts until `pnpm regen-db-types` runs against a database with
 * the migration applied. Optional here so the form falls back to the default
 * against a pre-migration row; drop the intersection after regenerating.
 */
export type DiscountConfigRow = Database['public']['Tables']['discount_config']['Row'] & {
  recurring_min_visits?: number;
};

/**
 * Editable fields for the PUT request.
 *
 * The popup has no eligibility gating any more, so `show_probability`,
 * `cooldown_hours` and `force_show` are no longer accepted. The `abc_*` fields
 * are reused for the recurring-visitor offer.
 */
export interface DiscountConfigUpdateInput {
  percent_off?: number;
  duration_minutes?: number;
  ab_percent_off?: number;
  ab_duration_minutes?: number;
  /** Recurring-visitor offer, stored in the abc_* columns */
  abc_percent_off?: number;
  abc_duration_minutes?: number;
  /** Visit number at which the recurring offer kicks in */
  recurring_min_visits?: number;
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
