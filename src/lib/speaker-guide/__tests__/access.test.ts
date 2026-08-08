import { describe, expect, it } from 'vitest';
import {
  createSpeakerGuideCode,
  createSpeakerGuideSlug,
  getSpeakerGuideAccess,
} from '@/lib/speaker-guide/access';

describe('speaker guide access', () => {
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
});
