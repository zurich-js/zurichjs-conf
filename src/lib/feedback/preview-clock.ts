/**
 * Preview clock — rehearse conference day before it happens.
 *
 * Outside production, `/schedule?at=2026-09-11T07:30:00Z` renders the page as
 * if that were the current instant: default tab, "Live now" badges and which
 * cards carry a feedback form. The same instant is forwarded with feedback
 * submissions so the API's "has this session started?" check agrees with
 * what the tester sees. On the production deployment the parameter is
 * ignored everywhere, so nobody can open a form early by editing the URL.
 */

import { z } from 'zod';

export const PREVIEW_CLOCK_PARAM = 'at';

/**
 * The `at` query value: a single string (the first value wins if repeated)
 * that `Date` can parse into a plausible instant. Anything else is rejected so
 * the page quietly falls back to the real clock.
 */
const previewInstantSchema = z
  .union([z.string(), z.array(z.string()).nonempty()])
  .transform((value) => (Array.isArray(value) ? value[0] : value).trim())
  .pipe(z.string().min(1))
  .pipe(z.coerce.date())
  .refine((date) => {
    const year = date.getUTCFullYear();
    return year >= 2020 && year <= 2100;
  });

/** True on local dev and Vercel preview deployments, false on production. */
export function isClockPreviewAllowed(): boolean {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return vercelEnv !== 'production';
}

/** Parse a user-supplied instant, or null when it isn't one. */
export function parsePreviewInstant(value: unknown): Date | null {
  const result = previewInstantSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Resolve the instant to render for, honouring the override only where allowed. */
export function resolvePreviewInstant(value: unknown): Date | null {
  if (!isClockPreviewAllowed()) return null;
  return parsePreviewInstant(value);
}
