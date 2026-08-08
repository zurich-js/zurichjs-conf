import { getAcceptedSpeakersWithTravel } from '@/lib/cfp/admin-travel';
import { getAdminScheduleRows } from '@/lib/program/schedule';
import { listProgramSessions } from '@/lib/program/sessions';
import { getSpeakerGuideAccess } from '@/lib/speaker-guide/access';
import {
  buildPersonalizedSpeakerGuide,
  type PersonalizedGuideProfile,
  type PersonalizedSpeakerGuide,
} from '@/lib/speaker-guide/personalized';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};
}

function addName(names: string[], value: unknown): void {
  if (typeof value !== 'string') return;
  const name = value.trim();
  if (name) names.push(name);
}

function extractPlusOneNames(
  metadata: Record<string, unknown>,
  bookingNames: string[],
  speakerName: string
): string[] {
  const names: string[] = [];
  const plusOne = record(metadata.plus_one ?? metadata.plusOne);

  [
    metadata.plus_one_name,
    metadata.plus_one_full_name,
    metadata.plus_one_registered_name,
    metadata.plusOneName,
    metadata.plus_one,
    metadata.guest_name,
    plusOne.name,
  ].forEach((value) => addName(names, value));

  const plusOnes = metadata.plus_ones ?? metadata.plusOnes;
  if (Array.isArray(plusOnes)) {
    plusOnes.forEach((value) => {
      if (typeof value === 'string') addName(names, value);
      else addName(names, record(value).name);
    });
  }

  bookingNames.forEach((name) => addName(names, name));
  const normalizedSpeakerName = speakerName.trim().toLowerCase();

  return Array.from(new Set(names)).filter(
    (name) => name.toLowerCase() !== normalizedSpeakerName
  );
}

export async function loadPersonalizedSpeakerGuide(
  code: string
): Promise<PersonalizedSpeakerGuide | null> {
  const [speakers, sessionsResult, scheduleRows] = await Promise.all([
    getAcceptedSpeakersWithTravel(),
    listProgramSessions(),
    getAdminScheduleRows(),
  ]);
  const speaker = speakers.find(
    (candidate) => getSpeakerGuideAccess(candidate).code === code
  );

  if (!speaker) return null;

  const speakerName = `${speaker.first_name} ${speaker.last_name}`.trim();
  const travelMetadata = record(speaker.travel?.metadata);
  const assignedSessions = sessionsResult.sessions
    .filter((session) =>
      (session.speakers ?? []).some((assignment) => assignment.speaker_id === speaker.id)
    )
    .map((session) => {
      const assignment = (session.speakers ?? []).find(
        (candidate) => candidate.speaker_id === speaker.id
      );
      const schedule = scheduleRows.find((row) => row.session_id === session.id);

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
  const inboundFlight = speaker.flights.find((flight) => flight.direction === 'inbound');
  const inboundAirport = inboundFlight?.arrival_airport?.toLowerCase() ?? null;
  const arrivesViaZurichAirport = inboundAirport
    ? inboundAirport.includes('zrh') || inboundAirport.includes('zurich') || inboundAirport.includes('zürich')
    : null;
  const bookingNames = speaker.accommodation_bookings.map((booking) => booking.guest_name);

  const profile: PersonalizedGuideProfile = {
    firstName: speaker.first_name,
    lastName: speaker.last_name,
    arrivalDate: speaker.travel?.arrival_date ?? null,
    departureDate: speaker.travel?.departure_date ?? null,
    attendingDinner: speaker.travel?.attending_speakers_dinner ?? null,
    attendingActivities: speaker.travel?.attending_speakers_activities ?? null,
    travelMetadata,
    plusOneNames: extractPlusOneNames(travelMetadata, bookingNames, speakerName),
    arrivesViaZurichAirport,
    sessions: assignedSessions,
  };

  return buildPersonalizedSpeakerGuide(profile);
}
