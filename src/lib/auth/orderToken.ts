/**
 * Order Token Utilities
 * Generates secure tokens for order access via email links
 */

import crypto from 'crypto';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Token');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface VerifiedOrderToken {
  ticketId: string;
  manageTokenNonce: string;
}

function canonicalUuid(value: string): string | null {
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

/**
 * The secret used to sign newly generated tokens.
 */
function getSigningSecret(): string {
  const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
  }

  return secret;
}

function signaturePayload(ticketId: string, manageTokenNonce: string): string {
  return `${ticketId}.${manageTokenNonce}`;
}

function computeSignature(ticketId: string, manageTokenNonce: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signaturePayload(ticketId, manageTokenNonce));
  return hmac.digest('base64url');
}

function signatureMatches(
  ticketId: string,
  manageTokenNonce: string,
  providedSignature: string,
  secret: string
): boolean {
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(computeSignature(ticketId, manageTokenNonce, secret));

  // timingSafeEqual throws on length mismatch — reject those up front
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Generate a secure token for accessing an order
 * The per-ticket nonce is rotated when identity changes, invalidating old links.
 */
export function generateOrderToken(ticketId: string, manageTokenNonce: string): string {
  const canonicalTicketId = canonicalUuid(ticketId);
  if (!canonicalTicketId) {
    throw new Error('A valid ticket ID is required');
  }

  const canonicalNonce = canonicalUuid(manageTokenNonce);
  if (!canonicalNonce) {
    throw new Error('A valid manage token nonce is required');
  }

  const signature = computeSignature(canonicalTicketId, canonicalNonce, getSigningSecret());

  return `${canonicalTicketId}.${canonicalNonce}.${signature}`;
}

/**
 * Verify an order token and return its authenticated ticket ID and nonce.
 *
 * This verifies the HMAC but does not establish that the nonce is still current.
 * Access checks must use verifyOrderTokenForCurrentTicket, while transactional
 * mutations can compare these claims against a locked ticket row.
 */
export function verifyOrderTokenClaims(token: string): VerifiedOrderToken | null {
  try {
    const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      log.error('No order token secret configured', undefined, {
        expected: 'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET',
      });
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [rawTicketId, rawManageTokenNonce, providedSignature] = parts;
    const ticketId = canonicalUuid(rawTicketId);
    const manageTokenNonce = canonicalUuid(rawManageTokenNonce);
    if (!ticketId || !manageTokenNonce) {
      return null;
    }

    return signatureMatches(ticketId, manageTokenNonce, providedSignature, secret)
      ? { ticketId, manageTokenNonce }
      : null;
  } catch (error) {
    log.error('Error verifying order token', error);
    return null;
  }
}

/**
 * Verify an order token against a specific current nonce.
 */
export function verifyOrderToken(token: string, expectedManageTokenNonce: string): string | null {
  const claims = verifyOrderTokenClaims(token);
  if (!claims) {
    return null;
  }

  const expectedNonce = canonicalUuid(expectedManageTokenNonce);
  if (!expectedNonce || claims.manageTokenNonce !== expectedNonce) {
    return null;
  }

  return claims.ticketId;
}

/**
 * Extract the ticket ID from a token WITHOUT verifying its signature.
 *
 * Only for recovery flows where the signature can no longer be verified
 * (e.g. the signing secret was rotated out and lost) and the ticket ID is
 * needed to email a freshly signed link to the address on file. The result
 * MUST NOT be used to grant access to anything.
 */
export function extractTicketIdUnverified(token: string): string | null {
  const ticketId = token.split('.')[0];

  return canonicalUuid(ticketId);
}

/**
 * Generate order URL for a ticket
 */
export function generateOrderUrl(
  ticketId: string,
  manageTokenNonce: string,
  baseUrl?: string
): string {
  const token = generateOrderToken(ticketId, manageTokenNonce);
  const base = baseUrl || getBaseUrl();
  return `${base}/manage-order?token=${token}`;
}
