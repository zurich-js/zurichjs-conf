/**
 * Speaker Logistics Domain Logic
 * Normalization and summaries for speaker event RSVPs.
 * Pure functions — used by the token-authenticated form API and tested in
 * isolation.
 */

import type { SpeakerLogisticsFormData } from '@/lib/validations/speaker-logistics';
import type { SpeakerLogisticsAnswers } from '@/lib/types/speaker-logistics';

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
  const hangoutPlusOne = data.attending_speaker_hangout
    ? (data.speaker_hangout_plus_one ?? false)
    : false;

  return {
    attending_warmup: data.attending_warmup,
    attending_speakers_dinner: data.attending_speakers_dinner,
    attending_after_party: data.attending_after_party,
    attending_speaker_hangout: data.attending_speaker_hangout,
    speaker_hangout_plus_one: hangoutPlusOne,
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
    `Speaker Hangout (Sep 12): ${
      answers.attending_speaker_hangout ? `yes${answers.speaker_hangout_plus_one ? ' +1' : ''}` : 'no'
    }`,
  ];
  return parts.join(' · ');
}
