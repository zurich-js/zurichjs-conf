import { describe, it, expect } from 'vitest';
import { scoreOssMaintainer } from '../tier';
import type { OssNpmSignal, OssRepoSignal } from '../types';

const NOW = new Date('2026-05-18T00:00:00Z');

function yearsAgo(years: number, fromMonths = 0): string {
  const d = new Date(NOW);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCMonth(d.getUTCMonth() - fromMonths);
  return d.toISOString();
}

function makeRepo(overrides: Partial<OssRepoSignal>): OssRepoSignal {
  return {
    owner: 'janedoe',
    name: 'cool-lib',
    url: 'https://github.com/janedoe/cool-lib',
    stars: 0,
    isFork: false,
    forkAheadBy: null,
    defaultBranch: 'main',
    firstCommitByUser: yearsAgo(3),
    lastCommitByUser: yearsAgo(0, 1), // 1 month ago = recent
    commitsByUser: 200,
    topContributors: ['janedoe'],
    isTopContributor: true,
    isOwner: true,
    pushedAt: yearsAgo(0, 1),
    ...overrides,
  };
}

function makeNpm(overrides: Partial<OssNpmSignal>): OssNpmSignal {
  return {
    name: 'cool-lib',
    weeklyDownloads: 0,
    firstPublishedAt: yearsAgo(3),
    isMaintainer: true,
    maintainers: ['janedoe'],
    ...overrides,
  };
}

describe('scoreOssMaintainer', () => {
  it('awards T1 (80% off) for ≥10k stars + ≥3y tenure + recent activity', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(8),
      repos: [makeRepo({ stars: 15_000 })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBe(1);
    expect(result.hardRejectReason).toBeNull();
  });

  it('awards T2 (60% off) for 5k stars + ≥2y tenure', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(6),
      repos: [makeRepo({ stars: 5_000, firstCommitByUser: yearsAgo(2, 6) })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBe(2);
  });

  it('awards T3 (40% off) for 800 stars + ≥1y tenure', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 800, firstCommitByUser: yearsAgo(1, 1) })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBe(3);
  });

  it('awards T4 (20% off) for 600 stars + <1y tenure but still meets floor', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(4),
      repos: [makeRepo({ stars: 600, firstCommitByUser: yearsAgo(0, 6), lastCommitByUser: yearsAgo(0, 1) })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBe(4);
  });

  it('returns null tier (below floor) when both stars and downloads are too low', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 30 })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toBeNull();
    expect(result.notes.join(' ')).toMatch(/floor/);
  });

  it('uses npm weekly downloads as alternate reach signal', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 100 })],
      npmPackages: [makeNpm({ weeklyDownloads: 50_000 })],
      now: NOW,
    });

    // 50k downloads → T2 reach. 3y tenure on repo qualifies.
    expect(result.qualifyingTier).toBe(2);
  });

  it('hard rejects when GitHub account is < 2 years old', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(1),
      repos: [makeRepo({ stars: 50_000 })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toMatch(/< 2 years/);
  });

  it('hard rejects when applicant is not owner or top contributor', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [
        makeRepo({
          stars: 50_000,
          isOwner: false,
          isTopContributor: false,
          topContributors: ['other1', 'other2', 'other3'],
        }),
      ],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toMatch(/top 3 contributors/);
  });

  it('hard rejects forks without 50+ commits ahead', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 50_000, isFork: true, forkAheadBy: 3 })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toMatch(/forks/);
  });

  it('accepts forks with 50+ commits ahead', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 50_000, isFork: true, forkAheadBy: 80 })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.hardRejectReason).toBeNull();
    expect(result.qualifyingTier).toBe(1);
  });

  it('hard rejects when no submitted repo could be resolved AND no npm', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ error: 'Repository not found or inaccessible' })],
      npmPackages: [],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toBeTruthy();
  });

  it('hard rejects when submitted npm packages are all < 6 months old', () => {
    // Give it a valid repo so we pass ownership / commit / fork gates, then
    // ensure the npm age gate is what fails.
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 1_000 })],
      npmPackages: [makeNpm({ weeklyDownloads: 50_000, firstPublishedAt: yearsAgo(0, 2) })],
      now: NOW,
    });

    expect(result.qualifyingTier).toBeNull();
    expect(result.hardRejectReason).toMatch(/published < 6 months/);
  });

  it('T3 requires recent activity (last commit in last 6 months)', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [
        makeRepo({
          stars: 800,
          firstCommitByUser: yearsAgo(2),
          lastCommitByUser: yearsAgo(2), // 2 years ago = not recent
        }),
      ],
      npmPackages: [],
      now: NOW,
    });

    // Without recent activity we drop to T4 (which doesn't require it).
    expect(result.qualifyingTier).toBe(4);
  });

  it('records the strongest reach signal regardless of which signal wins the tier', () => {
    const result = scoreOssMaintainer({
      githubUsername: 'janedoe',
      accountCreatedAt: yearsAgo(5),
      repos: [makeRepo({ stars: 1_500 })],
      npmPackages: [makeNpm({ weeklyDownloads: 250_000 })],
      now: NOW,
    });

    expect(result.bestRepoStars).toBe(1_500);
    expect(result.bestNpmWeeklyDownloads).toBe(250_000);
    expect(result.qualifyingTier).toBe(1);
  });
});
