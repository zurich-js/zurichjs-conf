/**
 * Speaker Logistics Domain Logic
 * Normalization, change detection, and summaries for speaker event RSVPs.
 * Pure functions — used by the token-authenticated form API and tested in
 * isolation.
 */

import type { SpeakerLogisticsFormData } from '@/lib/validations/speaker-logistics';
import type { SpeakerLogisticsAnswers } from '@/lib/types/speaker-logistics';

/** Human-readable labels for the RSVP booleans (used in Slack alerts) */
const BOOLEAN_FIELD_LABELS: Record<string, string> = {
  attending_warmup: 'Warm-Up Meetup (Sep 9)',
  attending_speakers_dinner: 'Speakers Dinner (Sep 10)',
  attending_after_party: 'VIP After Party (Sep 11)',
  attending_speaker_hangout: 'Speaker Hangout (Sep 12)',
  dinner_plus_one: 'Dinner plus one (Sep 10)',
  after_party_plus_one: 'After-party plus one (Sep 11)',
};

const BOOLEAN_FIELDS = Object.keys(BOOLEAN_FIELD_LABELS) as Array<
  keyof Pick<
    SpeakerLogisticsAnswers,
    | 'attending_warmup'
    | 'attending_speakers_dinner'
    | 'attending_after_party'
    | 'attending_speaker_hangout'
    | 'dinner_plus_one'
    | 'after_party_plus_one'
  >
>;

const TEXT_FIELD_CHANGE_LABELS: Record<string, string> = {
  dietary_restrictions: 'Dietary restrictions updated',
  dinner_plus_one_dietary_restrictions: 'Dinner plus-one dietary restrictions updated',
  after_party_plus_one_first_name: 'After-party plus-one contact updated',
  after_party_plus_one_last_name: 'After-party plus-one contact updated',
  after_party_plus_one_email: 'After-party plus-one contact updated',
  talk_special_accommodations: 'Talk/workshop accommodations updated',
};

const TEXT_FIELDS = Object.keys(TEXT_FIELD_CHANGE_LABELS) as Array<
  keyof Pick<
    SpeakerLogisticsAnswers,
    | 'dietary_restrictions'
    | 'dinner_plus_one_dietary_restrictions'
    | 'after_party_plus_one_first_name'
    | 'after_party_plus_one_last_name'
    | 'after_party_plus_one_email'
    | 'talk_special_accommodations'
  >
>;

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Normalize validated form input into a consistent answers shape:
 * plus-one data is dropped when the speaker is not attending the event
 * (or not bringing a plus one), and empty strings become NULLs.
 */
export function normalizeAnswers(data: SpeakerLogisticsFormData): SpeakerLogisticsAnswers {
  const dinnerPlusOne = data.attending_speakers_dinner ? (data.dinner_plus_one ?? false) : false;
  const afterPartyPlusOne = data.attending_after_party ? (data.after_party_plus_one ?? false) : false;

  return {
    attending_warmup: data.attending_warmup,
    attending_speakers_dinner: data.attending_speakers_dinner,
    attending_after_party: data.attending_after_party,
    attending_speaker_hangout: data.attending_speaker_hangout,
    dietary_restrictions:
      data.attending_speakers_dinner || data.attending_after_party
        ? trimToNull(data.dietary_restrictions)
        : null,
    dinner_plus_one: dinnerPlusOne,
    dinner_plus_one_dietary_restrictions: dinnerPlusOne
      ? trimToNull(data.dinner_plus_one_dietary_restrictions)
      : null,
    after_party_plus_one: afterPartyPlusOne,
    after_party_plus_one_first_name: afterPartyPlusOne
      ? trimToNull(data.after_party_plus_one_first_name)
      : null,
    after_party_plus_one_last_name: afterPartyPlusOne
      ? trimToNull(data.after_party_plus_one_last_name)
      : null,
    after_party_plus_one_email: afterPartyPlusOne
      ? trimToNull(data.after_party_plus_one_email)
      : null,
    talk_special_accommodations: trimToNull(data.talk_special_accommodations),
  };
}

export interface SpeakerLogisticsDiff {
  /** Booleans that flipped from yes to no — the costly ones (food, capacity) */
  cancellations: string[];
  /** Everything else that changed */
  otherChanges: string[];
  hasChanges: boolean;
}

/**
 * Compare a speaker's previous answers with their new ones.
 * A "cancellation" is any RSVP or plus-one flag going yes → no; those are
 * called out loudly because we order food and book capacity against them.
 */
export function diffAnswers(
  previous: SpeakerLogisticsAnswers,
  next: SpeakerLogisticsAnswers
): SpeakerLogisticsDiff {
  const cancellations: string[] = [];
  const otherChanges: string[] = [];

  for (const field of BOOLEAN_FIELDS) {
    const before = previous[field] === true;
    const after = next[field] === true;
    if (before === after) continue;
    if (before && !after) {
      cancellations.push(BOOLEAN_FIELD_LABELS[field]);
    } else {
      otherChanges.push(`Now attending: ${BOOLEAN_FIELD_LABELS[field]}`);
    }
  }

  const textChangeLabels = new Set<string>();
  for (const field of TEXT_FIELDS) {
    if ((previous[field] ?? null) !== (next[field] ?? null)) {
      textChangeLabels.add(TEXT_FIELD_CHANGE_LABELS[field]);
    }
  }
  otherChanges.push(...textChangeLabels);

  return {
    cancellations,
    otherChanges,
    hasChanges: cancellations.length > 0 || otherChanges.length > 0,
  };
}

/**
 * One-line RSVP summary for Slack, e.g.
 * "Warm-Up Meetup (Sep 9): yes · Speakers Dinner (Sep 10): yes +1 · ..."
 */
export function buildAttendanceSummary(answers: SpeakerLogisticsAnswers): string {
  const parts = [
    `Warm-Up Meetup (Sep 9): ${answers.attending_warmup ? 'yes' : 'no'}`,
    `Speakers Dinner (Sep 10): ${
      answers.attending_speakers_dinner ? `yes${answers.dinner_plus_one ? ' +1' : ''}` : 'no'
    }`,
    `VIP After Party (Sep 11): ${
      answers.attending_after_party ? `yes${answers.after_party_plus_one ? ' +1' : ''}` : 'no'
    }`,
    `Speaker Hangout (Sep 12): ${answers.attending_speaker_hangout ? 'yes' : 'no'}`,
  ];
  return parts.join(' · ');
}
