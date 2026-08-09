import { getAdminSpeakersWithSubmissions } from '@/lib/cfp/admin';
import { getAdminScheduleRows } from '@/lib/program/schedule';
import { listProgramSessions } from '@/lib/program/sessions';
import { getSpeakerGuideAccess } from '@/lib/speaker-guide/access';
import { createServiceRoleClient } from '@/lib/supabase';
import type { ActivityGuestRow, SpeakerLogisticsRow } from '@/lib/types/speaker-logistics';
import {
  buildPersonalizedSpeakerGuide,
  type PersonalizedGuideProfile,
  type PersonalizedSpeakerGuide,
} from '@/lib/speaker-guide/personalized';

export class PersonalizedGuideDataLoadError extends Error {
  constructor(
    public readonly dataset: 'sessions' | 'schedule',
    cause: string
  ) {
    super(`Failed to load personalized guide ${dataset}: ${cause}`);
    this.name = 'PersonalizedGuideDataLoadError';
  }
}

function addName(names: string[], value: unknown): void {
  if (typeof value !== 'string') return;
  const name = value.trim();
  if (name) names.push(name);
}

function extractPlusOneNames(
  logistics: SpeakerLogisticsRow | null,
  guests: ActivityGuestRow[]
): string[] {
  const names: string[] = [];
  if (logistics?.after_party_plus_one === true) {
    addName(
      names,
      [logistics.after_party_plus_one_first_name, logistics.after_party_plus_one_last_name]
        .filter(Boolean)
        .join(' ')
    );
  }
  guests
    .filter((guest) => guest.guest_type === 'speaker_plus_one')
    .forEach((guest) => addName(names, `${guest.first_name} ${guest.last_name}`));
  return Array.from(new Set(names));
}

export async function loadPersonalizedSpeakerGuide(
  code: string
): Promise<PersonalizedSpeakerGuide | null> {
  const supabase = createServiceRoleClient();
  const [speakers, logisticsResult, guestsResult, sessionsResult, scheduleResult] = await Promise.all([
    getAdminSpeakersWithSubmissions('program'),
    supabase.from('cfp_speaker_logistics').select('*'),
    supabase.from('speaker_activity_guests').select('*'),
    listProgramSessions(),
    getAdminScheduleRows(),
  ]);

  if (sessionsResult.error) {
    throw new PersonalizedGuideDataLoadError('sessions', sessionsResult.error);
  }
  if (scheduleResult.error) {
    throw new PersonalizedGuideDataLoadError('schedule', scheduleResult.error);
  }

  const speaker = speakers.find(
    (candidate) => getSpeakerGuideAccess(candidate).code === code
  );

  if (!speaker) return null;

  if (logisticsResult.error) throw logisticsResult.error;
  if (guestsResult.error) throw guestsResult.error;

  const logistics = (logisticsResult.data as SpeakerLogisticsRow[] | null)?.find(
    (row) => row.speaker_id === speaker.id
  ) ?? null;
  const guests = (guestsResult.data as ActivityGuestRow[] | null)?.filter(
    (guest) => guest.related_speaker_id === speaker.id
  ) ?? [];
  const assignedSessions = sessionsResult.sessions
    .filter((session) =>
      (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id)
    )
    .map((session) => {
      const assignment = (session.speakers ?? []).find(
        (candidate) => candidate.speaker_id === speaker.id
      );
      const schedule = scheduleResult.rows.find((row) => row.session_id === session.id);

      return {
        title: session.title,
        kind: session.kind,
        role: assignment?.role ?? null,
        date: schedule?.date ?? null,
        startTime: schedule?.start_time ?? null,
        durationMinutes: schedule?.duration_minutes ?? null,
        room: schedule?.room ?? null,
      };
    });
  const profile: PersonalizedGuideProfile = {
    firstName: speaker.first_name,
    lastName: speaker.last_name,
    logisticsSubmitted: Boolean(logistics?.submitted_at),
    attendingWarmup: logistics?.attending_warmup ?? null,
    attendingDinner: logistics?.attending_speakers_dinner ?? null,
    attendingAfterParty: logistics?.attending_after_party ?? null,
    attendingSpeakerHangout: logistics?.attending_speaker_hangout ?? null,
    hasRegisteredPlusOne: Boolean(
      logistics?.dinner_plus_one ||
      logistics?.after_party_plus_one ||
      logistics?.speaker_hangout_plus_one ||
      guests.some((guest) => guest.guest_type === 'speaker_plus_one')
    ),
    plusOneNames: extractPlusOneNames(logistics, guests),
    sessions: assignedSessions,
  };

  return buildPersonalizedSpeakerGuide(profile);
}
