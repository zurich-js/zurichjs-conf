/**
 * Workshops Schedule API
 * Returns the "Zurich Engineering Day" timeline plus the published offerings
 * (with Stripe prices resolved for the requested currency) in one call.
 *
 * Workshop schedule items are synthesized from the `workshops` table (admin
 * sets date/start_time/end_time there). Non-workshop items (breaks, events,
 * talks, placeholders) continue to come from `program_schedule_items`.
 * Workshop sessions without a published offering or without a scheduled slot
 * are filtered out server-side so drafts don't leak into the public schedule.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { parseCurrencyParam, type SupportedCurrency } from '@/config/currency';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
import { getOfferingsByCfpSubmissionId } from '@/lib/workshops/getOfferings';
import { hasScheduleSlot } from '@/lib/workshops/scheduleHelpers';
import {
  buildOfferingSummaries,
  getStripeClient,
  type WorkshopOfferingSummary,
} from '@/lib/workshops/stripePriceLookup';
import type {
  ProgramScheduleSpeakerPreview,
  PublicProgramScheduleItem,
} from '@/lib/types/program-schedule';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import type { Workshop } from '@/lib/types/database';

const log = logger.scope('Workshop Schedule API');

export interface WorkshopsScheduleResponse {
  items: PublicProgramScheduleItem[];
  offeringsBySubmissionId: Record<string, WorkshopOfferingSummary>;
  currency: SupportedCurrency;
  error?: string;
}

interface SpeakerAndSession {
  session: PublicSession;
  speaker: PublicSpeaker;
}

const indexSpeakerSessions = (speakers: PublicSpeaker[]): Map<string, SpeakerAndSession> => {
  const map = new Map<string, SpeakerAndSession>();
  for (const speaker of speakers) {
    for (const session of speaker.sessions) {
      map.set(session.id, { session, speaker });
    }
  }
  return map;
};

const toSpeakerPreview = (speaker: PublicSpeaker): ProgramScheduleSpeakerPreview => ({
  name: [speaker.first_name, speaker.last_name].filter(Boolean).join(' '),
  role: [speaker.job_title, speaker.company].filter(Boolean).join(' @ '),
  imageUrl: speaker.profile_image_url,
  slug: speaker.slug,
});

/**
 * Build a schedule-like item from a workshop row. Returns null when the
 * workshop is missing a date/start/end slot or when the linked CFP submission
 * can't be matched to a speaker.
 */
const synthesizeWorkshopItem = (
  workshop: Workshop,
  speakerIndex: Map<string, SpeakerAndSession>
): PublicProgramScheduleItem | null => {
  if (!hasScheduleSlot(workshop) || !workshop.cfp_submission_id) return null;

  const match = speakerIndex.get(workshop.cfp_submission_id);
  if (!match) return null;

  const durationMinutes = workshop.duration_minutes ?? 0;
  const speakerPreview = toSpeakerPreview(match.speaker);

  return {
    id: `workshop-${workshop.id}`,
    date: workshop.date,
    start_time: workshop.start_time,
    duration_minutes: durationMinutes,
    room: workshop.room,
    type: 'session',
    title: workshop.title,
    description: workshop.description,
    submission_id: workshop.cfp_submission_id,
    is_visible: true,
    session: match.session,
    speaker: speakerPreview,
    speakers: [speakerPreview],
    session_kind: 'workshop',
  };
};

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
    if (workshop?.cfp_submission_id) {
      out[workshop.cfp_submission_id] = summary;
    }
  }
  return out;
};

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

    const [{ speakers }, scheduleRows, offeringsMap] = await Promise.all([
      fetchPublicSpeakers(),
      getPublicScheduleRows(),
      getOfferingsByCfpSubmissionId({ status: 'published' }),
    ]);

    // Non-workshop schedule items continue to come from program_schedule_items.
    const builtItems = buildPublicProgramScheduleItems(scheduleRows, speakers);
    const nonWorkshopItems = builtItems.filter(
      (item) => item.session_kind !== 'workshop'
    );

    // Workshops with a published offering. Filtering by lookup_key also
    // guarantees we have something priceable in Stripe.
    const workshops = Array.from(offeringsMap.values()).filter(
      (w) => Boolean(w.stripe_price_lookup_key)
    );

    // Synthesize workshop schedule items from the workshops table.
    const speakerIndex = indexSpeakerSessions(speakers);
    const synthesizedWorkshopItems = workshops
      .map((w) => synthesizeWorkshopItem(w, speakerIndex))
      .filter((item): item is PublicProgramScheduleItem => item !== null);

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

    // Only keep synthesized workshop items that (a) have a published offering
    // AND (b) have a resolvable Stripe price — otherwise the card on /workshops
    // can't show a Buy button anyway.
    const visibleWorkshopItems = synthesizedWorkshopItems.filter((item) =>
      item.submission_id ? Boolean(offeringsBySubmissionId[item.submission_id]) : false
    );

    const merged = [...nonWorkshopItems, ...visibleWorkshopItems].sort(compareByDateAndStart);

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
