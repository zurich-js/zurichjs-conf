/**
 * High-level OSS maintainer verification — orchestrates GitHub + npm fetches
 * and produces the full auto-check result.
 */

import { fetchUser, buildRepoSignal } from './github';
import { buildNpmSignal } from './npm';
import { scoreOssMaintainer } from './tier';
import type { OssAutoCheckResult } from './types';

interface RunInput {
  githubUsername: string;
  repos: string[];
  npmPackages: string[];
}

/**
 * Run the full verification pipeline. Always resolves — failures are surfaced
 * on the result (per-signal `error` fields, `hardRejectReason`).
 */
export async function runOssVerification(input: RunInput): Promise<OssAutoCheckResult> {
  const user = await fetchUser(input.githubUsername);
  const accountCreatedAt = user?.created_at ?? null;
  const canonicalUsername = user?.login ?? input.githubUsername;

  const [repoSignals, npmSignals] = await Promise.all([
    Promise.all(input.repos.map((r) => buildRepoSignal(r, canonicalUsername))),
    Promise.all(input.npmPackages.map((p) => buildNpmSignal(p, canonicalUsername))),
  ]);

  const result = scoreOssMaintainer({
    githubUsername: canonicalUsername,
    accountCreatedAt,
    repos: repoSignals.filter((r): r is NonNullable<typeof r> => r !== null),
    npmPackages: npmSignals.filter((p): p is NonNullable<typeof p> => p !== null),
  });

  // Special case: user not found on GitHub at all.
  if (!user) {
    return {
      ...result,
      hardRejectReason: result.hardRejectReason ?? 'GitHub user not found',
    };
  }

  return result;
}
