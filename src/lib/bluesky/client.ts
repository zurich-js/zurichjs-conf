/**
 * Minimal Bluesky AT Protocol client.
 *
 * Uses an authenticated session when BLUESKY_IDENTIFIER and
 * BLUESKY_APP_PASSWORD are configured. Falls back to the public AppView when
 * credentials are unavailable so local development still works.
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Client');

const PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const APPVIEW = 'https://api.bsky.app';
const PDS = 'https://bsky.social';
const USER_AGENT = 'zurichjs-conf/1.0 (+https://zurichjs.com)';

const PUBLIC_RETRY_STATUSES = [403, 408, 425, 429, 500, 502, 503, 504];

interface CreateSessionResponse {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
}

interface SessionState {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
  expiresAtMs: number;
}

export interface XrpcGetParams {
  method: string;
  params: Record<string, string | string[] | number | undefined>;
  label?: string;
}

let cachedSession: SessionState | null = null;
let inflightAuth: Promise<SessionState | null> | null = null;

function getCreds(): { identifier: string; password: string } | null {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) return null;
  return { identifier, password };
}

function parseJwtExpiryMs(jwt: string): number {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return 0;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function createSession(): Promise<SessionState | null> {
  const creds = getCreds();
  if (!creds) return null;

  const res = await fetchWithRetry(
    `${PDS}/xrpc/com.atproto.server.createSession`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        identifier: creds.identifier,
        password: creds.password,
      }),
    },
    { label: 'bluesky.createSession', attempts: 3 }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log.error('Bluesky createSession failed', new Error(`HTTP ${res.status}`), {
      status: res.status,
      bodyPreview: body.slice(0, 200),
    });
    return null;
  }

  const data = (await res.json()) as CreateSessionResponse;
  return {
    accessJwt: data.accessJwt,
    refreshJwt: data.refreshJwt,
    did: data.did,
    handle: data.handle,
    expiresAtMs: parseJwtExpiryMs(data.accessJwt),
  };
}

async function refreshSession(refreshJwt: string): Promise<SessionState | null> {
  const res = await fetchWithRetry(
    `${PDS}/xrpc/com.atproto.server.refreshSession`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshJwt}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    },
    { label: 'bluesky.refreshSession', attempts: 2 }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as CreateSessionResponse;
  return {
    accessJwt: data.accessJwt,
    refreshJwt: data.refreshJwt,
    did: data.did,
    handle: data.handle,
    expiresAtMs: parseJwtExpiryMs(data.accessJwt),
  };
}

async function getSession(): Promise<SessionState | null> {
  if (cachedSession && cachedSession.expiresAtMs - Date.now() > 60_000) {
    return cachedSession;
  }

  if (cachedSession) {
    const refreshed = await refreshSession(cachedSession.refreshJwt).catch(() => null);
    if (refreshed) {
      cachedSession = refreshed;
      return cachedSession;
    }
  }

  if (inflightAuth) return inflightAuth;
  inflightAuth = createSession().finally(() => {
    inflightAuth = null;
  });
  cachedSession = await inflightAuth;
  return cachedSession;
}

function buildSearchParams(params: XrpcGetParams['params']): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.set(key, String(value));
    }
  }
  return search;
}

export async function xrpcGet<T>({ method, params, label }: XrpcGetParams): Promise<T> {
  const session = await getSession();
  const search = buildSearchParams(params);
  const base = session ? APPVIEW : PUBLIC_APPVIEW;
  const url = `${base}/xrpc/${method}?${search.toString()}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  };
  if (session) {
    headers.Authorization = `Bearer ${session.accessJwt}`;
  }

  const res = await fetchWithRetry(
    url,
    { headers },
    {
      label: label ?? `bluesky.${method}`,
      attempts: 3,
      retryStatuses: session ? undefined : PUBLIC_RETRY_STATUSES,
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bluesky ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export function isBlueskyAuthenticated(): boolean {
  return getCreds() !== null;
}
