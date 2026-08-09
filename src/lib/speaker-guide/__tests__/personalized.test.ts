import { describe, expect, it } from 'vitest';
import {
  buildPersonalizedSpeakerGuide,
  type PersonalizedGuideProfile,
} from '@/lib/speaker-guide/personalized';
import { speakerGuide } from '@/data/speaker-guide';

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
  it('keeps the general route unpersonalized', () => {
    expect(speakerGuide.title).toBe('Speaker Guide');
    expect(speakerGuide.kicker).toBeUndefined();
  });

  it('marks a declined warm-up accurately and removes workshop copy without an assignment', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingWarmup: false,
    }));
    const text = visibleText(result);

    expect(text).toContain('Community Day');
    expect(text).toContain('Not attending');
    expect(text).not.toContain('Your Workshop');
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
    expect(text).toContain('@ Lake');

    const workshopHeadingIndex = result.guide.sections.findIndex(
      (section) => section.type === 'heading' && section.content === 'Your Workshop'
    );
    expect(result.guide.sections.slice(workshopHeadingIndex + 1, workshopHeadingIndex + 4))
      .toMatchObject([
        { type: 'paragraph', content: expect.stringContaining('You are leading') },
        { type: 'paragraph', content: expect.stringContaining('It is scheduled for') },
        { type: 'list' },
      ]);
  });

  it('names a registered plus one and still points to the info form', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      plusOneNames: ['Casey Guest'],
    }));
    const text = visibleText(result);

    expect(text).toContain('Casey Guest');
    expect(text).toContain('Info submitted');
  });

  it('shows submitted logistics state even when no named plus one is registered', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const text = visibleText(result);

    expect(text).toContain('Info submitted');
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
    expect(text).not.toContain('Info submitted');
  });

  it('hides declined event details while retaining an accurate status', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingDinner: false,
      attendingAfterParty: false,
    }));
    const text = visibleText(result);

    expect(text).not.toContain('Speaker Dinner at Ziegelhütte');
    expect(text).not.toContain('After Party at Seebad Enge');
    expect(text).toContain('speaker dinner at Ziegelhütte');
    expect(text).toContain('after party at Seebad Enge');
    expect(text).toContain('Not attending');
    expect(text).not.toContain('RSVP pending');
  });

  it('marks attending events and shows their full detail sections', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const text = visibleText(result);
    const dinnerHeading = result.guide.sections.find(
      (section) => section.type === 'heading' && section.content === 'Speaker Dinner at Ziegelhütte'
    );

    expect(text).toContain('Attending');
    expect(text).toContain('Speaker Dinner at Ziegelhütte');
    expect(text).toContain('After Party at Seebad Enge');
    expect(dinnerHeading).toMatchObject({ status: 'Attending' });
    expect(result.guide.sections.map((section) => section.type)).not.toContain('status');
  });

  it('uses the speaker name sparingly in the visible guide', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const opening = result.guide.sections.find((section) => section.type === 'paragraph');

    expect(result.guide.title).toBe('Speaker Guide');
    expect(result.guide.kicker).toBe('For Taylor Speaker');
    expect(opening?.content).toContain('Welcome aboard, Taylor!');
    expect(opening?.content).toContain("class=\"block\"");
  });

  it('groups key dates into one item per day', () => {
    const baseProfile = profile();
    const result = buildPersonalizedSpeakerGuide(profile({
      sessions: [
        ...baseProfile.sessions,
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
    const headingIndex = result.guide.sections.findIndex(
      (section) => section.type === 'heading' && section.content === 'Key Dates at a Glance'
    );
    const keyDates = result.guide.sections[headingIndex + 1];

    expect(keyDates).toMatchObject({ type: 'groupedList' });
    expect(keyDates.groups).toHaveLength(4);
    expect(keyDates.groups?.[1].items.join(' ')).toContain('Build Better Systems');
    expect(keyDates.groups?.[1].items.join(' ')).toContain('speaker dinner');
    expect(keyDates.groups?.[2].items.join(' ')).toContain('Conference day');
    expect(keyDates.groups?.[2].items.join(' ')).toContain('after party');
    expect(keyDates.groups?.[2].items.join(' ')).toContain(
      '10:15:</strong> your “<strong>A Carefully Tailored Talk</strong>” live session @ Sky'
    );
  });

  it('shows unanswered RSVPs as orange pending chips', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingWarmup: null,
    }));
    const text = visibleText(result);
    const keyDatesContext = result.chatContext.find(
      (entry) => entry.sectionId === 'key-dates-at-a-glance'
    );

    expect(text).toContain('RSVP pending');
    expect(text).toContain('bg-orange-50');
    expect(text).toContain('light hike or a tour of Zurich');
    expect(keyDatesContext?.content.join(' ')).toContain('On the 12th');
    expect(keyDatesContext?.content.join(' ')).toContain('Community Day RSVP pending');
  });

  it('keeps the session assignment in key dates instead of repeating it in tech guidance', () => {
    const result = buildPersonalizedSpeakerGuide(profile());
    const techHeadingIndex = result.guide.sections.findIndex(
      (section) => section.type === 'heading' && section.content === 'Slides, Stage, and Tech'
    );
    const nextHeadingOffset = result.guide.sections
      .slice(techHeadingIndex + 1)
      .findIndex((section) => section.type === 'heading' && section.level === 'h2');
    const techSections = result.guide.sections.slice(
      techHeadingIndex + 1,
      nextHeadingOffset === -1 ? undefined : techHeadingIndex + nextHeadingOffset + 1
    );

    expect(JSON.stringify(techSections)).not.toContain('A Carefully Tailored Talk');
    expect(visibleText(result)).toContain('your “<strong>A Carefully Tailored Talk</strong>” live session');
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
