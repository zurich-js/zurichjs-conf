import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSpeakerGuideCode,
  createSpeakerGuideSlug,
  getSpeakerGuideAccess,
} from '@/lib/speaker-guide/access';

describe('speaker guide access', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'test-guide-secret');
  });

  it('creates a stable speaker-specific path signed over the speaker id', () => {
    const speaker = { id: 'speaker-1', first_name: 'Alex', last_name: 'Lichter' };
    const slug = createSpeakerGuideSlug(speaker);
    const access = getSpeakerGuideAccess(speaker);

    expect(slug).toBe('alex-lichter');
    expect(access.code).toBe(createSpeakerGuideCode(speaker.id));
    expect(access.code).toHaveLength(18);
    expect(access.path).toBe(`/speaker-guide/${access.code}`);
  });

  it('creates different codes for different speakers', () => {
    expect(createSpeakerGuideCode('speaker-1')).not.toBe(
      createSpeakerGuideCode('speaker-2')
    );
  });

  it('keeps codes distinct when speaker names normalize to the same slug', () => {
    const alex = { id: 'speaker-1', first_name: 'Alex', last_name: 'Lichter' };
    const punctuationVariant = { id: 'speaker-2', first_name: 'Alex!', last_name: 'Lichter' };
    const duplicateName = { id: 'speaker-3', first_name: 'Alex', last_name: 'Lichter' };

    expect(createSpeakerGuideSlug(alex)).toBe(createSpeakerGuideSlug(punctuationVariant));
    expect(getSpeakerGuideAccess(alex).code).not.toBe(
      getSpeakerGuideAccess(punctuationVariant).code
    );
    expect(getSpeakerGuideAccess(alex).code).not.toBe(
      getSpeakerGuideAccess(duplicateName).code
    );
  });

  it('derives the code from the signing secret, not from public data alone', () => {
    const withFirstSecret = createSpeakerGuideCode('speaker-1');
    vi.stubEnv('ORDER_TOKEN_SECRET', 'another-secret');
    expect(createSpeakerGuideCode('speaker-1')).not.toBe(withFirstSecret);
  });

  it('fails closed when no signing secret is configured', () => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect(() => createSpeakerGuideCode('speaker-1')).toThrow(
      'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured'
    );
  });
});
