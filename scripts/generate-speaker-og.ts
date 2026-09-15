/**
 * Build-time generator for speaker Open Graph images.
 *
 * Renders one static PNG per visible speaker into `public/og/speakers/{slug}.png`
 * so the speaker pages can point their `og:image` at a static asset (served
 * straight from the CDN) instead of rendering on demand — which was too slow and
 * timed out social crawlers.
 *
 * Wired into the build via the `prebuild` npm script. Renders from the frozen
 * 2026 snapshot, so it needs no credentials and produces the same output on any
 * host. Run manually with:  pnpm og:generate
 *
 * Failures never break the build: we log loudly and exit 0.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'og', 'speakers');

async function main(): Promise<void> {
  // Runs on every build, with no gate and no credentials. These images used to
  // come from Supabase, which meant an archive rebuilt after the project was
  // paused would silently lose every speaker card — and public/og/ is
  // gitignored, so there was no committed copy to fall back on. Reading the
  // frozen snapshot makes the output deterministic and host-independent.
  const { renderSpeakerDetailOg } = await import('@/lib/og/program-images');
  const { renderOgToBuffer } = await import('@/lib/og/runtime-node');
  const { getFrozenSpeakers } = await import('@/lib/archive/frozen');

  const speakers = getFrozenSpeakers().speakers.map((speaker) => ({
    slug: speaker.slug,
    first_name: speaker.first_name,
    last_name: speaker.last_name,
    job_title: speaker.job_title,
    company: speaker.company,
    profile_image_url: speaker.profile_image_url,
    portrait_foreground_url: speaker.portrait_foreground_url,
    portrait_background_url: speaker.portrait_background_url,
    updated_at: speaker.updated_at ?? '',
  }));
  console.log(`[og:generate] Rendering ${speakers.length} speaker OG image(s) → public/og/speakers/`);

  // Start clean so images for removed/renamed speakers don't linger.
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  let ok = 0;
  let failed = 0;
  for (const speaker of speakers) {
    try {
      const buffer = await renderOgToBuffer(renderSpeakerDetailOg({ speaker }));
      await writeFile(path.join(OUTPUT_DIR, `${speaker.slug}.png`), buffer);
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`[og:generate] Failed for "${speaker.slug}":`, error);
    }
  }

  console.log(`[og:generate] Done: ${ok} written, ${failed} failed.`);
}

main().catch((error) => {
  // Never fail the build — a missing image degrades to no card, not a broken deploy.
  console.error('[og:generate] Generation aborted:', error);
  process.exit(0);
});
