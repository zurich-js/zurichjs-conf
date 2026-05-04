/**
 * Workshops Schedule API
 * Returns the "Zurich Engineering Day" timeline plus the published offerings
 * (with Stripe prices resolved for the requested currency) in one call.
 *
 * Public visibility is driven only by visible rows in `program_schedule_items`.
 * Workshop offerings from the `workshops` table enrich visible workshop cards
 * with price and booking state, but they do not create or remove public cards.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { createServiceRoleClient } from '@/lib/supabase';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import {
  buildOfferingSummaries,
  getStripeClient,
  type WorkshopOfferingSummary,
} from '@/lib/workshops/stripePriceLookup';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
import type { Workshop } from '@/lib/types/database';

const log = logger.scope('Workshop Schedule API');

export interface WorkshopsScheduleResponse {
  items: PublicProgramScheduleItem[];
  offeringsBySubmissionId: Record<string, WorkshopOfferingSummary>;
  currency: SupportedCurrency;
  error?: string;
}

const compareByDateAndStart = (a: PublicProgramScheduleItem, b: PublicProgramScheduleItem) => {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.start_time !== b.start_time) return a.start_time < b.start_time ? -1 : 1;
  return 0;
};

const buildSummaryMap = (
  workshops: Workshop[],
  summaries: WorkshopOfferingSummary[]
): Record<string, WorkshopOfferingSummary> => {
  const workshopById = new Map(workshops.map((w) => [w.id, w]));
  const out: Record<string, WorkshopOfferingSummary> = {};
  for (const summary of summaries) {
    const workshop = workshopById.get(summary.workshopId);
    if (workshop?.session_id) {
      out[workshop.session_id] = summary;
    }
    if (workshop?.cfp_submission_id) {
      out[workshop.cfp_submission_id] = summary;
    }
  }
  return out;
};

export function mergeWorkshopScheduleItems(
  items: PublicProgramScheduleItem[]
): PublicProgramScheduleItem[] {
  return items
    .filter((item) => {
      if (item.session_kind !== 'workshop') {
        return true;
      }

      // Public program visibility comes only from scheduled, visible program
      // rows. Offerings control bookability, not whether a workshop appears.
      return Boolean(item.session_id || item.submission_id || item.session);
    })
    .sort(compareByDateAndStart);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkshopsScheduleResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({
      items: [],
      offeringsBySubmissionId: {},
      currency: 'CHF',
      error: 'Method not allowed',
    });
    return;
  }

  try {
    const currency = parseCurrencyParam(req.query.currency);

    const supabase = createServiceRoleClient();
    const [{ speakers }, scheduleRows, offeringsResult] = await Promise.all([
      fetchPublicSpeakers(),
      getPublicScheduleRows(),
      supabase
        .from('workshops')
        .select('*')
        .eq('status', 'published')
        .not('stripe_price_lookup_key', 'is', null),
    ]);

    if (offeringsResult.error) {
      throw new Error(offeringsResult.error.message);
    }

    // Visible schedule rows are the source of truth for the public program.
    const builtItems = buildPublicProgramScheduleItems(scheduleRows, speakers);

    // Published workshop offerings enrich workshop cards with price + booking,
    // but they do not decide which public program cards are visible.
    const workshops = (offeringsResult.data ?? []) as Workshop[];

    // Resolve Stripe prices per currency (with CHF fallback).
    let offeringsBySubmissionId: Record<string, WorkshopOfferingSummary> = {};
    if (workshops.length > 0) {
      const stripe = getStripeClient();
      let summaries = await buildOfferingSummaries(stripe, workshops, currency);
      if (summaries.length === 0 && currency !== 'CHF') {
        log.warn('No workshop prices found for currency, falling back to CHF', { currency });
        summaries = await buildOfferingSummaries(stripe, workshops, 'CHF');
      }
      offeringsBySubmissionId = buildSummaryMap(workshops, summaries);
    }

    const merged = mergeWorkshopScheduleItems(builtItems);

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    res.status(200).json({
      items: merged,
      offeringsBySubmissionId,
      currency,
    });
  } catch (error) {
    log.error('Error handling workshops schedule request', error);
    res.status(500).json({
      items: [],
      offeringsBySubmissionId: {},
      currency: 'CHF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
