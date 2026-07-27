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

/**
 * All secrets accepted when verifying tokens, in priority order:
 * 1. The current signing secret (ORDER_TOKEN_SECRET, else NEXTAUTH_SECRET)
 * 2. NEXTAUTH_SECRET — links emailed before ORDER_TOKEN_SECRET was introduced
 *    were signed with it via the fallback in getSigningSecret()
 * 3. ORDER_TOKEN_SECRET_FALLBACKS — comma-separated rotated-out secrets, so
 *    previously emailed links survive a secret rotation
 */
function getVerificationSecrets(): string[] {
  const secrets: string[] = [];

  const current = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (current) {
    secrets.push(current);
  }

  if (process.env.NEXTAUTH_SECRET) {
    secrets.push(process.env.NEXTAUTH_SECRET);
  }

  const fallbacks = process.env.ORDER_TOKEN_SECRET_FALLBACKS;
  if (fallbacks) {
    secrets.push(...fallbacks.split(',').map((s) => s.trim()).filter(Boolean));
  }

  return [...new Set(secrets)];
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
 * Tokens signed with a previous secret (see getVerificationSecrets) remain
 * valid, so emailed links survive secret rotation.
 */
export function verifyOrderToken(token: string): string | null {
  try {
    const secrets = getVerificationSecrets();

    if (secrets.length === 0) {
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

    for (const secret of secrets) {
      if (signatureMatches(ticketId, providedSignature, secret)) {
        return ticketId;
      }
    }

    return null;
  } catch (error) {
    log.error('Error verifying order token', error);
    return null;
  }
}

/**
 * Generate order URL for a ticket
 */
export function generateOrderUrl(ticketId: string, baseUrl?: string): string {
  const token = generateOrderToken(ticketId);
  const base = baseUrl || getBaseUrl();
  return `${base}/manage-order?token=${token}`;
}
