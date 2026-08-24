/**
 * Admin Authentication Utilities
 * Password-based authentication for the admin dashboard, plus read-only API
 * key authentication for bot/automation access.
 *
 * The session cookie is a stateless, domain-scoped HMAC with a hard expiry —
 * the same construction as order and speaker-logistics tokens
 * (`@/lib/auth/orderToken`, `@/lib/auth/speakerLogisticsToken`), signed with
 * the same secret family so no new environment variable is required.
 *
 * NOTE: this token authenticates "an admin", not "which admin". It carries no
 * identity, so it cannot attribute an action to a person. Per-person identity
 * for door staff is a separate concern — see `@/lib/checkin/staff`.
 */

import crypto from 'crypto';
import type { NextApiRequest } from 'next';
import { verifyReadOnlyApiKey, type BotAuthResult } from './bot-auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Auth');

// Domain scope baked into the signature so an admin session token can never be
// replayed against the order or logistics flows, even though they share a secret.
const TOKEN_SCOPE = 'admin-session';

// Token format version, so the shape can change without silently accepting old tokens.
const TOKEN_VERSION = 'v1';

/** How long an admin session stays valid. Also drives the cookie's Max-Age. */
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24;

export interface AdminAccessResult {
  authorized: boolean;
  /** True if this request came via API key (bot), false if via cookie (human) */
  isBot: boolean;
  /** Value of X-Bot-Client header, if present */
  botClient: string | null;
}

/**
 * The secret used to sign admin session tokens.
 *
 * Shares the domain-scoped secret family documented in `.env.example`, so
 * deploying this needs no new configuration.
 */
function getSigningSecret(): string {
  const secret = process.env.ORDER_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error('ORDER_TOKEN_SECRET or NEXTAUTH_SECRET must be configured');
  }

  return secret;
}

function computeSignature(expiresAtMs: number, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${TOKEN_SCOPE}:${TOKEN_VERSION}:${expiresAtMs}`);
  return hmac.digest('base64url');
}

function signatureMatches(expiresAtMs: number, providedSignature: string, secret: string): boolean {
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(computeSignature(expiresAtMs, secret));

  // timingSafeEqual throws on length mismatch — reject those up front
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Verify the admin password using a timing-safe comparison.
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Missing required environment variable: ADMIN_PASSWORD');
  }

  const provided = Buffer.from(password);
  const expected = Buffer.from(adminPassword);

  // timingSafeEqual throws on length mismatch — reject those up front.
  // Length is not secret enough to be worth padding for.
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Mint a signed admin session token that expires after
 * ADMIN_SESSION_TTL_SECONDS.
 *
 * Throws if no signing secret is configured, so a misconfigured deployment
 * fails at login rather than minting tokens that can never be verified.
 */
export function generateAdminToken(): string {
  const expiresAtMs = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const signature = computeSignature(expiresAtMs, getSigningSecret());

  return `${TOKEN_VERSION}.${expiresAtMs}.${signature}`;
}

/**
 * Verify an admin session token.
 *
 * Fails closed: an absent, malformed, expired, unsigned or wrongly-signed
 * token — or a missing signing secret — all return false.
 */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    // No secret configured: refuse every token rather than accepting all of them.
    log.error('No admin session secret configured', undefined, {
      expected: 'ORDER_TOKEN_SECRET or NEXTAUTH_SECRET',
    });
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [version, expiresAtRaw, providedSignature] = parts;
  if (version !== TOKEN_VERSION) return false;

  // Reject anything that is not a plain positive integer before Number() gets
  // a chance to be lenient about whitespace, signs or exponents.
  if (!/^\d+$/.test(expiresAtRaw)) return false;

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAtMs)) return false;

  // Check the signature before the expiry so an attacker cannot use response
  // timing to distinguish "expired" from "forged".
  const signed = signatureMatches(expiresAtMs, providedSignature, secret);

  return signed && expiresAtMs > Date.now();
}

/**
 * Unified admin access check.
 * Accepts EITHER:
 *   1. admin_token cookie (human admin via browser)
 *   2. Authorization: Bearer <ADMIN_READONLY_API_KEY> (bot, GET only)
 *
 * Returns structured result so callers can log bot vs human access.
 */
export function verifyAdminAccess(req: NextApiRequest): AdminAccessResult {
  // 1. Try cookie-based admin auth first
  const token = req.cookies.admin_token;
  if (verifyAdminToken(token)) {
    return { authorized: true, isBot: false, botClient: null };
  }

  // 2. Try API-key-based bot auth (GET only, enforced in bot-auth.ts)
  const botResult: BotAuthResult = verifyReadOnlyApiKey(req);
  if (botResult.authenticated) {
    return {
      authorized: true,
      isBot: true,
      botClient: botResult.botClient,
    };
  }

  // If it was a bot request but failed auth, preserve the bot info for logging
  if (botResult.isBot) {
    return {
      authorized: false,
      isBot: true,
      botClient: botResult.botClient,
    };
  }

  return { authorized: false, isBot: false, botClient: null };
}
