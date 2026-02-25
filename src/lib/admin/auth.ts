/**
 * Admin Authentication Utilities
 * Simple password-based authentication for admin dashboard
 * + read-only API key authentication for bot/automation access
 */

import { serverEnv } from '@/config/env';
import type { NextApiRequest } from 'next';
import { verifyReadOnlyApiKey, type BotAuthResult } from './bot-auth';

export interface AdminAccessResult {
  authorized: boolean;
  /** True if this request came via API key (bot), false if via cookie (human) */
  isBot: boolean;
  /** Value of X-Bot-Client header, if present */
  botClient: string | null;
}

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
  return password === serverEnv.admin.password;
}

/**
 * Session token generation (simple approach)
 * In production, use proper JWT or session management
 */
export function generateAdminToken(): string {
  // Simple token generation - in production use crypto.randomBytes or JWT
  return Buffer.from(`admin:${Date.now()}:${Math.random()}`).toString('base64');
}

/**
 * Verify admin token (basic check)
 * In production, use proper session validation
 */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    return decoded.startsWith('admin:');
  } catch {
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
