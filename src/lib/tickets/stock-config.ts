/**
 * Ticket Stock Config Store (server-only)
 *
 * Resolves the ticket stock limits from the admin-editable
 * `ticket_stock_config` singleton table, with a short in-memory cache and a
 * fallback to the `GLOBAL_STOCK_LIMITS` constants so ticket pages keep working
 * if the DB is unreachable.
 *
 * Do NOT export this module from the tickets barrel (index.ts) — it pulls in
 * the service-role Supabase client and must never reach a client bundle.
 * Import it directly in API routes: `@/lib/tickets/stock-config`.
 */

import { createServiceRoleClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { GLOBAL_STOCK_LIMITS, type GlobalStockLimits } from '@/config/pricing-stages';
import type { Database } from '@/lib/types/database';

const log = logger.scope('TicketStockConfig');

export type TicketStockConfigRow = Database['public']['Tables']['ticket_stock_config']['Row'];

export type TicketStockConfigUpdate = Partial<
  Omit<TicketStockConfigRow, 'id' | 'singleton' | 'updated_at'>
>;

/** Serverless instances are short-lived; 60s keeps admin edits near-instant. */
const CACHE_TTL_MS = 60 * 1000;

let cache: { value: GlobalStockLimits; expiresAt: number } | null = null;

function fromRow(row: TicketStockConfigRow): GlobalStockLimits {
  return {
    vip: row.vip_limit,
    student_unemployed: row.student_unemployed_limit,
    standard_total: row.standard_limit,
  };
}

/**
 * Resolves the current stock limits: DB row → cached; on any failure the
 * hardcoded fallback is returned (and cached briefly so a DB outage doesn't
 * add a query per pricing request).
 */
export async function getTicketStockLimits(): Promise<GlobalStockLimits> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  let value: GlobalStockLimits;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('ticket_stock_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      throw error ?? new Error('ticket_stock_config row missing');
    }
    value = fromRow(data);
  } catch (err) {
    log.error('Failed to load ticket_stock_config, using constant fallback', err as Error);
    value = GLOBAL_STOCK_LIMITS;
  }

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/** Drops the in-memory cache (call after admin updates). */
export function invalidateTicketStockLimitsCache(): void {
  cache = null;
}

/** Reads the raw singleton row (admin API). Throws when unavailable. */
export async function getTicketStockConfigRow(): Promise<TicketStockConfigRow> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('ticket_stock_config')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    log.error('Failed to fetch ticket_stock_config row', error);
    throw new Error('Ticket stock config not found');
  }
  return data;
}

/** Updates the singleton row (admin API) and busts the cache. */
export async function updateTicketStockConfigRow(
  updates: TicketStockConfigUpdate
): Promise<TicketStockConfigRow> {
  const supabase = createServiceRoleClient();
  const current = await getTicketStockConfigRow();

  const { data, error } = await supabase
    .from('ticket_stock_config')
    .update(updates)
    .eq('id', current.id)
    .select()
    .single();

  if (error || !data) {
    log.error('Failed to update ticket_stock_config', error);
    throw new Error(`Failed to update ticket stock config: ${error?.message}`);
  }

  invalidateTicketStockLimitsCache();
  log.info('Ticket stock config updated', { updates });
  return data;
}
