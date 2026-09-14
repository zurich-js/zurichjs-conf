/**
 * ZurichJS Conf 2026 — archive snapshot
 *
 * Run ONCE, against the production Supabase project, before the 2026 site is
 * retired. It dumps every public data source the site renders into static JSON
 * under `src/data/archive-2026/`, mirrors the browser-facing slices into
 * `public/archive/`, and pulls every Supabase Storage image into
 * `public/archive/img/` so the published archive never talks to Supabase again.
 *
 *   pnpm archive:freeze
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and NEXT_PUBLIC_BASE_URL
 * (picked up from `.env.local` if present).
 *
 * The snapshot is produced by the *same* helpers that rendered the live site
 * (`getVisibleSpeakersWithSessions`, `getPublicScheduleRows`, …) rather than by
 * re-implementing the queries, so the frozen output matches what was live on
 * the last day of the conference.
 *
 * Re-running overwrites the snapshot in place; it is idempotent apart from the
 * `frozenAt` timestamp in `manifest.json`.
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadLocalEnv } from './load-local-env';

import type { PublicNetworkingProfile } from '@/lib/types/networking';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

/**
 * Networking share pages carry attendee contact details. Names, headlines and
 * social profiles are archived; `mailto:` and `tel:` links are not.
 *
 * Attendees enabled a share card for the conference week, on a link handed out
 * in person — not for permanent publication on a crawlable domain where address
 * harvesters will find it. Archiving the card keeps the page meaningful without
 * turning the archive into a mailing list. Flip to `true` only with a deliberate
 * decision (and ideally fresh consent) behind it.
 */
const FREEZE_CONTACT_LINKS = false;

const ARCHIVE_YEAR = 2026;
const DATA_DIR = path.join(process.cwd(), 'src', 'data', `archive-${ARCHIVE_YEAR}`);
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'archive');
const IMG_DIR = path.join(PUBLIC_DIR, 'img');

/** Supabase Storage public-object URLs — the only remote images the site uses. */
const STORAGE_MARKER = '/storage/v1/object/public/';

/** Slices the browser fetches directly (TanStack Query on the client). */
const BROWSER_FACING = new Set(['speakers', 'sponsors', 'community-partners', 'workshops']);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// ---------------------------------------------------------------------------
// Image mirroring
// ---------------------------------------------------------------------------

/** Remote URL -> local `/archive/img/...` path, so each asset downloads once. */
const imageMap = new Map<string, string>();
const imageFailures: { url: string; reason: string }[] = [];

function localNameFor(url: string): string {
  const digest = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const ext = path.extname(new URL(url).pathname).toLowerCase() || '.bin';
  return `${digest}${ext}`;
}

/**
 * Download a Supabase Storage object into `public/archive/img/` and return the
 * path the archive should reference. Returns the original URL on failure so a
 * single dead asset cannot abort the whole snapshot — failures are reported at
 * the end and must be resolved before publishing.
 */
