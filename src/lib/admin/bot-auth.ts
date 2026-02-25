/**
 * Bot Read-Only Authentication
 * Provides API-key-based auth for automated/bot access to admin GET endpoints.
 *
 * Bots authenticate via: Authorization: Bearer <ADMIN_READONLY_API_KEY>
 * This is only accepted for GET requests — all mutations are blocked.
 */

import crypto from 'crypto';
import { serverEnv } from '@/config/env';
import type { NextApiRequest } from 'next';
import { logger } from '@/lib/logger';

const log = logger.scope('BotAuth');

export interface BotAuthResult {
  authenticated: boolean;
  isBot: boolean;
  botClient: string | null;
}

/**
 * Verify read-only API key from Authorization header.
 * Returns auth result with bot metadata for logging.
 *
 * - Only accepts GET requests.
 * - Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyReadOnlyApiKey(req: NextApiRequest): BotAuthResult {
  const notBot: BotAuthResult = { authenticated: false, isBot: false, botClient: null };

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return notBot;

  // This is a bot request (has Bearer token) regardless of validity
  const botClient = getBotClientHeader(req);

  if (req.method !== 'GET') {
    log.warn('Bot attempted non-GET request', {
      method: req.method,
      path: req.url,
      botClient,
    });
    return { authenticated: false, isBot: true, botClient };
  }

  const apiKey = serverEnv.admin.readonlyApiKey;
  if (!apiKey) {
    log.warn('ADMIN_READONLY_API_KEY not configured, rejecting bot request');
    return { authenticated: false, isBot: true, botClient };
  }

  const provided = authHeader.slice(7); // strip "Bearer "

  // Timing-safe comparison
  const keyBuffer = Buffer.from(apiKey);
  const providedBuffer = Buffer.from(provided);

  if (keyBuffer.length !== providedBuffer.length) {
    log.warn('Invalid bot API key (length mismatch)', { botClient });
    return { authenticated: false, isBot: true, botClient };
  }

  const valid = crypto.timingSafeEqual(keyBuffer, providedBuffer);

  if (valid) {
    log.info('Bot authenticated', {
      path: req.url,
      botClient,
    });
  } else {
    log.warn('Invalid bot API key', { botClient });
  }

  return { authenticated: valid, isBot: true, botClient };
}

/**
 * Extract the X-Bot-Client header for audit logging.
 * Bots should send: X-Bot-Client: my-bot-name/1.0
 */
function getBotClientHeader(req: NextApiRequest): string | null {
  const header = req.headers['x-bot-client'];
  if (typeof header === 'string' && header.length > 0 && header.length <= 100) {
    return header;
  }
  return null;
}
