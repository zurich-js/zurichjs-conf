/**
 * Admin Speaker Logistics Overview API
 * GET /api/admin/speaker-logistics - Program speakers joined with their event
 * RSVPs / logistics answers, each speaker's unique form link, and aggregate
 * headcount stats for the event planning (catering, capacity, VIP tickets).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { generateSpeakerLogisticsUrl } from '@/lib/auth/speakerLogisticsToken';
import { getSpeakerGuideAccess, type SpeakerGuideAccess } from '@/lib/speaker-guide/access';
import { logger } from '@/lib/logger';
import type { SpeakerLogisticsRow } from '@/lib/types/speaker-logistics';

const log = logger.scope('Admin Speaker Logistics API');

export type SpeakerLogisticsStatus = 'pending' | 'submitted';

export interface SpeakerLogisticsAdminRow {
  speaker_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string | null;
  tshirt_size: string | null;
  /** Whether the speaker has an accepted workshop (accommodations context) */
  has_workshop: boolean;
  /** Unique form link (shared with the speaker manually) — omitted for read-only bot clients */
  logistics_url: string | null;
  /** Personalized guide link built from this authoritative logistics record */
  speaker_guide: SpeakerGuideAccess;
  status: SpeakerLogisticsStatus;
  submitted_at: string | null;
  /** Last time the speaker changed their answers */
  updated_at: string | null;
  answers: {
    attending_warmup: boolean | null;
    attending_speakers_dinner: boolean | null;
    attending_after_party: boolean | null;
    attending_speaker_hangout: boolean | null;
    speaker_hangout_plus_one: boolean | null;
    dietary_restrictions: string | null;
    dinner_plus_one: boolean | null;
    dinner_plus_one_dietary_restrictions: string | null;
    after_party_plus_one: boolean | null;
    after_party_plus_one_first_name: string | null;
    after_party_plus_one_last_name: string | null;
    after_party_plus_one_email: string | null;
    talk_special_accommodations: string | null;
  } | null;
}

export interface SpeakerLogisticsEventStats {
  attending: number;
  notAttending: number;
  unanswered: number;
  plusOnes: number;
  /** attending + plus ones */
  headcount: number;
}

export interface SpeakerLogisticsStats {
  totalSpeakers: number;
  submitted: number;
  pending: number;
  warmup: SpeakerLogisticsEventStats;
  speakersDinner: SpeakerLogisticsEventStats;
  afterParty: SpeakerLogisticsEventStats;
  speakerHangout: SpeakerLogisticsEventStats;
  withDietaryRestrictions: number;
  missingTshirtSize: number;
  withTalkAccommodations: number;
}

export interface SpeakerLogisticsOverviewResponse {
  speakers: SpeakerLogisticsAdminRow[];
  stats: SpeakerLogisticsStats;
}

function emptyEventStats(): SpeakerLogisticsEventStats {
  return { attending: 0, notAttending: 0, unanswered: 0, plusOnes: 0, headcount: 0 };
}

function tallyEvent(
  stats: SpeakerLogisticsEventStats,
  attending: boolean | null | undefined,
  plusOne?: boolean | null
): void {
  if (attending === true) {
    stats.attending += 1;
    if (plusOne === true) stats.plusOnes += 1;
  } else if (attending === false) {
    stats.notAttending += 1;
  } else {
    stats.unanswered += 1;
  }
  stats.headcount = stats.attending + stats.plusOnes;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized, isBot } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();

    const [speakers, logisticsResult] = await Promise.all([
      getAdminSpeakersWithSubmissions('program'),
      supabase.from('cfp_speaker_logistics').select('*'),
    ]);

    if (logisticsResult.error) {
      log.error('Error fetching speaker logistics rows', logisticsResult.error);
      return res.status(500).json({ error: 'Failed to fetch speaker logistics' });
    }

    const logisticsBySpeaker = new Map<string, SpeakerLogisticsRow>(
      (logisticsResult.data ?? []).map((row) => [row.speaker_id, row])
    );
    const canGenerateLogisticsUrls = Boolean(
      process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET
    );

    const stats: SpeakerLogisticsStats = {
      totalSpeakers: speakers.length,
      submitted: 0,
      pending: 0,
      warmup: emptyEventStats(),
      speakersDinner: emptyEventStats(),
      afterParty: emptyEventStats(),
      speakerHangout: emptyEventStats(),
      withDietaryRestrictions: 0,
      missingTshirtSize: 0,
      withTalkAccommodations: 0,
    };

    const rows: SpeakerLogisticsAdminRow[] = speakers.map((speaker) => {
      const logistics = logisticsBySpeaker.get(speaker.id) ?? null;
      const submitted = !!logistics?.submitted_at;
      const status: SpeakerLogisticsStatus = submitted ? 'submitted' : 'pending';

      if (submitted) stats.submitted += 1;
      else stats.pending += 1;

      const answers = submitted && logistics
        ? {
            attending_warmup: logistics.attending_warmup,
            attending_speakers_dinner: logistics.attending_speakers_dinner,
            attending_after_party: logistics.attending_after_party,
            attending_speaker_hangout: logistics.attending_speaker_hangout,
            speaker_hangout_plus_one: logistics.speaker_hangout_plus_one,
            dietary_restrictions: logistics.dietary_restrictions,
            dinner_plus_one: logistics.dinner_plus_one,
            dinner_plus_one_dietary_restrictions: logistics.dinner_plus_one_dietary_restrictions,
            after_party_plus_one: logistics.after_party_plus_one,
            after_party_plus_one_first_name: logistics.after_party_plus_one_first_name,
            after_party_plus_one_last_name: logistics.after_party_plus_one_last_name,
            after_party_plus_one_email: logistics.after_party_plus_one_email,
            talk_special_accommodations: logistics.talk_special_accommodations,
          }
        : null;

      tallyEvent(stats.warmup, answers?.attending_warmup ?? null);
      tallyEvent(stats.speakersDinner, answers?.attending_speakers_dinner ?? null, answers?.dinner_plus_one);
      tallyEvent(stats.afterParty, answers?.attending_after_party ?? null, answers?.after_party_plus_one);
      tallyEvent(stats.speakerHangout, answers?.attending_speaker_hangout ?? null, answers?.speaker_hangout_plus_one);

      if (answers?.dietary_restrictions || answers?.dinner_plus_one_dietary_restrictions) {
        stats.withDietaryRestrictions += 1;
      }
      if (answers?.talk_special_accommodations) {
        stats.withTalkAccommodations += 1;
      }
      if (!speaker.tshirt_size) {
        stats.missingTshirtSize += 1;
      }

      return {
        speaker_id: speaker.id,
        first_name: speaker.first_name,
        last_name: speaker.last_name,
        email: speaker.email,
        profile_image_url: speaker.profile_image_url ?? null,
        tshirt_size: speaker.tshirt_size,
        has_workshop: speaker.submissions.some(
          (submission) => submission.submission_type === 'workshop' && submission.status === 'accepted'
        ),
        // Unique speaker-level write access — never hand it to the read-only bot
        logistics_url: isBot || !canGenerateLogisticsUrls
          ? null
          : generateSpeakerLogisticsUrl(speaker.id),
        speaker_guide: getSpeakerGuideAccess(speaker),
        status,
        submitted_at: logistics?.submitted_at ?? null,
        updated_at: logistics?.updated_at ?? null,
        answers,
      };
    });

    rows.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));

    const response: SpeakerLogisticsOverviewResponse = { speakers: rows, stats };
    return res.status(200).json(response);
  } catch (error) {
    log.error('Error building speaker logistics overview', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
