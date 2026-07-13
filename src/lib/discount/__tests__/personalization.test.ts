/**
 * Tests for discount popup tech-stack personalization.
 */

import { describe, it, expect } from 'vitest';
import { buildDiscountPersonalization } from '../personalization';
import type { PublicSpeaker, PublicSession } from '@/lib/types/cfp/public';

function makeSession(overrides: Partial<PublicSession> = {}): PublicSession {
  return {
    id: 'session-1',
    slug: 'a-talk',
    title: 'A talk',
    abstract: '',
    tags: [],
    type: 'talk' as PublicSession['type'],
    level: 'intermediate' as PublicSession['level'],
    speakers: [],
    schedule: null,
    ...overrides,
  };
}

function makeSpeaker(overrides: Partial<PublicSpeaker> = {}): PublicSpeaker {
  return {
    id: 'speaker-1',
    slug: 'ada-lovelace',
    first_name: 'Ada',
    last_name: 'Lovelace',
    job_title: null,
    company: null,
    bio: null,
    profile_image_url: null,
    header_image_url: null,
    portrait_foreground_url: null,
    portrait_background_url: null,
    is_featured: false,
    speaker_role: 'speaker' as PublicSpeaker['speaker_role'],
    tags: [],
    socials: {
      linkedin_url: null,
      github_url: null,
      twitter_handle: null,
      bluesky_handle: null,
      mastodon_handle: null,
    },
    assigned_session_kinds: { talks: true, workshops: false },
    sessions: [],
    ...overrides,
  };
}

describe('buildDiscountPersonalization', () => {
  it('returns null for unknown framework or empty speaker list', () => {
    expect(buildDiscountPersonalization('unknown', [makeSpeaker()])).toBeNull();
    expect(buildDiscountPersonalization(null, [makeSpeaker()])).toBeNull();
    expect(buildDiscountPersonalization('react', [])).toBeNull();
    expect(buildDiscountPersonalization('react', null)).toBeNull();
  });

  it('returns null when no speaker matches the stack', () => {
    const speakers = [makeSpeaker({ tags: ['css', 'accessibility'] })];
    expect(buildDiscountPersonalization('react', speakers)).toBeNull();
  });

  it('matches speakers by speaker tags (case-insensitive)', () => {
    const speakers = [makeSpeaker({ tags: ['React', 'Testing'] })];
    const result = buildDiscountPersonalization('react', speakers);

    expect(result).not.toBeNull();
    expect(result!.stackDisplayName).toBe('React');
    expect(result!.speakerNames).toEqual(['Ada Lovelace']);
    expect(result!.matchCount).toBe(1);
  });

  it('matches speakers by session tags and titles', () => {
    const byTag = makeSpeaker({
      id: 's1',
      first_name: 'Grace',
      last_name: 'Hopper',
      sessions: [makeSession({ tags: ['vue.js'] })],
    });
    const byTitle = makeSpeaker({
      id: 's2',
      first_name: 'Margaret',
      last_name: 'Hamilton',
      sessions: [makeSession({ title: 'Scaling Nuxt apps in production' })],
    });

    const result = buildDiscountPersonalization('vue', [byTag, byTitle]);
    expect(result!.speakerNames).toEqual(
      expect.arrayContaining(['Grace Hopper', 'Margaret Hamilton'])
    );
    expect(result!.matchCount).toBe(2);
  });

  it('prefers featured speakers and caps names at two', () => {
    const speakers = [
      makeSpeaker({ id: 's1', first_name: 'First', last_name: 'Match', tags: ['react'] }),
      makeSpeaker({ id: 's2', first_name: 'Second', last_name: 'Match', tags: ['react'] }),
      makeSpeaker({
        id: 's3',
        first_name: 'Featured',
        last_name: 'Star',
        is_featured: true,
        tags: ['react'],
      }),
    ];

    const result = buildDiscountPersonalization('react', speakers);
    expect(result!.speakerNames).toHaveLength(2);
    expect(result!.speakerNames[0]).toBe('Featured Star');
    expect(result!.matchCount).toBe(3);
  });

  it('does not match SOLID-principles talks for the solid framework', () => {
    const speakers = [
      makeSpeaker({ sessions: [makeSession({ title: 'SOLID principles for maintainable code' })] }),
    ];
    expect(buildDiscountPersonalization('solid', speakers)).toBeNull();

    const solidJs = [
      makeSpeaker({ sessions: [makeSession({ title: 'Fine-grained reactivity with SolidJS' })] }),
    ];
    expect(buildDiscountPersonalization('solid', solidJs)).not.toBeNull();
  });

  it('matches Next.js content for react visitors', () => {
    const speakers = [
      makeSpeaker({ sessions: [makeSession({ title: 'Next.js caching deep dive' })] }),
    ];
    const result = buildDiscountPersonalization('react', speakers);
    expect(result).not.toBeNull();
  });
});
