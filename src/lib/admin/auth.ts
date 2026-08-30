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

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextApiRequest } from 'next';
import { verifyReadOnlyApiKey, type BotAuthResult } from './bot-auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Auth');

// Token format version, so the shape can change without silently accepting old tokens.
const ADMIN_SESSION_VERSION = 'v1';

/** How long an admin session stays valid. Also drives the cookie's Max-Age. */
export const ADMIN_SESSION_TTL_SECONDS = 24 * 60 * 60;

const ADMIN_SESSION_KEY_LABEL = 'zurichjs:admin-session:v1';
const ADMIN_PASSWORD_SALT = 'zurichjs:admin-password:v1';
const ADMIN_PASSWORD_KEY_LENGTH = 32;

interface AdminSessionPayload {
  sub: 'admin';
  iat: number;
  exp: number;
  nonce: string;
}

export interface AdminAccessResult {
  authorized: boolean;
  /** True if this request came via API key (bot), false if via cookie (human) */
  isBot: boolean;
  /** Value of X-Bot-Client header, if present */
  botClient: string | null;
}

/**
 * Verify the admin password using a timing-safe comparison.
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Missing required environment variable: ADMIN_PASSWORD');
  }

  // ADMIN_PASSWORD remains the source of truth, but a memory-hard comparison
  // prevents each login attempt from becoming a cheap offline password guess.
  const provided = scryptSync(password, ADMIN_PASSWORD_SALT, ADMIN_PASSWORD_KEY_LENGTH);
  const expected = scryptSync(adminPassword, ADMIN_PASSWORD_SALT, ADMIN_PASSWORD_KEY_LENGTH);
  return timingSafeEqual(provided, expected);
}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      'Missing required environment variable: ADMIN_SESSION_SECRET or ADMIN_PASSWORD'
    );
  }
  return secret;
}

function sessionSigningKey(): Buffer {
  return createHmac('sha256', sessionSecret()).update(ADMIN_SESSION_KEY_LABEL).digest();
}

function signSessionPayload(payloadPart: string): Buffer {
  return createHmac('sha256', sessionSigningKey())
    .update(`${ADMIN_SESSION_VERSION}.${payloadPart}`)
    .digest();
}

function decodeBase64Url(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, 'base64url');
  return decoded.toString('base64url') === value ? decoded : null;
}

/** Generate a signed admin session token that expires with the login cookie. */
export function generateAdminToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: 'admin',
    iat: issuedAt,
    exp: issuedAt + ADMIN_SESSION_TTL_SECONDS,
    nonce: randomBytes(18).toString('base64url'),
  };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signaturePart = signSessionPayload(payloadPart).toString('base64url');

  return `${ADMIN_SESSION_VERSION}.${payloadPart}.${signaturePart}`;
}

/** Verify an admin session signature and expiry without throwing on bad input. */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== ADMIN_SESSION_VERSION) return false;

    const [, payloadPart, signaturePart] = parts;
    const payloadBuffer = decodeBase64Url(payloadPart);
    const providedSignature = decodeBase64Url(signaturePart);
    if (!payloadBuffer || !providedSignature) return false;

    const expectedSignature = signSessionPayload(payloadPart);
    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)
    ) {
      return false;
    }

    const payload = JSON.parse(payloadBuffer.toString('utf8')) as Partial<AdminSessionPayload>;
    if (
      payload.sub !== 'admin' ||
      typeof payload.iat !== 'number' ||
      !Number.isInteger(payload.iat) ||
      typeof payload.exp !== 'number' ||
      !Number.isInteger(payload.exp) ||
      typeof payload.nonce !== 'string' ||
      payload.nonce.length < 16
    ) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return (
      payload.iat <= now + 60 &&
      payload.exp > now &&
      payload.exp > payload.iat &&
      payload.exp - payload.iat <= ADMIN_SESSION_TTL_SECONDS
    );
  } catch {
    // No secret configured or parse failure: refuse every token rather than accepting all of them.
    log.error('Failed to verify admin session token', undefined, {
      expected: 'ADMIN_SESSION_SECRET or ADMIN_PASSWORD',
    });
    return false;
  }
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
