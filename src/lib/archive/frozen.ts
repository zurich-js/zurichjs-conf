/**
 * Frozen 2026 data.
 *
 * The archive renders entirely from the snapshot in `src/data/archive-2026/`,
 * produced once by `pnpm archive:freeze`. Nothing here touches Supabase, Stripe
 * or any network service — that is the whole point of the archive, and the
 * reason the published site costs nothing to keep online.
 *
 * These JSON imports are inlined at build time and only ever read from
 * `getStaticProps`, so they never reach the browser bundle. Client-side code
 * that still wants this data fetches the mirrored copies under `/archive/*.json`
 * (see `@/lib/archive/urls`).
 */

import blueskySnapshot from '@/data/archive-2026/bluesky.json';
import communityPartnersSnapshot from '@/data/archive-2026/community-partners.json';
import manifestSnapshot from '@/data/archive-2026/manifest.json';
import networkingSnapshot from '@/data/archive-2026/networking.json';
import scheduleSnapshot from '@/data/archive-2026/schedule.json';
import speakersSnapshot from '@/data/archive-2026/speakers.json';
import sponsorsSnapshot from '@/data/archive-2026/sponsors.json';
import workshopsSnapshot from '@/data/archive-2026/workshops.json';

import type { BlueskyFeedResult } from '@/lib/bluesky/types';
import type { PublicCommunityPartner } from '@/lib/partnerships/public';
import type { PublicSpeaker } from '@/lib/types/cfp';
import type { PublicNetworkingProfile } from '@/lib/types/networking';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
import type { PublicSponsor } from '@/lib/types/sponsorship';

/** The edition this build archives. */
export const ARCHIVE_YEAR = 2026;

export interface ArchiveManifest {
  year: number;
  /** ISO timestamp of the snapshot run, or null if it has not run yet. */
  frozenAt: string | null;
  contactLinksIncluded: boolean;
  counts: Record<string, number>;
}

export interface FrozenSpeakers {
  speakers: PublicSpeaker[];
  programSpeakerCount: number;
}

export interface FrozenWorkshops {
  items: PublicProgramScheduleItem[];
  /** Always empty: 2026 workshops are program history, not on sale. */
  offeringsBySubmissionId: Record<string, never>;
}

// A snapshot is data, not code, so TypeScript can only infer the shape of
// whatever placeholder is checked in. The casts assert the contract that
// `scripts/freeze-2026.ts` writes; `pnpm archive:verify` checks it for real.
export const archiveManifest = manifestSnapshot as unknown as ArchiveManifest;

export function getFrozenSpeakers(): FrozenSpeakers {
  return speakersSnapshot as unknown as FrozenSpeakers;
}

export function getFrozenScheduleItems(): PublicProgramScheduleItem[] {
  return scheduleSnapshot as unknown as PublicProgramScheduleItem[];
}

export function getFrozenSponsors(): PublicSponsor[] {
  return sponsorsSnapshot as unknown as PublicSponsor[];
}

export function getFrozenCommunityPartners(): PublicCommunityPartner[] {
  return communityPartnersSnapshot as unknown as PublicCommunityPartner[];
}

export function getFrozenWorkshops(): FrozenWorkshops {
  return workshopsSnapshot as unknown as FrozenWorkshops;
}

/**
 * Community chatter as it stood when the archive was cut. The live pages hit
 * the Bluesky API at build time; an archive must not depend on a third-party
 * service still being up (or still returning the same posts) years later.
 */
export function getFrozenBlueskyFeed(): BlueskyFeedResult {
  return blueskySnapshot as unknown as BlueskyFeedResult;
}

export function getFrozenNetworkingProfiles(): PublicNetworkingProfile[] {
  return networkingSnapshot as unknown as PublicNetworkingProfile[];
}

/** Look up one archived share card by its public id, e.g. `speaker-jane-doe`. */
export function findFrozenNetworkingProfile(
  publicId: string
): PublicNetworkingProfile | null {
  return getFrozenNetworkingProfiles().find((p) => p.publicId === publicId) ?? null;
}

/** All talk/panel/keynote sessions across the archived speakers, deduplicated. */
export function getFrozenSessions() {
  const seen = new Set<string>();
  return getFrozenSpeakers()
    .speakers.flatMap((speaker) => speaker.sessions)
    .filter((session) => {
      if (seen.has(session.slug)) return false;
      seen.add(session.slug);
      return true;
    });
}
