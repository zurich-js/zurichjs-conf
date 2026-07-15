/**
 * Discount Config Store (server-only)
 *
 * Resolves the discount popup configuration from the admin-editable
 * `discount_config` singleton table, with a short in-memory cache and an
 * env-var fallback so the popup keeps working if the DB is unreachable.
 *
 * Do NOT export this module from the discount barrel (index.ts) — it pulls in
 * the service-role Supabase client and must never reach a client bundle.
 * Import it directly in API routes: `@/lib/discount/config-server`.
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { getServerConfig } from './config';
import type { ResolvedDiscountConfig } from './types';
import type { Database } from '@/lib/types/database';

const log = logger.scope('DiscountConfig');

export type DiscountConfigRow = Database['public']['Tables']['discount_config']['Row'];
export type DiscountConfigUpdate = Partial<
  Omit<DiscountConfigRow, 'id' | 'singleton' | 'updated_at'>
>;

/** Serverless instances are short-lived; 60s keeps admin edits near-instant. */
const CACHE_TTL_MS = 60 * 1000;

let cache: { value: ResolvedDiscountConfig; expiresAt: number } | null = null;

function fromRow(row: DiscountConfigRow): ResolvedDiscountConfig {
  return {
    showProbability: row.show_probability,
    percentOff: row.percent_off,
    durationMinutes: row.duration_minutes,
    cooldownHours: row.cooldown_hours,
    forceShow: row.force_show,
    abPercentOff: row.ab_percent_off,
    abDurationMinutes: row.ab_duration_minutes,
    abcPercentOff: row.abc_percent_off,
    abcDurationMinutes: row.abc_duration_minutes,
    source: 'database',
  };
}

/**
 * Resolves the current discount config: DB row → cached; on any failure the
 * env fallback is returned (and cached briefly so a DB outage doesn't add a
 * query per popup request).
 */
export async function getDiscountConfig(): Promise<ResolvedDiscountConfig> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  let value: ResolvedDiscountConfig;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('discount_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      throw error ?? new Error('discount_config row missing');
    }
    value = fromRow(data);
  } catch (err) {
    log.error('Failed to load discount_config, using env fallback', err as Error);
    value = getServerConfig();
  }

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/** Drops the in-memory cache (call after admin updates). */
export function invalidateDiscountConfigCache(): void {
  cache = null;
}

/** Reads the raw singleton row (admin API). Throws when unavailable. */
export async function getDiscountConfigRow(): Promise<DiscountConfigRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('discount_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    log.error('Failed to fetch discount_config row', error);
    throw new Error('Discount config not found');
  }
  return data;
}

/** Updates the singleton row (admin API) and busts the cache. */
export async function updateDiscountConfigRow(
  updates: DiscountConfigUpdate
): Promise<DiscountConfigRow> {
  const supabase = createServiceRoleClient();
  const current = await getDiscountConfigRow();

  const { data, error } = await supabase
    .from('discount_config')
    .update(updates)
    .eq('id', current.id)
    .select()
    .single();

  if (error || !data) {
    log.error('Failed to update discount_config', error);
    throw new Error(`Failed to update discount config: ${error?.message}`);
  }

  invalidateDiscountConfigCache();
  log.info('Discount config updated', { updates });
  return data;
}
