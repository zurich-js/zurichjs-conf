/**
 * Build-time generator for speaker Open Graph images.
 *
 * Renders one static PNG per visible speaker into `public/og/speakers/{slug}.png`
 * so the speaker pages can point their `og:image` at a static asset (served
 * straight from the CDN) instead of rendering on demand — which was too slow and
 * timed out social crawlers.
 *
 * Wired into the build via the `prebuild` npm script. To avoid taxing local
 * commits (pre-commit runs `pnpm build`), generation only runs on Vercel or when
 * `OG_GENERATE=1` is set. Run manually with:  OG_GENERATE=1 pnpm og:generate
 *
 * Failures never break the build: we log loudly and exit 0.
 */

import { readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'og', 'speakers');

/**
 * Load `.env.local` / `.env` for local runs without adding a dependency. On
 * Vercel the env vars are already in `process.env`, so the files are absent and
 * this is a no-op. Never overrides values already present in the environment.
 */
function loadLocalEnv(): void {
  for (const file of ['.env.local', '.env']) {
    let content: string;
    try {
      content = readFileSync(path.join(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] !== undefined) continue;
      let value = (match[2] ?? '').trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  const enabled = process.env.VERCEL === '1' || process.env.OG_GENERATE === '1';
  if (!enabled) {
    console.log('[og:generate] Skipping (not a Vercel build). Set OG_GENERATE=1 to force.');
    return;
  }

  loadLocalEnv();

  // Import after env is loaded so the Supabase client picks up the credentials.
  const { getVisibleSpeakersForOg } = await import('@/lib/cfp/speakers');
  const { renderSpeakerDetailOg } = await import('@/lib/og/program-images');
  const { renderOgToBuffer } = await import('@/lib/og/runtime-node');

  const speakers = await getVisibleSpeakersForOg();
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
