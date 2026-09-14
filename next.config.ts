import type { NextConfig } from "next";

/**
 * ZurichJS Conf 2026 — archive build.
 *
 * `output: 'export'` emits a directory of flat HTML/CSS/JS into `out/` with no
 * Node server, no API routes and no revalidation. That is the whole point: the
 * 2026 edition is frozen, so it can be served from any static host for free and
 * never calls Supabase, Stripe or Resend again.
 *
 * Things deliberately absent, because a static export cannot serve them:
 * - `rewrites()` — the /ingest PostHog proxy; the client now talks to PostHog
 *   directly (see src/pages/_app.tsx).
 * - `headers()` — the door-station Permissions-Policy; /checkin is gone.
 * - `withSentryConfig` — no server to report from, and no one on call.
 * - `outputFileTracingIncludes` — that traced the badge-export API route.
 */
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,

  images: {
    // Static export has no image optimizer. Every image the archive references
    // was pulled into public/archive/img/ by scripts/freeze-2026.ts, so these
    // are same-origin files served straight off the CDN — which is also what
    // keeps Supabase Storage egress at zero.
    unoptimized: true,
  },

  // PostHog keys are still inlined so the archive reports traffic. Everything
  // else the live site exposed (Stripe, Supabase) is gone with the API routes.
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
};

export default nextConfig;
