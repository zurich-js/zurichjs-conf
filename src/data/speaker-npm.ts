/**
 * Curated speaker → npm identity map.
 *
 * POC: until the CFP speaker schema gains an `npm_username` field, we keep the
 * mapping here. Keys are the slug generated from `first_name-last_name` (see
 * `src/lib/cfp/speakers.ts`).
 *
 * `contributes_to` is for speakers who substantially contribute to a package
 * but are not the registered maintainer — we still surface those download
 * numbers because they reflect real open-source impact.
 *
 * Adding a speaker:
 *   1. Confirm the npm username (visit https://www.npmjs.com/~<username>).
 *   2. Verify the maintainer search returns expected packages:
 *      https://registry.npmjs.org/-/v1/search?text=maintainer:<username>
 *   3. Add the entry below. The slug must match the DB-generated speaker slug.
 */

export interface SpeakerNpmEntry {
  /** Lowercased `first-last` slug as produced by the speakers service. */
  slug: string;
  /** Registered npm maintainer username. Matches `maintainer:` search. */
  npm_username: string;
  /**
   * Packages the speaker contributes to substantially but does not maintain.
   * Use sparingly and only with the speaker's confirmation.
   */
  contributes_to?: string[];
}

export const SPEAKER_NPM_ENTRIES = [
  {
    slug: 'dominik-dorfmeister',
    npm_username: 'tkdodo',
  },
  {
    slug: 'mark-erikson',
    npm_username: 'acemarke',
  },
  {
    slug: 'daniel-roe',
    npm_username: 'danielroe',
  },
  {
    slug: 'alexander-lichter',
    npm_username: 'mannil',
  },
] as const satisfies readonly SpeakerNpmEntry[];

const SPEAKER_NPM_BY_SLUG: ReadonlyMap<string, SpeakerNpmEntry> = new Map(
  SPEAKER_NPM_ENTRIES.map((entry) => [entry.slug, entry]),
);

export function getSpeakerNpmEntry(slug: string): SpeakerNpmEntry | null {
  return SPEAKER_NPM_BY_SLUG.get(slug.toLowerCase()) ?? null;
}
