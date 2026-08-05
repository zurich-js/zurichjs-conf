/**
 * Corporate access codes (server-only)
 *
 * Signed, self-contained codes that mark a browser as a corporate buyer so the
 * discount popup stops offering it money off. Admin generates a code, sends the
 * link to the enterprise contact, and anyone opening it is marked.
 *
 * Stateless by design — an HMAC over a tiny payload rather than a database
 * table. The stakes are deliberately low: the only thing a leaked code can do
 * is *suppress* a discount offer, so there is no fraud to defend against and no
 * need for per-code usage tracking or a revocation list. Expiry is the control,
 * and rotating the signing secret invalidates every outstanding code at once.
 *
 * Do NOT export this module from the discount barrel (index.ts) — it reads a
 * server secret and must never reach a client bundle. Import it directly in API
 * routes: `@/lib/discount/corporate-code`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/config/env';

/**
 * Domain-separated signing key derived from an existing server-only secret, so
 * this feature needs no new environment variable. The label makes the derived
 * key useless for anything else signed with the same secret.
 */
const KEY_LABEL = 'zurichjs:corporate-buyer-code:v1';

function signingKey(): Buffer {
  const secret = env.supabase.secretKey;
  if (!secret) {
    throw new Error('Cannot sign corporate codes: SUPABASE_SECRET_KEY is missing');
  }
  return createHmac('sha256', secret).update(KEY_LABEL).digest();
}

interface CorporateCodePayload {
  /** Organisation name, for analytics and the confirmation screen */
  label: string;
  /** Expiry as a unix timestamp in seconds */
  exp: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadPart: string): string {
  return createHmac('sha256', signingKey()).update(payloadPart).digest('base64url');
}

export interface CreateCorporateCodeInput {
  label: string;
  /** How long the link stays usable. */
  validDays: number;
}

/** Builds a signed code of the form `<payload>.<signature>`. */
export function signCorporateCode({ label, validDays }: CreateCorporateCodeInput): string {
  const payload: CorporateCodePayload = {
    label,
    exp: Math.floor(Date.now() / 1000) + validDays * 24 * 60 * 60,
  };
  const payloadPart = base64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

export type VerifyCorporateCodeResult =
  | { valid: true; label: string; expiresAt: string }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** Verifies a code's signature and expiry. Never throws on bad input. */
export function verifyCorporateCode(code: string): VerifyCorporateCodeResult {
  const parts = code.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'malformed' };
  }
  const [payloadPart, signaturePart] = parts;

  const expected = Buffer.from(sign(payloadPart));
  const provided = Buffer.from(signaturePart);
  // timingSafeEqual throws on length mismatch, so guard before comparing.
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { valid: false, reason: 'bad_signature' };
  }

  let payload: CorporateCodePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  if (typeof payload?.label !== 'string' || typeof payload?.exp !== 'number') {
    return { valid: false, reason: 'malformed' };
  }

  if (payload.exp * 1000 <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    label: payload.label,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}
