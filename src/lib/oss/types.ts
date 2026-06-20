/**
 * Types for OSS maintainer verification
 */

export type OssQualifyingTier = 1 | 2 | 3 | 4;

export type OssTicketTier = 'standard' | 'vip';

/**
 * Discount percent applied at each qualifying tier.
 * 1 = top tier (biggest discount).
 */
export const OSS_TIER_DISCOUNT: Record<OssQualifyingTier, number> = {
  1: 80,
  2: 60,
  3: 40,
  4: 20,
};

export const OSS_TIER_LABEL: Record<OssQualifyingTier, string> = {
  1: 'Core maintainer',
  2: 'Established maintainer',
  3: 'Growing maintainer',
  4: 'Emerging maintainer',
};

/**
 * Repo signal collected from GitHub for a single submitted repo.
 * `error` is populated when we couldn't fetch it (404, rate-limited, etc.).
 */
export interface OssRepoSignal {
  owner: string;
  name: string;
  url: string;
  stars: number;
  isFork: boolean;
  forkAheadBy: number | null;
  defaultBranch: string | null;
  firstCommitByUser: string | null;
  lastCommitByUser: string | null;
  commitsByUser: number;
  topContributors: string[];
  isTopContributor: boolean;
  isOwner: boolean;
  pushedAt: string | null;
  error?: string;
}

/**
 * npm package signal collected from the npm registry.
 */
export interface OssNpmSignal {
  name: string;
  weeklyDownloads: number;
  firstPublishedAt: string | null;
  isMaintainer: boolean;
  maintainers: string[];
  error?: string;
}

/**
 * Per-gate evaluation result, surfaced to admins so they can see exactly which
 * thresholds an application cleared.
 */
export interface OssGateResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface OssAutoCheckResult {
  githubUsername: string;
  githubAccountCreatedAt: string | null;
  githubAccountAgeYears: number | null;
  repos: OssRepoSignal[];
  npmPackages: OssNpmSignal[];
  bestRepoTenureYears: number | null;
  bestRepoStars: number;
  bestNpmWeeklyDownloads: number;
  hasRecentActivity: boolean;
  qualifyingTier: OssQualifyingTier | null;
  gates: OssGateResult[];
  notes: string[];
  /**
   * Strong reject reason — used to surface immediate "you don't qualify" feedback
   * without storing a request the admin would have to reject manually.
   * (We still store the request — but surface this to the user.)
   */
  hardRejectReason: string | null;
  checkedAt: string;
}

export interface OssMaintainerSubmission {
  name: string;
  email: string;
  githubUsername: string;
  repos: string[];
  npmPackages: string[];
  ticketTier: OssTicketTier;
  priceId: string;
  additionalInfo?: string;
}
