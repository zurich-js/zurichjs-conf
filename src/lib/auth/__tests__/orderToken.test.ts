import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// @/lib/url imports @/config/env, which requires NEXT_PUBLIC_* vars at import time
vi.mock('@/lib/url', () => ({
  getBaseUrl: () => 'http://localhost:3000',
}));

import {
  generateOrderToken,
  verifyOrderToken,
  generateOrderUrl,
  extractTicketIdUnverified,
} from '@/lib/auth/orderToken';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';

function signWith(ticketId: string, secret: string): string {
  const signature = crypto.createHmac('sha256', secret).update(ticketId).digest('base64url');
  return `${ticketId}.${signature}`;
}

describe('orderToken', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', '');
    vi.stubEnv('NEXTAUTH_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateOrderToken', () => {
    it('produces a <ticketId>.<signature> token that verifies', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      const token = generateOrderToken(TICKET_ID);

      expect(token.startsWith(`${TICKET_ID}.`)).toBe(true);
      expect(verifyOrderToken(token)).toBe(TICKET_ID);
    });

    it('signs with ORDER_TOKEN_SECRET when set', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(generateOrderToken(TICKET_ID)).toBe(signWith(TICKET_ID, 'current-secret'));
    });

    it('falls back to NEXTAUTH_SECRET when ORDER_TOKEN_SECRET is unset', () => {
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(generateOrderToken(TICKET_ID)).toBe(signWith(TICKET_ID, 'nextauth-secret'));
    });

    it('throws when no secret is configured', () => {
      expect(() => generateOrderToken(TICKET_ID)).toThrow(
        'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured'
      );
    });
  });

  describe('verifyOrderToken', () => {
    it('rejects a token signed with an unknown secret', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(verifyOrderToken(signWith(TICKET_ID, 'wrong-secret'))).toBeNull();
    });

    it('rejects malformed tokens', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      expect(verifyOrderToken('no-dot-here')).toBeNull();
      expect(verifyOrderToken('too.many.parts')).toBeNull();
      expect(verifyOrderToken('')).toBeNull();
    });

    it('rejects a truncated signature without throwing', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
      const token = generateOrderToken(TICKET_ID);

      expect(verifyOrderToken(token.slice(0, -10))).toBeNull();
    });

    it('returns null when no secret is configured', () => {
      expect(verifyOrderToken(signWith(TICKET_ID, 'any-secret'))).toBeNull();
    });

    it('rejects tokens signed with NEXTAUTH_SECRET once ORDER_TOKEN_SECRET is set', () => {
      // Link emailed when only NEXTAUTH_SECRET existed
      const oldToken = signWith(TICKET_ID, 'nextauth-secret');

      // ORDER_TOKEN_SECRET added later — only it verifies now; stale links
      // go through the recovery flow instead
      vi.stubEnv('ORDER_TOKEN_SECRET', 'new-dedicated-secret');
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(verifyOrderToken(oldToken)).toBeNull();
    });

    it('verifies against NEXTAUTH_SECRET when ORDER_TOKEN_SECRET is unset', () => {
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(verifyOrderToken(signWith(TICKET_ID, 'nextauth-secret'))).toBe(TICKET_ID);
    });
  });

  describe('extractTicketIdUnverified', () => {
    it('extracts the ticket ID from a token regardless of signature validity', () => {
      expect(extractTicketIdUnverified(`${TICKET_ID}.completely-bogus-signature`)).toBe(TICKET_ID);
    });

    it('accepts a bare ticket ID with no signature', () => {
      expect(extractTicketIdUnverified(TICKET_ID)).toBe(TICKET_ID);
    });

    it('rejects values that are not UUID-shaped', () => {
      expect(extractTicketIdUnverified('not-a-uuid.sig')).toBeNull();
      expect(extractTicketIdUnverified('')).toBeNull();
      expect(extractTicketIdUnverified('.sig-only')).toBeNull();
    });
  });

  describe('generateOrderUrl', () => {
    it('builds a manage-order link containing the token', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');

      const url = generateOrderUrl(TICKET_ID, 'https://conf.zurichjs.com');

      expect(url).toBe(`https://conf.zurichjs.com/manage-order?token=${generateOrderToken(TICKET_ID)}`);
    });
  });
});
