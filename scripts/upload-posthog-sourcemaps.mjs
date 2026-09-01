#!/usr/bin/env node
/**
 * Upload build source maps to PostHog Error Tracking.
 *
 * Runs as `postbuild`, so every production deploy ships symbolicated stacks:
 * without this, a production issue is titled by a minified frame in
 * `_07mq12s._.js` and cannot be read. `posthog-cli sourcemap process` injects a
 * chunk id into each bundle + map pair, then uploads the maps; the injected ids
 * persist into the deployed files, which is how PostHog matches a runtime stack
 * to the right map.
 *
 * Credentials (set in Vercel project env, NOT in the repo):
 * - POSTHOG_CLI_API_KEY  — personal API key (phx_…) with error-tracking write scope.
 * - POSTHOG_CLI_PROJECT_ID — the PostHog project id (56167).
 *
 * Skips silently when the credentials are absent, so local builds, CI checks
 * and the pre-commit build hook neither fail nor upload anything.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const apiKey = process.env.POSTHOG_CLI_API_KEY;
const projectId = process.env.POSTHOG_CLI_PROJECT_ID;

if (!apiKey || !projectId) {
  console.log(
    '[posthog-sourcemaps] POSTHOG_CLI_API_KEY / POSTHOG_CLI_PROJECT_ID not set — skipping upload.'
  );
  process.exit(0);
}

const buildDir = join(root, '.next');
if (!existsSync(buildDir)) {
  console.error('[posthog-sourcemaps] .next not found — run this after `next build`.');
  process.exit(1);
}

// EU project (eu.posthog.com/project/56167). Overridable for a region move.
const host = process.env.POSTHOG_CLI_HOST || 'https://eu.posthog.com';

// Tie the upload to the deploy that produced it, so PostHog can say which
// release introduced an issue. Vercel injects the commit SHA at build time.
const releaseArgs = process.env.VERCEL_GIT_COMMIT_SHA
  ? ['--release-name', 'zurichjs-conf', '--release-version', process.env.VERCEL_GIT_COMMIT_SHA]
  : [];

function runCli(args) {
  const result = spawnSync(join(root, 'node_modules', '.bin', 'posthog-cli'), args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      POSTHOG_CLI_API_KEY: apiKey,
      POSTHOG_CLI_PROJECT_ID: projectId,
    },
  });

  if (result.status !== 0) {
    // Fail the build loudly: a deploy that silently loses its source maps turns
    // the next incident's stack traces back into minified noise.
    console.error(`[posthog-sourcemaps] \`posthog-cli ${args.join(' ')}\` failed.`);
    process.exit(result.status ?? 1);
  }
}

// Inject chunk ids into the bundles (persists into the deployed files), then
// upload the maps and DELETE them from the build output — the deploy must not
// publicly serve /_next/static/**.map with the original source.
runCli(['--host', host, 'sourcemap', 'inject', '--directory', buildDir]);
runCli([
  '--host',
  host,
  'sourcemap',
  'upload',
  '--directory',
  buildDir,
  '--delete-after',
  ...releaseArgs,
]);

console.log('[posthog-sourcemaps] Source maps uploaded.');