async function mirrorImage(url: string): Promise<string> {
  const cached = imageMap.get(url);
  if (cached) return cached;

  const name = localNameFor(url);
  const localPath = `/archive/img/${name}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path.join(IMG_DIR, name), bytes);
    imageMap.set(url, localPath);
    return localPath;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    imageFailures.push({ url, reason });
    imageMap.set(url, url);
    return url;
  }
}

/**
 * Walk an arbitrary JSON tree and swap every Supabase Storage URL for its
 * mirrored local path.
 *
 * Matching on the storage marker rather than on field names keeps this correct
 * as shapes change, and leaves ordinary outbound links (sponsor websites,
 * social profiles) untouched — they are not storage URLs.
 */
async function mirrorImagesIn<T extends Json>(value: T): Promise<T> {
  if (typeof value === 'string') {
    if (value.startsWith('http') && value.includes(STORAGE_MARKER)) {
      return (await mirrorImage(value)) as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    const out: Json[] = [];
    for (const entry of value) out.push(await mirrorImagesIn(entry));
    return out as T;
  }

  if (value && typeof value === 'object') {
    const out: Record<string, Json> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = await mirrorImagesIn(entry as Json);
    }
    return out as T;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

async function writeSlice(name: string, payload: unknown): Promise<number> {
  const mirrored = await mirrorImagesIn(payload as Json);
  const json = `${JSON.stringify(mirrored, null, 2)}\n`;

  await writeFile(path.join(DATA_DIR, `${name}.json`), json);
  if (BROWSER_FACING.has(name)) {
    await writeFile(path.join(PUBLIC_DIR, `${name}.json`), json);
  }

  const count = Array.isArray(mirrored)
    ? mirrored.length
    : (Object.values(mirrored as Record<string, unknown>).find(Array.isArray)?.length ?? 1);
  console.log(`  ✓ ${name}.json (${count} ${count === 1 ? 'entry' : 'entries'})`);
  return count;
}

async function main() {
  console.log(`\nFreezing ZurichJS Conf ${ARCHIVE_YEAR}…\n`);

  // Every `@/lib` module below reaches `@/config/env`, which throws at import
  // time when a required variable is missing — so the env has to be in place
  // before any of them load. Hence dynamic imports rather than top-level ones.
  loadLocalEnv();

  const [
    { getProgramSpeakerCount, getVisibleSpeakersWithSessions },
    { getPublicCommunityPartners },
    { buildPublicProgramScheduleItems, getPublicScheduleRows },
    { resolvePublicNetworkingProfile },
    { getPublicSponsors },
    { createServiceRoleClient },
  ] = await Promise.all([
    import('@/lib/cfp/speakers'),
    import('@/lib/partnerships/public'),
    import('@/lib/program/schedule'),
    import('@/lib/networking/profiles'),
    import('@/lib/sponsorship/sponsors'),
    import('@/lib/supabase/client'),
  ]);

  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });

  // Start from a clean image directory so assets dropped from the program do
  // not linger in the published archive.
  for (const entry of await readdir(IMG_DIR)) {
    if (entry === '.gitkeep') continue;
    await rm(path.join(IMG_DIR, entry), { force: true });
  }

  const [speakers, programSpeakerCount, scheduleRows, sponsors, communityPartners] =
    await Promise.all([
      getVisibleSpeakersWithSessions(),
      getProgramSpeakerCount(),
      getPublicScheduleRows(),
      getPublicSponsors(),
      getPublicCommunityPartners(),
    ]);

  const scheduleItems: PublicProgramScheduleItem[] = buildPublicProgramScheduleItems(
    scheduleRows,
    speakers
  );

  await writeSlice('speakers', { speakers, programSpeakerCount });
  await writeSlice('schedule', scheduleItems);
  await writeSlice('sponsors', sponsors);
  await writeSlice('community-partners', communityPartners);

  // Workshops were bookable through Stripe; in the archive they are program
  // history, so only the timeline is frozen and every offering is closed.
  await writeSlice('workshops', {
    items: scheduleItems.filter((item) => item.session_kind === 'workshop'),
    offeringsBySubmissionId: {},
  });

  // `resolvePublicNetworkingProfile` resolves one public id at a time; the
  // archive needs the whole set, so enumerate every share subject and resolve
  // each through the same code path the live page used.
  const supabase = createServiceRoleClient();
  const publicIds: string[] = speakers.map((speaker) => `speaker-${speaker.slug}`);

  const { data: shares, error: sharesError } = await supabase
    .from('networking_profiles')
    .select('share_id, subject_type');
  if (sharesError) throw new Error(`networking_profiles: ${sharesError.message}`);

  for (const share of shares ?? []) {
    if (!share.share_id) continue;
    if (share.subject_type === 'attendee') publicIds.push(`attendee-${share.share_id}`);
    if (share.subject_type === 'sponsor') publicIds.push(`sponsor-${share.share_id}`);
  }

  const { data: badges, error: badgesError } = await supabase
    .from('manual_badge_entries')
    .select('share_id');
  if (badgesError) throw new Error(`manual_badge_entries: ${badgesError.message}`);

  for (const badge of badges ?? []) {
    if (badge.share_id) publicIds.push(`badge-${badge.share_id}`);
  }

  const networking: PublicNetworkingProfile[] = [];
  for (const publicId of publicIds) {
    const profile = await resolvePublicNetworkingProfile(publicId);
    if (!profile) continue;

    networking.push(
      FREEZE_CONTACT_LINKS
        ? profile
        : {
            ...profile,
            links: profile.links.filter(
              (link) => link.kind !== 'email' && link.kind !== 'phone'
            ),
          }
    );
  }

  await writeSlice('networking', networking);

  await writeFile(
    path.join(DATA_DIR, 'manifest.json'),
    `${JSON.stringify(
      {
        year: ARCHIVE_YEAR,
        frozenAt: new Date().toISOString(),
        contactLinksIncluded: FREEZE_CONTACT_LINKS,
        counts: {
          speakers: speakers.length,
          scheduleItems: scheduleItems.length,
          sponsors: sponsors.length,
          communityPartners: communityPartners.length,
          networkingProfiles: networking.length,
          images: imageMap.size,
        },
      },
      null,
      2
    )}\n`
  );

  console.log(`\n  ✓ ${imageMap.size} images mirrored into public/archive/img/`);

  if (imageFailures.length > 0) {
    console.error(`\n  ✗ ${imageFailures.length} image(s) failed to download:`);
    for (const failure of imageFailures) {
      console.error(`    ${failure.url} — ${failure.reason}`);
    }
    console.error('\n  These still point at Supabase. Resolve them before publishing.\n');
    process.exitCode = 1;
    return;
  }

  console.log('\nSnapshot complete. Commit src/data/archive-2026/ and public/archive/.\n');
}

main().catch((error) => {
  console.error('\nFreeze failed:', error);
  process.exit(1);
});
