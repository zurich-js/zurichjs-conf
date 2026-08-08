import { describe, expect, it } from 'vitest';
import {
  buildPersonalizedSpeakerGuide,
  type PersonalizedGuideProfile,
} from '@/lib/speaker-guide/personalized';

function profile(
  overrides: Partial<PersonalizedGuideProfile> = {}
): PersonalizedGuideProfile {
  return {
    firstName: 'Taylor',
    lastName: 'Speaker',
    logisticsSubmitted: true,
    attendingWarmup: true,
    attendingDinner: true,
    attendingAfterParty: true,
    attendingSpeakerHangout: true,
    hasRegisteredPlusOne: false,
    plusOneNames: [],
    sessions: [
      {
        title: 'A Carefully Tailored Talk',
        kind: 'talk',
        role: 'speaker',
        date: '2026-09-11',
        startTime: '10:15:00',
        durationMinutes: 30,
        room: 'Sky',
      },
    ],
    ...overrides,
  };
}

function visibleText(value: ReturnType<typeof buildPersonalizedSpeakerGuide>): string {
  return JSON.stringify(value.guide.sections);
}

describe('personalized speaker guide', () => {
  it('marks a declined warm-up for follow-up and removes workshop copy without an assignment', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingWarmup: false,
    }));
    const text = visibleText(result);

    expect(text).toContain('Community Day');
    expect(text).toContain('Let us know if you&apos;re attending this event');
    expect(text.toLowerCase()).not.toContain('workshop');
    expect(result.chatContext.flatMap((entry) => entry.content).join(' ')).toContain(
      'is not scheduled to lead a workshop'
    );
  });

  it('shows only the assigned workshop with its schedule details', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      sessions: [
        ...profile().sessions,
        {
          title: 'Build Better Systems',
          kind: 'workshop',
          role: 'instructor',
          date: '2026-09-10',
          startTime: '09:00:00',
          durationMinutes: 240,
          room: 'Lake',
        },
      ],
    }));
    const text = visibleText(result);

    expect(text).toContain('Your Workshop');
    expect(text).toContain('Build Better Systems');
    expect(text).toContain('09:00');
    expect(text).toContain('Room Lake');

    const workshopHeadingIndex = result.guide.sections.findIndex(
      (section) => section.type === 'heading' && section.content === 'Your Workshop'
    );
    expect(result.guide.sections.slice(workshopHeadingIndex + 1, workshopHeadingIndex + 3))
      .toMatchObject([
        { type: 'paragraph' },
        { type: 'list' },
      ]);
  });

  it('names a registered plus one and still points to the info form', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      plusOneNames: ['Casey Guest'],
    }));
    const text = visibleText(result);

    expect(text).toContain('Casey Guest');
    expect(text).toContain('speaker information has been submitted');
  });

  it('shows submitted logistics state even when no named plus one is registered', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const text = visibleText(result);

    expect(text).toContain('speaker information has been submitted');
    expect(text).toContain('do not currently have a plus one registered');
    expect(text).not.toContain('Please complete your');
  });

  it('reflects a registered plus one even when that event did not collect a name', () => {
    const result = buildPersonalizedSpeakerGuide(profile({ hasRegisteredPlusOne: true }));
    const text = visibleText(result);

    expect(text).toContain('You have a plus one registered');
    expect(text).toContain('name was not requested for that event');
  });

  it('asks for the logistics form only while it is pending', () => {
    const result = buildPersonalizedSpeakerGuide(profile({ logisticsSubmitted: false }));
    const text = visibleText(result);

    expect(text).toContain('Please complete your');
    expect(text).toContain('speaker logistics form');
    expect(text).not.toContain('speaker information has been submitted');
  });

  it('hides declined event details while retaining a short attendance prompt', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingDinner: false,
      attendingAfterParty: false,
    }));
    const text = visibleText(result);

    expect(text).not.toContain('Speaker Dinner at Ziegelhütte');
    expect(text).not.toContain('After Party at Seebad Enge');
    expect(text).toContain('speaker dinner at Ziegelhütte');
    expect(text).toContain('after party at Seebad Enge');
    expect(text).toContain('Let us know if you&apos;re attending this event');
  });

  it('marks attending events and shows their full detail sections', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const text = visibleText(result);

    expect(text).toContain('You&apos;re attending');
    expect(text).toContain('Speaker Dinner at Ziegelhütte');
    expect(text).toContain('After Party at Seebad Enge');
  });

  it('describes an assigned lunch panel as the speaker’s panel', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      sessions: [
        ...profile().sessions,
        {
          title: 'e18e & friends',
          kind: 'panel',
          role: 'host',
          date: '2026-09-11',
          startTime: '13:05:00',
          durationMinutes: 30,
          room: 'Main stage',
        },
      ],
    }));
    const text = visibleText(result);

    expect(text).toContain('How your lunch panel works');
    expect(text).toContain('Your panel');
    expect(text).toContain('e18e &amp; friends');
  });

  it('keeps every personalized chat context entry attached to a visible section', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingWarmup: false,
      attendingDinner: false,
      attendingAfterParty: false,
      attendingSpeakerHangout: false,
    }));
    const sectionIds = new Set(
      result.guide.sections
        .filter((section) => section.type === 'heading' && section.level === 'h2')
        .map((section) => (section.content ?? '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''))
    );

    result.chatContext.forEach((entry) => {
      expect(sectionIds.has(entry.sectionId), entry.sectionId).toBe(true);
    });
  });
});
