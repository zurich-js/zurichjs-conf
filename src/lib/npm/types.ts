/**
 * Public npm impact shapes returned to the speaker page and the API route.
 *
 * These are stable on the wire — bump them carefully if the client UI relies
 * on a field.
 */

export interface NpmPackageImpact {
  name: string;
  description: string | null;
  weekly_downloads: number;
  repository_url: string | null;
  npm_url: string;
  last_publish: string | null;
  /** True when the speaker is the registered maintainer; false for declared contributions. */
  is_maintained: boolean;
}

export interface NpmImpactTotals {
  package_count: number;
  weekly_downloads: number;
}

export interface SpeakerNpmImpact {
  speaker_slug: string;
  npm_username: string;
  packages: NpmPackageImpact[];
  top_packages: NpmPackageImpact[];
  totals: NpmImpactTotals;
  fetched_at: string;
  is_stale: boolean;
}
