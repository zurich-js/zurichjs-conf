/**
 * Static snapshot URLs for the browser.
 *
 * The archive has no API routes, so client-side code reads the same snapshot
 * the pages were built from, served as flat files from `public/archive/`.
 * Written by `scripts/freeze-2026.ts`.
 */
export const ARCHIVE_JSON = {
  speakers: '/archive/speakers.json',
  sponsors: '/archive/sponsors.json',
  communityPartners: '/archive/community-partners.json',
  workshops: '/archive/workshops.json',
} as const;
