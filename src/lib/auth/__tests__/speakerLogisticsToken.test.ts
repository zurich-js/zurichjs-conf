import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// @/lib/url imports @/config/env, which requires NEXT_PUBLIC_* vars at import time
vi.mock('@/lib/url', () => ({
  getBaseUrl: () => 'http://localhost:3000',
}));

import {
  generateSpeakerLogisticsToken,
  verifySpeakerLogisticsToken,
  generateSpeakerLogisticsUrl,
} from '@/lib/auth/speakerLogisticsToken';
import { generateOrderToken } from '@/lib/auth/orderToken';

const SPEAKER_ID = '0b7c4d9e-51a3-4f2b-9c6d-8e1f2a3b4c5d';
const MANAGE_TOKEN_NONCE = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';

function signWith(speakerId: string, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`speaker-logistics:${speakerId}`)
    .digest('base64url');
  return `${speakerId}.${signature}`;
}

describe('speakerLogisticsToken', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateSpeakerLogisticsToken', () => {
    it('produces a <speakerId>.<signature> token that verifies', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      const token = generateSpeakerLogisticsToken(SPEAKER_ID);

      expect(token.startsWith(`${SPEAKER_ID}.`)).toBe(true);
      expect(verifySpeakerLogisticsToken(token)).toBe(SPEAKER_ID);
    });

    it('signs over the speaker-logistics scope', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(generateSpeakerLogisticsToken(SPEAKER_ID)).toBe(signWith(SPEAKER_ID, 'current-secret'));
    });

    it('falls back to NEXTAUTH_SECRET when ORDER_TOKEN_SECRET is unset', () => {
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(generateSpeakerLogisticsToken(SPEAKER_ID)).toBe(signWith(SPEAKER_ID, 'nextauth-secret'));
    });

    it('throws when no secret is configured', () => {
      expect(() => generateSpeakerLogisticsToken(SPEAKER_ID)).toThrow(
        'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured'
      );
    });
  });

  describe('verifySpeakerLogisticsToken', () => {
    it('rejects a token signed with an unknown secret', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(verifySpeakerLogisticsToken(signWith(SPEAKER_ID, 'wrong-secret'))).toBeNull();
    });

    it('rejects an order token for the same ID (scope isolation)', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      const orderToken = generateOrderToken(SPEAKER_ID, MANAGE_TOKEN_NONCE);

      expect(verifySpeakerLogisticsToken(orderToken)).toBeNull();
    });

    it('rejects malformed tokens', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(verifySpeakerLogisticsToken('no-dot-here')).toBeNull();
      expect(verifySpeakerLogisticsToken('too.many.parts')).toBeNull();
      expect(verifySpeakerLogisticsToken('')).toBeNull();
    });

    it('rejects a truncated signature without throwing', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
      const token = generateSpeakerLogisticsToken(SPEAKER_ID);

      expect(verifySpeakerLogisticsToken(token.slice(0, -10))).toBeNull();
    });

    it('returns null when no secret is configured', () => {
      expect(verifySpeakerLogisticsToken(signWith(SPEAKER_ID, 'any-secret'))).toBeNull();
    });
  });

  describe('generateSpeakerLogisticsUrl', () => {
    it('builds a speaker-logistics link containing the token', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      const url = generateSpeakerLogisticsUrl(SPEAKER_ID, 'https://conf.zurichjs.com');

      expect(url).toBe(
        `https://conf.zurichjs.com/speaker-logistics?token=${generateSpeakerLogisticsToken(SPEAKER_ID)}`
      );
    });

    it('falls back to the configured base URL', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(generateSpeakerLogisticsUrl(SPEAKER_ID)).toContain('http://localhost:3000/speaker-logistics?token=');
    });
  });
});
