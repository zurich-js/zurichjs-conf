import { describe, it, expect } from 'vitest';
import { normalizeAnswers, diffAnswers, buildAttendanceSummary } from '@/lib/speaker-logistics';
import type { SpeakerLogisticsAnswers } from '@/lib/types/speaker-logistics';
import type { SpeakerLogisticsFormData } from '@/lib/validations/speaker-logistics';

const baseForm: SpeakerLogisticsFormData = {
  attending_warmup: true,
  attending_speakers_dinner: true,
  attending_after_party: true,
  attending_speaker_hangout: false,
  dietary_restrictions: 'Vegetarian, nut allergy',
  dinner_plus_one: true,
  dinner_plus_one_dietary_restrictions: 'Vegan',
  after_party_plus_one: true,
  after_party_plus_one_first_name: 'Alex',
  after_party_plus_one_last_name: 'Muster',
  after_party_plus_one_email: 'alex@example.com',
  talk_special_accommodations: 'Needs HDMI adapter',
  tshirt_size: 'M',
};

const baseAnswers: SpeakerLogisticsAnswers = normalizeAnswers(baseForm);

describe('normalizeAnswers', () => {
  it('keeps plus-one details when attending with a plus one', () => {
    expect(baseAnswers.dinner_plus_one).toBe(true);
    expect(baseAnswers.dinner_plus_one_dietary_restrictions).toBe('Vegan');
    expect(baseAnswers.after_party_plus_one).toBe(true);
    expect(baseAnswers.after_party_plus_one_email).toBe('alex@example.com');
  });

  it('drops plus-one data when the speaker is not attending the event', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      attending_speakers_dinner: false,
      attending_after_party: false,
    });

    expect(answers.dinner_plus_one).toBe(false);
    expect(answers.dinner_plus_one_dietary_restrictions).toBeNull();
    expect(answers.after_party_plus_one).toBe(false);
    expect(answers.after_party_plus_one_first_name).toBeNull();
    expect(answers.after_party_plus_one_last_name).toBeNull();
    expect(answers.after_party_plus_one_email).toBeNull();
  });

  it('drops dietary restrictions when attending neither catered event', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      attending_speakers_dinner: false,
      attending_after_party: false,
    });

    expect(answers.dietary_restrictions).toBeNull();
  });

  it('drops plus-one contact when no plus one is coming', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      dinner_plus_one: false,
      after_party_plus_one: false,
    });

    expect(answers.dinner_plus_one_dietary_restrictions).toBeNull();
    expect(answers.after_party_plus_one_first_name).toBeNull();
  });

  it('normalizes empty strings and whitespace to null', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      dietary_restrictions: '   ',
      talk_special_accommodations: '',
    });

    expect(answers.dietary_restrictions).toBeNull();
    expect(answers.talk_special_accommodations).toBeNull();
  });

  it('defaults missing plus-one flags to false', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      dinner_plus_one: null,
      after_party_plus_one: undefined,
      after_party_plus_one_first_name: 'Alex',
      after_party_plus_one_last_name: 'Muster',
      after_party_plus_one_email: 'alex@example.com',
    });

    expect(answers.dinner_plus_one).toBe(false);
    expect(answers.after_party_plus_one).toBe(false);
    expect(answers.after_party_plus_one_email).toBeNull();
  });
});

describe('diffAnswers', () => {
  it('reports no changes for identical answers', () => {
    const diff = diffAnswers(baseAnswers, { ...baseAnswers });

    expect(diff.hasChanges).toBe(false);
    expect(diff.cancellations).toEqual([]);
    expect(diff.otherChanges).toEqual([]);
  });

  it('flags yes → no RSVP flips as cancellations', () => {
    const diff = diffAnswers(
      baseAnswers,
      normalizeAnswers({ ...baseForm, attending_speakers_dinner: false })
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.cancellations).toContain('Speakers Dinner (Sep 10)');
    // Dropping the dinner also cancels its plus one
    expect(diff.cancellations).toContain('Dinner plus one (Sep 10)');
  });

  it('flags a withdrawn plus one as a cancellation', () => {
    const diff = diffAnswers(baseAnswers, normalizeAnswers({ ...baseForm, after_party_plus_one: false }));

    expect(diff.cancellations).toEqual(['After-party plus one (Sep 11)']);
  });

  it('reports new attendance as a non-cancellation change', () => {
    const diff = diffAnswers(baseAnswers, normalizeAnswers({ ...baseForm, attending_speaker_hangout: true }));

    expect(diff.cancellations).toEqual([]);
    expect(diff.otherChanges).toEqual(['Now attending: Speaker Hangout (Sep 12)']);
  });

  it('collapses plus-one contact field edits into one change entry', () => {
    const diff = diffAnswers(
      baseAnswers,
      normalizeAnswers({
        ...baseForm,
        after_party_plus_one_first_name: 'Sam',
        after_party_plus_one_email: 'sam@example.com',
      })
    );

    expect(diff.otherChanges).toEqual(['After-party plus-one contact updated']);
  });

  it('reports dietary updates', () => {
    const diff = diffAnswers(baseAnswers, normalizeAnswers({ ...baseForm, dietary_restrictions: 'Halal' }));

    expect(diff.cancellations).toEqual([]);
    expect(diff.otherChanges).toEqual(['Dietary restrictions updated']);
  });
});

describe('buildAttendanceSummary', () => {
  it('summarizes RSVPs with plus-one markers', () => {
    expect(buildAttendanceSummary(baseAnswers)).toBe(
      'Warm-Up Meetup (Sep 9): yes · Speakers Dinner (Sep 10): yes +1 · VIP After Party (Sep 11): yes +1 · Speaker Hangout (Sep 12): no'
    );
  });

  it('omits plus-one markers when not attending or coming alone', () => {
    const answers = normalizeAnswers({
      ...baseForm,
      attending_speakers_dinner: false,
      after_party_plus_one: false,
    });

    expect(buildAttendanceSummary(answers)).toBe(
      'Warm-Up Meetup (Sep 9): yes · Speakers Dinner (Sep 10): no · VIP After Party (Sep 11): yes · Speaker Hangout (Sep 12): no'
    );
  });
});
