/**
 * VIP Perks Admin API
 * Client-side API functions for VIP perk management
 */

import type { VipPerkWithTicket, VipPerksStats, VipPerkConfig, BackfillVipPerksResponse, StripeProductInfo } from './types';

export interface VipPerksListResponse {
  perks: VipPerkWithTicket[];
  stats: VipPerksStats;
}

export async function fetchVipPerks(): Promise<VipPerksListResponse> {
  const res = await fetch('/api/admin/vip-perks');
  if (!res.ok) throw new Error('Failed to fetch VIP perks');
  return res.json();
}

export async function fetchVipPerkConfig(): Promise<VipPerkConfig> {
  const res = await fetch('/api/admin/vip-perks/config');
  if (!res.ok) throw new Error('Failed to fetch VIP perk config');
  return res.json();
}

export async function fetchVipPerkProducts(): Promise<StripeProductInfo[]> {
  const res = await fetch('/api/admin/vip-perks/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function updateVipPerkConfigApi(
  data: {
    discount_percent?: number;
    restricted_product_ids?: string[];
    expires_at?: string | null;
    auto_send_email?: boolean;
    custom_email_message?: string | null;
  }
): Promise<VipPerkConfig> {
  const res = await fetch('/api/admin/vip-perks/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update config');
  }
  return res.json();
}

export async function createVipPerkApi(data: {
  ticket_id: string;
  send_email?: boolean;
  custom_message?: string;
}): Promise<{ perk: VipPerkWithTicket }> {
  const res = await fetch('/api/admin/vip-perks/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create VIP perk');
  }
  return res.json();
}

export async function backfillVipPerksApi(data: {
  dry_run?: boolean;
  send_emails?: boolean;
  custom_message?: string;
}): Promise<BackfillVipPerksResponse> {
  const res = await fetch('/api/admin/vip-perks/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to run backfill');
  }
  return res.json();
}

export async function sendVipPerkEmailApi(perkId: string, customMessage?: string): Promise<void> {
  const res = await fetch(`/api/admin/vip-perks/${perkId}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ custom_message: customMessage }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to send email');
  }
}

export async function deactivateVipPerkApi(perkId: string): Promise<void> {
  const res = await fetch(`/api/admin/vip-perks/${perkId}/deactivate`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to deactivate perk');
  }
}

export const vipPerkQueryKeys = {
  all: ['vip-perks'] as const,
  list: () => [...vipPerkQueryKeys.all, 'list'] as const,
  config: () => [...vipPerkQueryKeys.all, 'config'] as const,
  products: () => [...vipPerkQueryKeys.all, 'products'] as const,
};
