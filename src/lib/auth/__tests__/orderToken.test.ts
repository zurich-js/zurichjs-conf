import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/url', () => ({
  getBaseUrl: () => 'http://localhost:3000',
}));

import {
  extractTicketIdUnverified,
  generateOrderToken,
  generateOrderUrl,
  verifyLegacyOrderToken,
  verifyOrderToken,
  verifyOrderTokenClaims,
} from '@/lib/auth/orderToken';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';
const MANAGE_TOKEN_NONCE = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';
const ROTATED_NONCE = 'ec639162-d93b-49fb-b70d-62b47a5b41be';

function signWith(ticketId: string, nonce: string, secret: string): string {
  const canonicalTicketId = ticketId.toLowerCase();
  const canonicalNonce = nonce.toLowerCase();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${canonicalTicketId}.${canonicalNonce}`)
    .digest('base64url');
  return `${canonicalTicketId}.${canonicalNonce}.${signature}`;
}

function legacySignWith(ticketId: string, secret: string): string {
  const signature = crypto.createHmac('sha256', secret).update(ticketId).digest('base64url');
  return `${ticketId}.${signature}`;
}

describe('orderToken', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
    vi.stubEnv('NEXTAUTH_SECRET', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('generateOrderToken', () => {
    it('signs the ticket ID and nonce without embedding contact details', () => {
      const token = generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE);

      expect(token).toBe(signWith(TICKET_ID, MANAGE_TOKEN_NONCE, 'current-secret'));
      expect(token).not.toContain('attendee@example.com');
      expect(verifyOrderToken(token, MANAGE_TOKEN_NONCE)).toBe(TICKET_ID);
    });

    it('canonicalizes UUID casing', () => {
      const token = generateOrderToken(TICKET_ID.toUpperCase(), MANAGE_TOKEN_NONCE.toUpperCase());

      expect(token).toBe(signWith(TICKET_ID, MANAGE_TOKEN_NONCE, 'current-secret'));
      expect(verifyOrderToken(token, MANAGE_TOKEN_NONCE.toUpperCase())).toBe(TICKET_ID);
    });

    it('falls back to NEXTAUTH_SECRET', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', '');
      vi.stubEnv('NEXTAUTH_SECRET', 'nextauth-secret');

      expect(generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE)).toBe(
        signWith(TICKET_ID, MANAGE_TOKEN_NONCE, 'nextauth-secret')
      );
    });

    it('rejects malformed generation inputs', () => {
      expect(() => generateOrderToken('not-a-uuid', MANAGE_TOKEN_NONCE)).toThrow(
        'A valid ticket ID is required'
      );
      expect(() => generateOrderToken(TICKET_ID, 'not-a-uuid')).toThrow(
        'A valid manage token nonce is required'
      );
    });

    it('throws when no secret is configured', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', '');
      expect(() => generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE)).toThrow(
        'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured'
      );
    });
  });

  describe('verification', () => {
    it('returns authenticated claims for a valid token', () => {
      const token = generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE);

      expect(verifyOrderTokenClaims(token)).toEqual({
        ticketId: TICKET_ID,
        manageTokenNonce: MANAGE_TOKEN_NONCE,
      });
    });

    it('rejects a validly signed token after the nonce rotates', () => {
      const token = generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE);

      expect(verifyOrderToken(token, ROTATED_NONCE)).toBeNull();
    });

    it('rejects legacy, malformed, and extra-segment tokens', () => {
      expect(verifyOrderToken(legacySignWith(TICKET_ID, 'current-secret'), MANAGE_TOKEN_NONCE)).toBeNull();
      expect(verifyOrderToken('no-dot-here', MANAGE_TOKEN_NONCE)).toBeNull();
      expect(
        verifyOrderToken(`${TICKET_ID}.${MANAGE_TOKEN_NONCE}.signature.extra`, MANAGE_TOKEN_NONCE)
      ).toBeNull();
      expect(verifyOrderToken(`not-a-uuid.${MANAGE_TOKEN_NONCE}.signature`, MANAGE_TOKEN_NONCE)).toBeNull();
      expect(verifyOrderToken(`${TICKET_ID}.not-a-uuid.signature`, MANAGE_TOKEN_NONCE)).toBeNull();
      expect(verifyOrderToken('', MANAGE_TOKEN_NONCE)).toBeNull();
    });

    it('authenticates legacy signatures for server-side compatibility checks', () => {
      expect(verifyLegacyOrderToken(legacySignWith(TICKET_ID, 'current-secret'))).toBe(TICKET_ID);
      expect(verifyLegacyOrderToken(legacySignWith(TICKET_ID, 'wrong-secret'))).toBeNull();
      expect(verifyLegacyOrderToken(`${TICKET_ID}.bad.extra`)).toBeNull();
    });

    it('rejects unknown secrets and truncated signatures without throwing', () => {
      expect(
        verifyOrderToken(
          signWith(TICKET_ID, MANAGE_TOKEN_NONCE, 'wrong-secret'),
          MANAGE_TOKEN_NONCE
        )
      ).toBeNull();

      const token = generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE);
      expect(verifyOrderToken(token.slice(0, -10), MANAGE_TOKEN_NONCE)).toBeNull();
    });

    it('returns null when no secret is configured', () => {
      vi.stubEnv('ORDER_TOKEN_SECRET', '');

      expect(
        verifyOrderToken(
          signWith(TICKET_ID, MANAGE_TOKEN_NONCE, 'any-secret'),
          MANAGE_TOKEN_NONCE
        )
      ).toBeNull();
    });
  });

  describe('extractTicketIdUnverified', () => {
    it('extracts a canonical ticket ID from current and legacy tokens', () => {
      expect(extractTicketIdUnverified(generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE))).toBe(
        TICKET_ID
      );
      expect(extractTicketIdUnverified(legacySignWith(TICKET_ID, 'old-secret'))).toBe(TICKET_ID);
      expect(extractTicketIdUnverified(TICKET_ID.toUpperCase())).toBe(TICKET_ID);
    });

    it('rejects values without a UUID-shaped first segment', () => {
      expect(extractTicketIdUnverified('not-a-uuid.sig')).toBeNull();
      expect(extractTicketIdUnverified('')).toBeNull();
      expect(extractTicketIdUnverified('.sig-only')).toBeNull();
    });
  });

  describe('generateOrderUrl', () => {
    it('builds a manage-order link containing the nonce-bound token', () => {
      const url = generateOrderUrl(
        TICKET_ID,
        MANAGE_TOKEN_NONCE,
        'https://conf.zurichjs.com'
      );

      expect(url).toBe(
        `https://conf.zurichjs.com/manage-order?token=${generateOrderToken(TICKET_ID, MANAGE_TOKEN_NONCE)}`
      );
    });
  });
});
