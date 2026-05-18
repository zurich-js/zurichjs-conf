/**
 * npm registry client for OSS maintainer verification
 *
 * Two signals we need:
 *   - first publish date + maintainers list (from the registry packument)
 *   - weekly downloads (from the downloads API)
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import type { OssNpmSignal } from './types';

const log = logger.scope('OSS npm');

const REGISTRY_API = 'https://registry.npmjs.org';
const DOWNLOADS_API = 'https://api.npmjs.org/downloads';

interface NpmPackument {
  name: string;
  maintainers?: { name: string; email?: string }[];
  time?: { created?: string; modified?: string; [version: string]: string | undefined };
}

interface NpmDownloads {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

/**
 * Normalize package name (handles scoped packages, URL-encoding scoped slash).
 */
export function normalizeNpmName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Accept "@scope/name" or "name"; reject anything that looks like a URL.
  if (/^https?:/i.test(trimmed)) return null;
  if (!/^@?[\w.-]+(\/[\w.-]+)?$/.test(trimmed)) return null;
  return trimmed;
}

function encodeNpmName(name: string): string {
  // Scoped packages must encode the leading "@/" but registry accepts the raw form.
  return name.startsWith('@') ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

async function fetchPackument(name: string): Promise<NpmPackument | null> {
  const res = await fetchWithRetry(
    `${REGISTRY_API}/${encodeNpmName(name)}`,
    { headers: { Accept: 'application/json' } },
    { label: 'npm.packument' }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    log.warn('Failed to fetch npm packument', { name, status: res.status });
    return null;
  }
  return res.json() as Promise<NpmPackument>;
}

async function fetchWeeklyDownloads(name: string): Promise<number> {
  const res = await fetchWithRetry(
    `${DOWNLOADS_API}/point/last-week/${encodeNpmName(name)}`,
    { headers: { Accept: 'application/json' } },
    { label: 'npm.downloads' }
  );
  if (!res.ok) return 0;
  const json = (await res.json()) as NpmDownloads | { error?: string };
  if ('error' in json && json.error) return 0;
  return (json as NpmDownloads).downloads ?? 0;
}

/**
 * Build the signal block for a single npm package. `isMaintainer` checks
 * whether the supplied GitHub-like handle appears in the package maintainers
 * list (npm usernames are usually but not always equal to GitHub usernames —
 * admin sees the actual maintainer list so they can reconcile).
 */
export async function buildNpmSignal(
  rawName: string,
  username: string
): Promise<OssNpmSignal | null> {
  const name = normalizeNpmName(rawName);
  if (!name) return null;

  const base: OssNpmSignal = {
    name,
    weeklyDownloads: 0,
    firstPublishedAt: null,
    isMaintainer: false,
    maintainers: [],
  };

  const packument = await fetchPackument(name);
  if (!packument) {
    return { ...base, error: 'Package not found on npm' };
  }

  const maintainers = (packument.maintainers ?? []).map((m) => m.name);
  const firstPublishedAt = packument.time?.created ?? null;

  const weeklyDownloads = await fetchWeeklyDownloads(name);

  return {
    name,
    weeklyDownloads,
    firstPublishedAt,
    maintainers,
    isMaintainer: maintainers.map((m) => m.toLowerCase()).includes(username.toLowerCase()),
  };
}
