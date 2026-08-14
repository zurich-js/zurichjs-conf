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

  it('creates a stable speaker-specific path from the speaker slug', () => {
    const speaker = { first_name: 'Alex', last_name: 'Lichter' };
    const slug = createSpeakerGuideSlug(speaker);
    const access = getSpeakerGuideAccess(speaker);

    expect(slug).toBe('alex-lichter');
    expect(access.code).toBe(createSpeakerGuideCode(slug));
    expect(access.code).toHaveLength(18);
    expect(access.path).toBe(`/speaker-guide/${access.code}`);
  });

  it('creates different codes for different slugs', () => {
    expect(createSpeakerGuideCode('alex-lichter')).not.toBe(
      createSpeakerGuideCode('tracy-lee')
    );
  });

  it('derives the code from the signing secret, not from public data alone', () => {
    const withFirstSecret = createSpeakerGuideCode('alex-lichter');
    vi.stubEnv('ORDER_TOKEN_SECRET', 'another-secret');
    expect(createSpeakerGuideCode('alex-lichter')).not.toBe(withFirstSecret);
  });

  it('fails closed when no signing secret is configured', () => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
    expect(() => createSpeakerGuideCode('alex-lichter')).toThrow(
      'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured'
    );
  });
});
