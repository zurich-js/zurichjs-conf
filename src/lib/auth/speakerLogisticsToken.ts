/**
 * Speaker Logistics Token Utilities
 * Generates secure tokens for the speaker event-logistics form linked from
 * email. Uses a domain-scoped HMAC payload so order tokens and logistics tokens are never
 * interchangeable.
 */

import crypto from 'crypto';
import { getBaseUrl } from '@/lib/url';
import { logger } from '@/lib/logger';

const log = logger.scope('Speaker Logistics Token');

// Domain scope baked into the signature so a token minted for one flow can
// never be replayed against the other, even though they share a secret.
const TOKEN_SCOPE = 'speaker-logistics';

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

function computeSignature(speakerId: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${TOKEN_SCOPE}:${speakerId}`);
  return hmac.digest('base64url');
}

function signatureMatches(speakerId: string, providedSignature: string, secret: string): boolean {
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(computeSignature(speakerId, secret));

  // timingSafeEqual throws on length mismatch — reject those up front
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Generate a secure token for a speaker's logistics form
 * This creates an HMAC signature of the speaker ID using a secret key
 */
export function generateSpeakerLogisticsToken(speakerId: string): string {
  const signature = computeSignature(speakerId, getSigningSecret());

  // Return speaker ID and signature combined
  return `${speakerId}.${signature}`;
}

/**
 * Verify a speaker logistics token and extract the speaker ID
 * Returns the speaker ID if valid, null if invalid
 */
export function verifySpeakerLogisticsToken(token: string): string | null {
  try {
    const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      log.error('No token secret configured', undefined, {
        expected: 'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET',
      });
      return null;
    }

    // Split token into speaker ID and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [speakerId, providedSignature] = parts;

    return signatureMatches(speakerId, providedSignature, secret) ? speakerId : null;
  } catch (error) {
    log.error('Error verifying speaker logistics token', error);
    return null;
  }
}

/**
 * Generate the unique logistics form URL for a speaker
 */
export function generateSpeakerLogisticsUrl(speakerId: string, baseUrl?: string): string {
  const token = generateSpeakerLogisticsToken(speakerId);
  const base = baseUrl || getBaseUrl();
  return `${base}/speaker-logistics?token=${token}`;
}
