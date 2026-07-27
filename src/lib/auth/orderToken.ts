/**
 * Order Token Utilities
 * Generates secure tokens for order access via email links
 */

import crypto from 'crypto';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';

const log = logger.scope('Order Token');

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

function computeSignature(ticketId: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ticketId);
  return hmac.digest('base64url');
}

function signatureMatches(ticketId: string, providedSignature: string, secret: string): boolean {
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(computeSignature(ticketId, secret));

  // timingSafeEqual throws on length mismatch — reject those up front
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Generate a secure token for accessing an order
 * This creates an HMAC signature of the ticket ID using a secret key
 */
export function generateOrderToken(ticketId: string): string {
  const signature = computeSignature(ticketId, getSigningSecret());

  // Return ticket ID and signature combined
  return `${ticketId}.${signature}`;
}

/**
 * Verify an order token and extract the ticket ID
 * Returns the ticket ID if valid, null if invalid
 *
 * Tokens signed with a rotated-out secret will not verify — the recovery
 * flow (POST /api/orders/recover-link) handles those by emailing a freshly
 * signed link to the address on the ticket.
 */
export function verifyOrderToken(token: string): string | null {
  try {
    const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      log.error('No order token secret configured', undefined, {
        expected: 'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET',
      });
      return null;
    }

    // Split token into ticket ID and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [ticketId, providedSignature] = parts;

    return signatureMatches(ticketId, providedSignature, secret) ? ticketId : null;
  } catch (error) {
    log.error('Error verifying order token', error);
    return null;
  }
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

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(ticketId) ? ticketId : null;
}

/**
 * Generate order URL for a ticket
 */
export function generateOrderUrl(ticketId: string, baseUrl?: string): string {
  const token = generateOrderToken(ticketId);
  const base = baseUrl || getBaseUrl();
  return `${base}/manage-order?token=${token}`;
}
