import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SPEAKER_FEEDBACK_CODE_LENGTH,
  buildSpeakerFeedbackShare,
  createSpeakerFeedbackCode,
  createSpeakerFeedbackSlug,
  findSpeakerIdByFeedbackCode,
  parseSpeakerFeedbackShareParam,
  speakerFeedbackCodeMatches,
} from '@/lib/feedback/share';

const SPEAKER_ID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
const OTHER_SPEAKER_ID = '9e8d7c6b-5a4f-4e3d-2c1b-0a9f8e7d6c5b';

/** Same construction the module uses, recomputed independently. */
function expectedCode(speakerId: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`speaker-feedback-share:${speakerId}`)
    .digest('base64url')
    .slice(0, SPEAKER_FEEDBACK_CODE_LENGTH);
}

describe('speaker feedback share links', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'test-secret');
    vi.stubEnv('NEXTAUTH_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('createSpeakerFeedbackCode', () => {
    it('is a stable, URL-safe keyed hash of the speaker id', () => {
      const code = createSpeakerFeedbackCode(SPEAKER_ID);
      expect(code).toBe(expectedCode(SPEAKER_ID, 'test-secret'));
      expect(code).toHaveLength(SPEAKER_FEEDBACK_CODE_LENGTH);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(createSpeakerFeedbackCode(SPEAKER_ID)).toBe(code);
    });

    it('differs per speaker and per signing secret', () => {
      const code = createSpeakerFeedbackCode(SPEAKER_ID);
      expect(createSpeakerFeedbackCode(OTHER_SPEAKER_ID)).not.toBe(code);

      vi.stubEnv('ORDER_TOKEN_SECRET', 'rotated-secret');
      expect(createSpeakerFeedbackCode(SPEAKER_ID)).not.toBe(code);
    });

    it('is scoped so a speaker-guide code can never open a feedback page', () => {
      const guideCode = crypto
        .createHmac('sha256', 'test-secret')
        .update(`speaker-guide-code:${SPEAKER_ID}`)
        .digest('base64url')
        .slice(0, SPEAKER_FEEDBACK_CODE_LENGTH);

      expect(createSpeakerFeedbackCode(SPEAKER_ID)).not.toBe(guideCode);
    });

    it('falls back to NEXTAUTH_SECRET and refuses to sign without either', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', '');
      vi.stubEnv('NEXTAUTH_SECRET', 'fallback-secret');
      expect(createSpeakerFeedbackCode(SPEAKER_ID)).toBe(expectedCode(SPEAKER_ID, 'fallback-secret'));

      vi.stubEnv('NEXTAUTH_SECRET', '');
      expect(() => createSpeakerFeedbackCode(SPEAKER_ID)).toThrow(/ORDER_TOKEN_SECRET/);
    });
  });

  describe('createSpeakerFeedbackSlug', () => {
    it('normalizes accents, case and punctuation', () => {
      expect(createSpeakerFeedbackSlug('Ada Lovelace')).toBe('ada-lovelace');
      expect(createSpeakerFeedbackSlug('Renée O’Brien-Müller')).toBe('renee-o-brien-muller');
      expect(createSpeakerFeedbackSlug('  Spaced   Out  ')).toBe('spaced-out');
    });

    it('is empty when a name has no usable characters', () => {
      expect(createSpeakerFeedbackSlug('***')).toBe('');
    });
  });

  describe('buildSpeakerFeedbackShare', () => {
    it('puts the readable slug in front of the code', () => {
      const share = buildSpeakerFeedbackShare(SPEAKER_ID, 'Ada Lovelace');
      expect(share.slug).toBe('ada-lovelace');
      expect(share.code).toBe(createSpeakerFeedbackCode(SPEAKER_ID));
      expect(share.path).toBe(`/speaker-feedback/ada-lovelace-${share.code}`);
    });

    it('drops the separator when there is no slug to show', () => {
      const share = buildSpeakerFeedbackShare(SPEAKER_ID, '***');
      expect(share.path).toBe(`/speaker-feedback/${share.code}`);
    });
  });

  describe('parseSpeakerFeedbackShareParam', () => {
    const code = 'A'.repeat(SPEAKER_FEEDBACK_CODE_LENGTH);

    it('accepts a slugged link and a bare code', () => {
      expect(parseSpeakerFeedbackShareParam(`ada-lovelace-${code}`)).toBe(code);
      expect(parseSpeakerFeedbackShareParam(code)).toBe(code);
    });

    it('round-trips a generated path', () => {
      const share = buildSpeakerFeedbackShare(SPEAKER_ID, 'Ada Lovelace');
      const param = share.path.split('/').pop()!;
      expect(parseSpeakerFeedbackShareParam(param)).toBe(share.code);
    });

    it('rejects anything that cannot carry a code', () => {
      expect(parseSpeakerFeedbackShareParam('')).toBeNull();
      expect(parseSpeakerFeedbackShareParam('too-short')).toBeNull();
      expect(parseSpeakerFeedbackShareParam(`ada.lovelace-${code}`)).toBeNull();
      expect(parseSpeakerFeedbackShareParam(`../../${code}`)).toBeNull();
      // The slug must end at its separator, so a code glued onto a word is not a link
      expect(parseSpeakerFeedbackShareParam(`ada${code}`)).toBeNull();
    });
  });

  describe('speakerFeedbackCodeMatches', () => {
    it('accepts only that speaker’s own code', () => {
      const code = createSpeakerFeedbackCode(SPEAKER_ID);
      expect(speakerFeedbackCodeMatches(SPEAKER_ID, code)).toBe(true);
      expect(speakerFeedbackCodeMatches(OTHER_SPEAKER_ID, code)).toBe(false);
    });

    it('rejects a wrong-length code instead of throwing', () => {
      expect(speakerFeedbackCodeMatches(SPEAKER_ID, 'short')).toBe(false);
      expect(speakerFeedbackCodeMatches(SPEAKER_ID, '')).toBe(false);
    });
  });

  describe('findSpeakerIdByFeedbackCode', () => {
    it('resolves a code against the schedule, or nothing at all', () => {
      const ids = [OTHER_SPEAKER_ID, SPEAKER_ID];
      expect(findSpeakerIdByFeedbackCode(ids, createSpeakerFeedbackCode(SPEAKER_ID))).toBe(SPEAKER_ID);
      expect(findSpeakerIdByFeedbackCode(ids, 'B'.repeat(SPEAKER_FEEDBACK_CODE_LENGTH))).toBeNull();
      expect(findSpeakerIdByFeedbackCode([], createSpeakerFeedbackCode(SPEAKER_ID))).toBeNull();
    });
  });
});
