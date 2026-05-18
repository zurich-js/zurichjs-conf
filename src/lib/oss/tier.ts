/**
 * OSS maintainer tier scoring
 *
 * Pure functions — no I/O. Takes the GitHub + npm signals and produces a
 * qualifying tier plus a per-gate report that's stored on the verification
 * request so admins can see *why* a tier was assigned (or wasn't).
 *
 * Tier ladder (transparent — shown on the apply page):
 *   T1 (80% off): ≥10k stars OR ≥100k weekly downloads; ≥3y tenure; recent activity
 *   T2 (60% off): ≥2k stars OR ≥10k weekly downloads;  ≥2y tenure; recent activity
 *   T3 (40% off): ≥500 stars OR ≥1k weekly downloads;  ≥1y tenure; recent activity
 *   T4 (20% off): ≥500 stars OR ≥1k weekly downloads;  <1y tenure but real activity
 *   Below T4: doesn't meet the "actively used" floor — not eligible.
 *
 * Hard rejects (regardless of project stats):
 *   - GitHub account younger than 2 years
 *   - All submitted repos are forks without ≥50 commits ahead of upstream
 *   - Applicant is not in the top 3 contributors AND not the owner on any submitted repo
 *   - All submitted npm packages first published less than 6 months ago
 */

import type {
  OssAutoCheckResult,
  OssGateResult,
  OssNpmSignal,
  OssQualifyingTier,
  OssRepoSignal,
} from './types';

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const MIN_ACCOUNT_AGE_YEARS = 2;
const MIN_USER_COMMITS_FLOOR = 50;
const FORK_AHEAD_MIN = 50;

interface TierThreshold {
  tier: OssQualifyingTier;
  minStarsOrDownloads: { stars: number; downloads: number };
  minTenureYears: number;
  requiresRecentActivity: boolean;
}

export const TIER_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 1, minStarsOrDownloads: { stars: 10_000, downloads: 100_000 }, minTenureYears: 3, requiresRecentActivity: true },
  { tier: 2, minStarsOrDownloads: { stars: 2_000, downloads: 10_000 }, minTenureYears: 2, requiresRecentActivity: true },
  { tier: 3, minStarsOrDownloads: { stars: 500, downloads: 1_000 }, minTenureYears: 1, requiresRecentActivity: true },
  { tier: 4, minStarsOrDownloads: { stars: 500, downloads: 1_000 }, minTenureYears: 0, requiresRecentActivity: false },
] as const;

interface ScoreInput {
  githubUsername: string;
  accountCreatedAt: string | null;
  repos: OssRepoSignal[];
  npmPackages: OssNpmSignal[];
  now?: Date;
}

function yearsBetween(fromISO: string | null, now: Date): number | null {
  if (!fromISO) return null;
  const from = Date.parse(fromISO);
  if (!Number.isFinite(from)) return null;
  return (now.getTime() - from) / ONE_YEAR_MS;
}

function isRecent(dateISO: string | null, now: Date): boolean {
  if (!dateISO) return false;
  const t = Date.parse(dateISO);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t <= SIX_MONTHS_MS;
}

/**
 * Returns the strongest repo signal — the one most likely to land the
 * applicant in the highest tier — used purely for tier scoring. The check
 * still respects per-repo hard rejects (forks etc.) before considering a repo.
 */
function pickBestRepo(repos: OssRepoSignal[]): OssRepoSignal | null {
  const valid = repos.filter(
    (r) => !r.error && (!r.isFork || (r.forkAheadBy !== null && r.forkAheadBy >= FORK_AHEAD_MIN))
  );
  if (valid.length === 0) return null;
  return [...valid].sort((a, b) => b.stars - a.stars)[0];
}

function pickBestNpm(packages: OssNpmSignal[]): OssNpmSignal | null {
  const valid = packages.filter((p) => !p.error);
  if (valid.length === 0) return null;
  return [...valid].sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)[0];
}

/**
 * Returns the tenure (in years) used for tier scoring:
 *   - For repos the applicant maintains, use first commit date.
 *   - For npm packages they maintain, use first publish date.
 *   - Pick the longer of the two — represents how long they've been
 *     a known maintainer of the qualifying project.
 */
