/**
 * Discount Admin Types
 */

import type { Database } from '@/lib/types/database';

/** Full discount_config row as returned by /api/admin/discount/config */
export type DiscountConfigRow = Database['public']['Tables']['discount_config']['Row'];

/** Editable fields for the PUT request */
export interface DiscountConfigUpdateInput {
  show_probability?: number;
  percent_off?: number;
  duration_minutes?: number;
  cooldown_hours?: number;
  force_show?: boolean;
  ab_percent_off?: number;
  ab_duration_minutes?: number;
  abc_percent_off?: number;
  abc_duration_minutes?: number;
}
