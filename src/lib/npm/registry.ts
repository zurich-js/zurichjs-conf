/**
 * npm registry integration.
 *
 * Hits the public registry search endpoint to enumerate a maintainer's
 * packages — the response already contains `downloads.weekly`, so we don't
 * need a second request against `api.npmjs.org/downloads/...` for the common
 * case. Contributed packages are looked up the same way: a search for the
 * exact name returns metadata + downloads in one call.
 *
 * Results are cached in-memory with a 6h TTL — mirrors the
 * `lib/sponsorship/currency.ts` pattern. A stale cache entry is served when
 * a refresh attempt fails.
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import type {
  NpmPackageImpact,
  SpeakerNpmImpact,
} from '@/lib/npm/types';

const log = logger.scope('npm Registry');

const SEARCH_ENDPOINT = 'https://registry.npmjs.org/-/v1/search';
const MAX_PACKAGES_PER_MAINTAINER = 250;
const TOP_PACKAGES_LIMIT = 6;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  impact: SpeakerNpmImpact;
  fetchedAtMs: number;
}

const cache = new Map<string, CacheEntry>();

interface RegistrySearchObject {
  package?: {
    name?: string;
    description?: string;
    date?: string;
    links?: {
      npm?: string;
      repository?: string;
    };
  };
  downloads?: {
    weekly?: number;
    monthly?: number;
  };
}

interface RegistrySearchResponse {
  objects?: RegistrySearchObject[];
  total?: number;
}

function cacheKey(username: string, contributesTo: readonly string[]): string {
  return `${username.toLowerCase()}::${[...contributesTo].sort().join(',')}`;
}

function normalizeRepositoryUrl(repository: { url?: string } | string | undefined | null): string | null {
  if (!repository) return null;
  const raw = typeof repository === 'string' ? repository : repository.url;
  if (!raw) return null;

  // `git+https://github.com/foo/bar.git` → `https://github.com/foo/bar`
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '');
}

function npmUrlFor(packageName: string): string {
  return `https://www.npmjs.com/package/${packageName}`;
}

function packageFromSearchObject(entry: RegistrySearchObject, isMaintained: boolean): NpmPackageImpact | null {
  const pkg = entry.package;
  if (!pkg?.name) return null;
  return {
    name: pkg.name,
    description: pkg.description?.trim() || null,
    weekly_downloads: typeof entry.downloads?.weekly === 'number' ? entry.downloads.weekly : 0,
    repository_url: normalizeRepositoryUrl(pkg.links?.repository ?? null),
    npm_url: npmUrlFor(pkg.name),
    last_publish: pkg.date ?? null,
    is_maintained: isMaintained,
  };
}

async function searchRegistry(query: string, size: number, label: string): Promise<RegistrySearchObject[]> {
  const params = new URLSearchParams({ text: query, size: String(size) });
  const response = await fetchWithRetry(`${SEARCH_ENDPOINT}?${params.toString()}`, undefined, {
    attempts: 3,
    label,
  });

  if (!response.ok) {
    throw new Error(`npm search failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as RegistrySearchResponse;
  return data.objects ?? [];
}

async function fetchMaintainedPackages(username: string): Promise<NpmPackageImpact[]> {
  const objects = await searchRegistry(
    `maintainer:${username}`,
    MAX_PACKAGES_PER_MAINTAINER,
    `npm search maintainer:${username}`,
  );

  return objects
    .map((entry) => packageFromSearchObject(entry, true))
    .filter((entry): entry is NpmPackageImpact => entry !== null);
}

async function fetchContributedPackage(packageName: string): Promise<NpmPackageImpact | null> {
  try {
    const objects = await searchRegistry(packageName, 5, `npm search ${packageName}`);
    const match = objects.find((entry) => entry.package?.name === packageName) ?? null;
    if (!match) {
      log.warn('Contributed package not found in registry search', { packageName });
      return null;
    }
    return packageFromSearchObject(match, false);
  } catch (error) {
    log.warn('Skipping contributed package after fetch failure', {
      packageName,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function buildImpact(
  speakerSlug: string,
  username: string,
  contributesTo: readonly string[],
): Promise<SpeakerNpmImpact> {
  const maintained = await fetchMaintainedPackages(username);

  const contributedRaw = await Promise.all(contributesTo.map(fetchContributedPackage));
  const maintainedNames = new Set(maintained.map((entry) => entry.name));
  const contributed = contributedRaw
    .filter((entry): entry is NpmPackageImpact => entry !== null)
    .filter((entry) => !maintainedNames.has(entry.name));

  const packages = [...maintained, ...contributed].sort(
    (left, right) => right.weekly_downloads - left.weekly_downloads,
  );

  const totalWeeklyDownloads = packages.reduce((sum, pkg) => sum + pkg.weekly_downloads, 0);

  return {
    speaker_slug: speakerSlug,
    npm_username: username,
    packages,
    top_packages: packages.slice(0, TOP_PACKAGES_LIMIT),
    totals: {
      package_count: packages.length,
      weekly_downloads: totalWeeklyDownloads,
    },
    fetched_at: new Date().toISOString(),
    is_stale: false,
  };
}

export interface GetSpeakerNpmImpactInput {
  speakerSlug: string;
  npmUsername: string;
  contributesTo?: readonly string[];
}

/**
 * Fetch and cache the speaker's open-source footprint. Returns a stale cache
 * entry when the upstream call fails and we have a previous successful result.
 */
export async function getSpeakerNpmImpact({
  speakerSlug,
  npmUsername,
  contributesTo = [],
}: GetSpeakerNpmImpactInput): Promise<SpeakerNpmImpact> {
  const key = cacheKey(npmUsername, contributesTo);
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) {
    return { ...cached.impact, is_stale: false };
  }

  try {
    const impact = await buildImpact(speakerSlug, npmUsername, contributesTo);
    cache.set(key, { impact, fetchedAtMs: now });
    return impact;
  } catch (error) {
    if (cached) {
      log.warn('Serving stale npm impact after upstream failure', {
        speakerSlug,
        npmUsername,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return { ...cached.impact, is_stale: true };
    }
    throw error;
  }
}

export const _internals = {
  normalizeRepositoryUrl,
  cacheKey,
  packageFromSearchObject,
};
