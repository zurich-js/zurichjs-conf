/**
 * Order Token Utilities
 * Generates secure tokens for order access via email links
 */

import crypto from 'crypto';
import { getBaseUrl } from '@/lib/url';

/**
 * Generate a secure token for accessing an order
 * This creates an HMAC signature of the ticket ID using a secret key
 */
export function generateOrderToken(ticketId: string): string {
  const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
  }

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ticketId);
  const signature = hmac.digest('base64url');

  // Return ticket ID and signature combined
  return `${ticketId}.${signature}`;
}

/**
 * Verify an order token and extract the ticket ID
 * Returns the ticket ID if valid, null if invalid
 */
export function verifyOrderToken(token: string): string | null {
  try {
    const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

    if (!secret) {
      throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
    }

    // Split token into ticket ID and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [ticketId, providedSignature] = parts;

    // Recreate the signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(ticketId);
    const expectedSignature = hmac.digest('base64url');

    // Compare signatures (constant-time comparison)
    if (crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      return ticketId;
    }

    return null;
  } catch (error) {
    console.error('Error verifying order token:', error);
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
