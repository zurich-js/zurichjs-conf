/**
 * Workshop Revenue Aggregation
 * Aggregates confirmed registration revenue grouped by currency — used for
 * instructor payouts and admin dashboards.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { PaymentStatus } from '@/lib/types/database';

const log = logger.scope('Workshop Revenue');

export interface WorkshopRevenueByCurrency {
  currency: string;
  grossCents: number;
  discountCents: number;
  netCents: number;
  registrations: number;
}

export interface WorkshopRevenueSummary {
  workshopId: string;
  totalRegistrations: number;
  byCurrency: WorkshopRevenueByCurrency[];
}

/**
 * Aggregate confirmed registration revenue for a workshop.
 */
export async function getWorkshopRevenue(workshopId: string): Promise<WorkshopRevenueSummary> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshop_registrations')
    .select('amount_paid, currency, discount_amount')
    .eq('workshop_id', workshopId)
    .eq('status', 'confirmed' satisfies PaymentStatus);

  if (error) {
    log.error('Error aggregating revenue', error, { workshopId });
    return { workshopId, totalRegistrations: 0, byCurrency: [] };
  }

  const buckets = new Map<string, WorkshopRevenueByCurrency>();
  for (const row of data ?? []) {
    const currency = (row.currency ?? 'CHF').toUpperCase();
    const bucket = buckets.get(currency) ?? {
      currency,
      grossCents: 0,
      discountCents: 0,
      netCents: 0,
      registrations: 0,
    };
    bucket.grossCents += row.amount_paid ?? 0;
    bucket.discountCents += row.discount_amount ?? 0;
    bucket.registrations += 1;
    bucket.netCents = bucket.grossCents; // amount_paid already reflects post-discount total
    buckets.set(currency, bucket);
  }

  return {
    workshopId,
    totalRegistrations: data?.length ?? 0,
    byCurrency: Array.from(buckets.values()).sort((a, b) => a.currency.localeCompare(b.currency)),
  };
}

/**
 * Aggregate revenue for every workshop in one query.
 */
export async function getAllWorkshopRevenue(): Promise<Map<string, WorkshopRevenueSummary>> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshop_registrations')
    .select('workshop_id, amount_paid, currency, discount_amount')
    .eq('status', 'confirmed' satisfies PaymentStatus);

  if (error) {
    log.error('Error aggregating revenue (all)', error);
    return new Map();
  }

  const result = new Map<string, WorkshopRevenueSummary>();
  for (const row of data ?? []) {
    const summary = result.get(row.workshop_id) ?? {
      workshopId: row.workshop_id,
      totalRegistrations: 0,
      byCurrency: [],
    };
    const currency = (row.currency ?? 'CHF').toUpperCase();
    let bucket = summary.byCurrency.find((b) => b.currency === currency);
    if (!bucket) {
      bucket = {
        currency,
        grossCents: 0,
        discountCents: 0,
        netCents: 0,
        registrations: 0,
      };
      summary.byCurrency.push(bucket);
    }
    bucket.grossCents += row.amount_paid ?? 0;
    bucket.discountCents += row.discount_amount ?? 0;
    bucket.registrations += 1;
    bucket.netCents = bucket.grossCents;
    summary.totalRegistrations += 1;
    result.set(row.workshop_id, summary);
  }

  for (const summary of result.values()) {
    summary.byCurrency.sort((a, b) => a.currency.localeCompare(b.currency));
  }

  return result;
}
