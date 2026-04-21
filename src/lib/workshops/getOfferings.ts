/**
 * Workshop Offerings
 * Commerce overlay for CFP workshop submissions — assigns room, duration,
 * capacity, and Stripe price lookup keys.
 */

import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';

const log = logger.scope('Workshop Offerings');

export type WorkshopOffering = Workshop;

export type WorkshopOfferingByCfpSubmissionId = Map<string, WorkshopOffering>;

export interface GetOfferingsOptions {
  status?: WorkshopStatus | WorkshopStatus[];
}

/**
 * Fetch workshop offerings (commerce rows in `workshops`) and return them keyed
 * by their linked CFP submission id so callers can merge them onto session data.
 */
export async function getOfferingsByCfpSubmissionId(
  options: GetOfferingsOptions = {}
): Promise<WorkshopOfferingByCfpSubmissionId> {
  const supabase = createServiceRoleClient();
  const statuses = options.status
    ? Array.isArray(options.status)
      ? options.status
      : [options.status]
    : null;

  let query = supabase
    .from('workshops')
    .select('*')
    .not('cfp_submission_id', 'is', null);

  if (statuses) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query;

  if (error) {
    log.error('Error fetching offerings', error);
    return new Map();
  }

  const map: WorkshopOfferingByCfpSubmissionId = new Map();
  for (const row of (data ?? []) as Workshop[]) {
    if (row.cfp_submission_id) {
      map.set(row.cfp_submission_id, row);
    }
  }
  return map;
}

/**
 * Fetch a single published offering by CFP submission id.
 */
export async function getPublishedOfferingByCfpSubmissionId(
  cfpSubmissionId: string
): Promise<WorkshopOffering | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('cfp_submission_id', cfpSubmissionId)
    .eq('status', 'published' satisfies WorkshopStatus)
    .maybeSingle();

  if (error) {
    log.error('Error fetching offering by submission id', error, { cfpSubmissionId });
    return null;
  }

  return (data as Workshop | null) ?? null;
}

/**
 * Fetch an offering by its Stripe price lookup key base.
 */
export async function getOfferingByLookupKey(
  lookupKey: string
): Promise<WorkshopOffering | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .eq('stripe_price_lookup_key', lookupKey)
    .maybeSingle();

  if (error) {
    log.error('Error fetching offering by lookup key', error, { lookupKey });
    return null;
  }

  return (data as Workshop | null) ?? null;
}
