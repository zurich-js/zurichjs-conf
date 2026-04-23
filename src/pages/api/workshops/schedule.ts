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
import { createServiceRoleClient } from '@/lib/supabase';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { buildPublicProgramScheduleItems, getPublicScheduleRows } from '@/lib/program/schedule';
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
      if (session.cfp_submission_id) {
        map.set(session.cfp_submission_id, { session, speaker });
      }
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
 * workshop is missing a date/start/end slot or when the linked program session
 * can't be matched to a public speaker/session.
 */
const synthesizeWorkshopItem = (
  workshop: Workshop,
  speakerIndex: Map<string, SpeakerAndSession>
): PublicProgramScheduleItem | null => {
  if (!hasScheduleSlot(workshop) || (!workshop.session_id && !workshop.cfp_submission_id)) return null;

  const match = (workshop.session_id ? speakerIndex.get(workshop.session_id) : null)
    ?? (workshop.cfp_submission_id ? speakerIndex.get(workshop.cfp_submission_id) : null);
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
    session_id: workshop.session_id ?? null,
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
    if (workshop?.session_id) {
      out[workshop.session_id] = summary;
    }
    if (workshop?.cfp_submission_id) {
      out[workshop.cfp_submission_id] = summary;
    }
  }
  return out;
};

const asWorkshopPlaceholder = (item: PublicProgramScheduleItem): PublicProgramScheduleItem => ({
  ...item,
  type: 'placeholder',
  title: 'To be announced',
  description: null,
  submission_id: null,
  session: null,
  speaker: null,
  speakers: [],
  session_kind: null,
});

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
    const nonWorkshopItems = builtItems.filter(
      (item) => item.session_kind !== 'workshop'
    );
    const scheduledWorkshopItems = builtItems.filter(
      (item) => item.session_kind === 'workshop'
    );

    // Workshops with a published offering. Filtering by lookup_key also
    // guarantees we have something priceable in Stripe.
    const workshops = (offeringsResult.data ?? []) as Workshop[];

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

    const scheduledWorkshopKeys = new Set(
      scheduledWorkshopItems
        .flatMap((item) => [item.session_id, item.submission_id])
        .filter((key): key is string => Boolean(key))
    );
    const extraOfferingWorkshopItems = synthesizedWorkshopItems.filter((item) =>
      ![item.session_id, item.submission_id].some((key) => key && scheduledWorkshopKeys.has(key))
    );

    const publicWorkshopItems = scheduledWorkshopItems.map((item) =>
      (item.session_id && offeringsBySubmissionId[item.session_id]) ||
      (item.submission_id && offeringsBySubmissionId[item.submission_id])
        ? item
        : asWorkshopPlaceholder(item)
    );

    const merged = [
      ...nonWorkshopItems,
      ...publicWorkshopItems,
      ...extraOfferingWorkshopItems,
    ].sort(compareByDateAndStart);

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
