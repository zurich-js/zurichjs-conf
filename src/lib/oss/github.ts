/**
 * GitHub API client for OSS maintainer verification
 *
 * Fetches the minimum signal needed to evaluate a maintainer claim:
 *   - account creation date
 *   - per-repo stars / fork status / push activity
 *   - per-user commit count + first/last commit dates
 *   - top contributors
 *
 * Uses `fetchWithRetry` so transient 5xx / rate-limit responses are handled
 * consistently. A `GITHUB_TOKEN` env var (any read-only token) bumps the
 * unauthenticated 60 req/hr limit to 5000 req/hr — strongly recommended.
 */

import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import type { OssRepoSignal } from './types';

const log = logger.scope('OSS GitHub');

const GITHUB_API = 'https://api.github.com';

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ZurichJS-OSS-Verification/1.0',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Parse "owner/repo" out of a URL or shorthand. Returns null when the input is
 * not a recognizable GitHub reference.
 */
export function parseRepoRef(input: string): { owner: string; name: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Plain owner/repo
  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (shortMatch) {
    return { owner: shortMatch[1], name: shortMatch[2] };
  }

  // URL form
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== 'github.com' && !host.endsWith('.github.com')) return null;
    const parts = url.pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length < 2) return null;
    const owner = parts[0];
    const name = parts[1].replace(/\.git$/, '');
    if (!owner || !name) return null;
    return { owner, name };
  } catch {
    return null;
  }
}

interface GithubUser {
  login: string;
  created_at: string;
}

interface GithubRepo {
  full_name: string;
  default_branch: string;
  stargazers_count: number;
  fork: boolean;
  parent?: { full_name: string };
  pushed_at: string | null;
  owner: { login: string };
}

interface GithubContributor {
  login: string;
  contributions: number;
}

interface GithubCompareResult {
  ahead_by: number;
  behind_by: number;
}

interface GithubCommit {
  sha: string;
  commit: { author?: { date: string | null } | null };
}

/**
 * Fetch the user record. Returns null on 404 / unauthorized.
 */
export async function fetchUser(username: string): Promise<GithubUser | null> {
  const res = await fetchWithRetry(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
    headers: authHeaders(),
  }, { label: 'github.fetchUser' });

  if (res.status === 404) return null;
  if (!res.ok) {
    log.warn('Failed to fetch GitHub user', { username, status: res.status });
    return null;
  }
  return res.json() as Promise<GithubUser>;
}

async function fetchRepo(owner: string, name: string): Promise<GithubRepo | null> {
  const res = await fetchWithRetry(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { headers: authHeaders() },
    { label: 'github.fetchRepo' }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<GithubRepo>;
}

async function fetchTopContributors(
  owner: string,
  name: string
): Promise<GithubContributor[]> {
  const res = await fetchWithRetry(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contributors?per_page=10&anon=false`,
    { headers: authHeaders() },
    { label: 'github.fetchTopContributors' }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as GithubContributor[] | { message?: string };
  if (!Array.isArray(json)) return [];
  return json;
}

async function fetchForkComparison(
  parentFullName: string,
  headOwner: string,
  headBranch: string
): Promise<GithubCompareResult | null> {
  const url = `${GITHUB_API}/repos/${parentFullName}/compare/${encodeURIComponent(parentFullName.split('/')[0])}:${encodeURIComponent(headBranch)}...${encodeURIComponent(headOwner)}:${encodeURIComponent(headBranch)}`;
  const res = await fetchWithRetry(url, { headers: authHeaders() }, { label: 'github.compare' });
  if (!res.ok) return null;
  return res.json() as Promise<GithubCompareResult>;
}

/**
 * Walk the commits authored by `username` on the repo's default branch.
 * Returns commit count, first commit date, last commit date.
 *
 * We page through at most 5 pages (500 commits) to keep the verification check
 * snappy. For very prolific maintainers this is plenty — we only need the floor
 * thresholds (≥ 50 commits, first commit ≥ 12 months ago).
 */
async function fetchUserCommitsOnRepo(
  owner: string,
  name: string,
  username: string,
  defaultBranch: string
): Promise<{ count: number; firstAt: string | null; lastAt: string | null }> {
  const perPage = 100;
  const maxPages = 5;

  let count = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits?author=${encodeURIComponent(username)}&sha=${encodeURIComponent(defaultBranch)}&per_page=${perPage}&page=${page}`;
    const res = await fetchWithRetry(url, { headers: authHeaders() }, { label: 'github.commits' });
    if (!res.ok) break;
    const commits = (await res.json()) as GithubCommit[];
    if (!Array.isArray(commits) || commits.length === 0) break;
    count += commits.length;

    for (const c of commits) {
      const date = c.commit?.author?.date ?? null;
      if (!date) continue;
      if (!lastAt || date > lastAt) lastAt = date;
      if (!firstAt || date < firstAt) firstAt = date;
    }

    if (commits.length < perPage) break;
  }

  return { count, firstAt, lastAt };
}

/**
 * Build the full signal block for a single submitted repo. Errors are captured
 * on the signal object — they don't reject the whole evaluation.
 */
export async function buildRepoSignal(
  rawInput: string,
  username: string
): Promise<OssRepoSignal | null> {
  const ref = parseRepoRef(rawInput);
  if (!ref) return null;

  const { owner, name } = ref;
  const baseSignal: OssRepoSignal = {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
    stars: 0,
    isFork: false,
    forkAheadBy: null,
    defaultBranch: null,
    firstCommitByUser: null,
    lastCommitByUser: null,
    commitsByUser: 0,
    topContributors: [],
    isTopContributor: false,
    isOwner: false,
    pushedAt: null,
  };

  const repo = await fetchRepo(owner, name);
  if (!repo) {
    return { ...baseSignal, error: 'Repository not found or inaccessible' };
  }

  const signal: OssRepoSignal = {
    ...baseSignal,
    stars: repo.stargazers_count,
    isFork: repo.fork,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
    isOwner: repo.owner.login.toLowerCase() === username.toLowerCase(),
  };

  // Pull contributors + user commits in parallel.
  const [contributors, commits] = await Promise.all([
    fetchTopContributors(owner, name),
    fetchUserCommitsOnRepo(owner, name, username, repo.default_branch),
  ]);

  signal.topContributors = contributors.slice(0, 3).map((c) => c.login);
  signal.isTopContributor = signal.topContributors
    .map((l) => l.toLowerCase())
    .includes(username.toLowerCase());
  signal.commitsByUser = commits.count;
  signal.firstCommitByUser = commits.firstAt;
  signal.lastCommitByUser = commits.lastAt;

  if (repo.fork && repo.parent) {
    signal.forkAheadBy =
      (await fetchForkComparison(repo.parent.full_name, owner, repo.default_branch))?.ahead_by ?? null;
  }

  return signal;
}