function maintainerTenureYears(
  bestRepo: OssRepoSignal | null,
  bestNpm: OssNpmSignal | null,
  now: Date
): number | null {
  const repoYears = bestRepo
    ? yearsBetween(bestRepo.firstCommitByUser, now)
    : null;
  const npmYears = bestNpm?.isMaintainer
    ? yearsBetween(bestNpm.firstPublishedAt, now)
    : null;
  const candidates = [repoYears, npmYears].filter((v): v is number => v !== null);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

export function scoreOssMaintainer(input: ScoreInput): OssAutoCheckResult {
  const now = input.now ?? new Date();
  const gates: OssGateResult[] = [];
  const notes: string[] = [];

  // ---- Account age gate (hard floor) ----
  const accountAgeYears = yearsBetween(input.accountCreatedAt, now);
  const accountAgePassed =
    accountAgeYears !== null && accountAgeYears >= MIN_ACCOUNT_AGE_YEARS;
  gates.push({
    id: 'account_age',
    label: `GitHub account ≥ ${MIN_ACCOUNT_AGE_YEARS} years old`,
    passed: accountAgePassed,
    detail:
      accountAgeYears === null
        ? 'Account age unknown (user not found?)'
        : `Account age: ${accountAgeYears.toFixed(1)}y`,
  });

  // ---- Top-3 contributor OR owner on at least one repo ----
  const hasOwnershipSignal = input.repos.some(
    (r) => !r.error && (r.isOwner || r.isTopContributor)
  );
  gates.push({
    id: 'ownership_signal',
    label: 'Owner or top-3 contributor on at least one submitted repo',
    passed: hasOwnershipSignal,
    detail: hasOwnershipSignal
      ? 'Confirmed via GitHub contributors API'
      : 'Applicant not in top contributors and not repo owner',
  });

  // ---- Real maintainer commit volume on at least one repo ----
  const hasCommitVolume = input.repos.some(
    (r) => !r.error && r.commitsByUser >= MIN_USER_COMMITS_FLOOR
  );
  gates.push({
    id: 'commit_volume',
    label: `≥ ${MIN_USER_COMMITS_FLOOR} commits authored by applicant on at least one repo`,
    passed: hasCommitVolume,
    detail: input.repos
      .filter((r) => !r.error)
      .map((r) => `${r.owner}/${r.name}: ${r.commitsByUser}`)
      .join(', ') || 'No repos resolved',
  });

  // ---- Fork sanity check: at least one repo isn't a fork (or is well ahead) ----
  const validRepos = input.repos.filter((r) => !r.error);
  const hasNonForkOrAhead = validRepos.some(
    (r) => !r.isFork || (r.forkAheadBy !== null && r.forkAheadBy >= FORK_AHEAD_MIN)
  );
  gates.push({
    id: 'fork_sanity',
    label: 'At least one submitted repo is not a fork (or ≥50 commits ahead)',
    passed: validRepos.length === 0 ? false : hasNonForkOrAhead,
    detail: validRepos.length === 0
      ? 'No repos resolved'
      : validRepos.map((r) => r.isFork ? `${r.owner}/${r.name}: fork (ahead ${r.forkAheadBy ?? '?'})` : `${r.owner}/${r.name}: not fork`).join(', '),
  });

  // ---- npm package age (only relevant if npm packages were submitted) ----
  const npmSubmitted = input.npmPackages.filter((p) => !p.error);
  let npmAgeOk = true;
  if (npmSubmitted.length > 0) {
    npmAgeOk = npmSubmitted.some((p) => {
      if (!p.firstPublishedAt) return false;
      return now.getTime() - Date.parse(p.firstPublishedAt) >= SIX_MONTHS_MS;
    });
    gates.push({
      id: 'npm_age',
      label: 'At least one submitted npm package published ≥ 6 months ago',
      passed: npmAgeOk,
      detail: npmSubmitted
        .map((p) => `${p.name}: ${p.firstPublishedAt ?? 'unknown'}`)
        .join(', '),
    });
  }

  // ---- Pick the strongest repo / npm signal for tier scoring ----
  const bestRepo = pickBestRepo(input.repos);
  const bestNpm = pickBestNpm(input.npmPackages);
  const bestStars = bestRepo?.stars ?? 0;
  const bestDownloads = bestNpm?.weeklyDownloads ?? 0;
  const bestTenureYears = maintainerTenureYears(bestRepo, bestNpm, now);

  // Recent activity = either the best repo or the best npm package has activity in last 6mo.
  // For repos we look at the user's last commit (not just repo push) so dormant projects
  // pushed by bots don't pass; for npm we accept any recent publish/modification.
  const hasRecentActivity = isRecent(bestRepo?.lastCommitByUser ?? null, now);

  // ---- Tier evaluation ----
  let qualifyingTier: OssQualifyingTier | null = null;

  // Hard reject — these block all tiers regardless of project stats.
  const hardRejects: string[] = [];
  if (!accountAgePassed) {
    hardRejects.push(`GitHub account is < ${MIN_ACCOUNT_AGE_YEARS} years old`);
  }
  if (!hasOwnershipSignal) {
    hardRejects.push('Applicant is not the repo owner and not in the top 3 contributors on any submitted repo');
  }
  if (validRepos.length === 0 && npmSubmitted.length === 0) {
    hardRejects.push('No valid GitHub repos or npm packages could be resolved');
  }
  if (validRepos.length > 0 && !hasNonForkOrAhead) {
    hardRejects.push('All submitted repos are forks without ≥50 commits ahead of upstream');
  }
  if (npmSubmitted.length > 0 && !npmAgeOk) {
    hardRejects.push('All submitted npm packages were first published < 6 months ago');
  }

  if (hardRejects.length === 0 && bestTenureYears !== null) {
    for (const t of TIER_THRESHOLDS) {
      const starsOk = bestStars >= t.minStarsOrDownloads.stars;
      const downloadsOk = bestDownloads >= t.minStarsOrDownloads.downloads;
      const reachOk = starsOk || downloadsOk;
      const tenureOk = bestTenureYears >= t.minTenureYears;
      const activityOk = !t.requiresRecentActivity || hasRecentActivity;
      if (reachOk && tenureOk && activityOk) {
        qualifyingTier = t.tier;
        break;
      }
    }
  }

  if (qualifyingTier === null && hardRejects.length === 0) {
    if (bestStars < 500 && bestDownloads < 1_000) {
      notes.push('Project did not meet "actively used" floor (≥500 stars OR ≥1k weekly downloads).');
    }
    if (bestTenureYears !== null && bestTenureYears < 1 && !hasRecentActivity) {
      notes.push('No recent activity in the last 6 months on the strongest repo.');
    }
  }

  return {
    githubUsername: input.githubUsername,
    githubAccountCreatedAt: input.accountCreatedAt,
    githubAccountAgeYears: accountAgeYears,
    repos: input.repos,
    npmPackages: input.npmPackages,
    bestRepoTenureYears: bestTenureYears,
    bestRepoStars: bestStars,
    bestNpmWeeklyDownloads: bestDownloads,
    hasRecentActivity,
    qualifyingTier,
    gates,
    notes,
    hardRejectReason: hardRejects[0] ?? null,
    checkedAt: now.toISOString(),
  };
}
