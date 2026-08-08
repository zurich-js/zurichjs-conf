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
    arrivalDate: null,
    departureDate: null,
    attendingDinner: true,
    attendingActivities: true,
    travelMetadata: {},
    plusOneNames: [],
    arrivesViaZurichAirport: true,
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
  it('removes a declined warm-up and all visible workshop copy without an assignment', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingActivities: false,
    }));
    const text = visibleText(result);

    expect(text).not.toContain('Community Day');
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
  });

  it('names a registered plus one and still points to the info form', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      plusOneNames: ['Casey Guest'],
    }));
    const text = visibleText(result);

    expect(text).toContain('Casey Guest');
    expect(text).toContain('speaker info form');
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

  it('removes optional events outside the speaker’s travel window', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      arrivalDate: '2026-09-10',
      departureDate: '2026-09-11',
    }));
    const text = visibleText(result);

    expect(text).not.toContain('Community Day');
    expect(text).not.toContain('speaker day out');
    expect(text).toContain('conference day');
  });

  it('keeps every personalized chat context entry attached to a visible section', () => {
    const result = buildPersonalizedSpeakerGuide(profile({
      attendingActivities: false,
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
