/**
 * Discount Admin API
 * Client-side API functions for the discount popup configuration
 */

import { queryKeys } from '@/lib/query-keys';
import type { DiscountConfigRow, DiscountConfigUpdateInput } from './types';

export const discountAdminQueryKeys = {
  config: queryKeys.discount.adminConfig,
};

export async function fetchDiscountConfigApi(): Promise<DiscountConfigRow> {
  const res = await fetch('/api/admin/discount/config');
  if (!res.ok) throw new Error('Failed to fetch discount config');
  return res.json();
}

export async function updateDiscountConfigApi(
  data: DiscountConfigUpdateInput
): Promise<DiscountConfigRow> {
  const res = await fetch('/api/admin/discount/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update discount config');
  }
  return res.json();
}
