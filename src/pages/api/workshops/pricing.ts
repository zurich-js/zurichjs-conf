/**
 * Workshops Pricing API
 * Returns per-workshop Stripe pricing for the currently requested currency.
 * Mirrors the ticket pricing pattern: one Stripe product per workshop with
 * three active prices keyed by `workshop_{slug}` / `_eur` / `_gbp`.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { createServiceRoleClient } from '@/lib/supabase';
import type { Workshop, WorkshopStatus } from '@/lib/types/database';
import {
  buildOfferingSummaries,
  getStripeClient,
  slugForWorkshop,
  type WorkshopOfferingSummary,
} from '@/lib/workshops/stripePriceLookup';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';

const log = logger.scope('Workshop Pricing API');

export type WorkshopPricingItem = WorkshopOfferingSummary;

export interface WorkshopPricingResponse {
  items: WorkshopPricingItem[];
  currency: SupportedCurrency;
  error?: string;
}

const filterBySlug = (workshops: Workshop[], targetSlug: string | null): Workshop[] => {
  if (!targetSlug) return workshops;
  return workshops.filter((w) => slugForWorkshop(w) === targetSlug);
};

/**
 * Resolve a title-derived session slug (what /workshops/[slug] uses in its URL)
 * back to the CFP submission id. Returns null if no published workshop session
 * matches.
 */
async function resolveSubmissionIdForSessionSlug(slug: string): Promise<string | null> {
  const { speakers } = await fetchPublicSpeakers();
  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      if (session.type === 'workshop' && session.slug === slug) {
        return session.id;
      }
    }
  }
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkshopPricingResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ items: [], currency: 'CHF', error: 'Method not allowed' });
    return;
  }

  try {
    const currency = parseCurrencyParam(req.query.currency);
    const slugParam = typeof req.query.slug === 'string' ? req.query.slug : null;
    const submissionIdParam =
      typeof req.query.cfpSubmissionId === 'string' ? req.query.cfpSubmissionId : null;
    const sessionSlugParam =
      typeof req.query.sessionSlug === 'string' ? req.query.sessionSlug : null;

    // sessionSlug is the title-derived slug used by /workshops/[slug] URLs.
    // Resolve it to a submission id so we can match the right workshop row,
    // regardless of what the admin set as the Stripe lookup-key slug.
    const resolvedSubmissionId =
      submissionIdParam ??
      (sessionSlugParam ? await resolveSubmissionIdForSessionSlug(sessionSlugParam) : null);

    const supabase = createServiceRoleClient();
    let query = supabase
      .from('workshops')
      .select('*')
      .eq('status', 'published' satisfies WorkshopStatus)
      .not('stripe_price_lookup_key', 'is', null);

    if (resolvedSubmissionId) {
      query = query.eq('cfp_submission_id', resolvedSubmissionId);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error loading workshop offerings', error);
      res.status(500).json({ items: [], currency, error: error.message });
      return;
    }

    // Legacy `?slug=` path still filters on Stripe lookup-key slug for callers
    // that know the lookup-key directly. New code should pass cfpSubmissionId
    // or sessionSlug.
    const workshops = resolvedSubmissionId
      ? ((data ?? []) as Workshop[])
      : filterBySlug((data ?? []) as Workshop[], slugParam);

    if (workshops.length === 0) {
      res.status(200).json({ items: [], currency });
      return;
    }

    const stripe = getStripeClient();

    let items = await buildOfferingSummaries(stripe, workshops, currency);
    if (items.length === 0 && currency !== 'CHF') {
      log.warn('No workshop prices found for currency, falling back to CHF', { currency });
      items = await buildOfferingSummaries(stripe, workshops, 'CHF');
    }

    res.status(200).json({ items, currency });
  } catch (error) {
    log.error('Error handling workshops pricing request', error);
    res.status(500).json({
      items: [],
      currency: 'CHF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
