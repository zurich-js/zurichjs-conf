/**
 * Bluesky AT Protocol client.
 *
 * Two modes, picked automatically:
 *
 * 1. **Authenticated** (preferred) — when `BLUESKY_IDENTIFIER` and
 *    `BLUESKY_APP_PASSWORD` are set, this module logs in once per warm
 *    function instance and uses the AT Protocol AppView (`api.bsky.app`)
 *    with per-account rate limits. Recommended for production.
 *
 * 2. **Public** (fallback) — hits `public.api.bsky.app` with no auth. Works
 *    locally and as a graceful degradation if creds aren't configured, but
 *    is fronted by Cloudflare and rate-limited per source IP, so server-side
 *    bursts from Vercel/AWS commonly get 403'd.
 *
 * Bluesky app passwords are generated at https://bsky.app/settings/app-passwords
 * and are scoped permissions — they're NOT the account password.
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';

const log = logger.scope('Bluesky Client');

const PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const APPVIEW = 'https://api.bsky.app';
const PDS = 'https://bsky.social';
const USER_AGENT = 'zurichjs-conf/1.0 (+https://zurichjs.com)';

// Cloudflare in front of public.api.bsky.app sometimes returns 403 on bursty
// server-side requests; treat it as transient alongside the standard set.
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
  /** Best-effort expiry timestamp parsed from the JWT exp claim (ms). */
  expiresAtMs: number;
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
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { exp?: number };
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
  // Reuse a cached session that hasn't expired (60s safety margin).
  if (cachedSession && cachedSession.expiresAtMs - Date.now() > 60_000) {
    return cachedSession;
  }

  // Try to refresh in place; on failure, fall through to full login.
  if (cachedSession) {
    const refreshed = await refreshSession(cachedSession.refreshJwt).catch(() => null);
    if (refreshed) {
      cachedSession = refreshed;
      return cachedSession;
    }
  }

  // Coalesce concurrent auth attempts so a burst of requests only triggers
  // one createSession call.
  if (inflightAuth) return inflightAuth;
  inflightAuth = createSession().finally(() => {
    inflightAuth = null;
  });
  cachedSession = await inflightAuth;
  return cachedSession;
}

interface XrpcGetParams {
  /** XRPC method name, e.g. "app.bsky.feed.searchPosts". */
  method: string;
  /** Query parameters. Arrays are repeated as ?key=v1&key=v2. */
  params: Record<string, string | string[] | number | undefined>;
  /** Optional human label for retry logs. */
  label?: string;
}

function buildSearchParams(params: XrpcGetParams['params']): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    } else {
      search.set(key, String(value));
    }
  }
  return search;
}

/**
 * Issue an authenticated XRPC GET if creds are configured, otherwise hit the
 * public AppView with 403-tolerant retries.
 */
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
      // Tighter retry list for authenticated calls; broader for public AppView.
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
