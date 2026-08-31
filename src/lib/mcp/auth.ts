import crypto from 'node:crypto';
import type { NextApiRequest } from 'next';

const DEFAULT_ALLOWED_ORIGINS = ['https://chatgpt.com'];

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAllowedOrigins(): Set<string> {
  const configured = process.env.ZURICHJS_MCP_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  return origins;
}

export interface McpAuthResult {
  authorized: boolean;
  reason: 'authorized' | 'invalid_origin' | 'missing_key' | 'invalid_key';
}

export function verifyMcpAccess(req: NextApiRequest): McpAuthResult {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && !getAllowedOrigins().has(origin)) {
    return { authorized: false, reason: 'invalid_origin' };
  }

  const expectedKey = process.env.ZURICHJS_MCP_API_KEY;
  if (!expectedKey) {
    return { authorized: false, reason: 'missing_key' };
  }

  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return { authorized: false, reason: 'invalid_key' };
  }

  const providedKey = authorization.slice('Bearer '.length);
  if (!timingSafeEqual(expectedKey, providedKey)) {
    return { authorized: false, reason: 'invalid_key' };
  }

  return { authorized: true, reason: 'authorized' };
}
