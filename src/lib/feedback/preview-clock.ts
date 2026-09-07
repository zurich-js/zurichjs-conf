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

export const PREVIEW_CLOCK_PARAM = 'at';

/** True on local dev and Vercel preview deployments, false on production. */
export function isClockPreviewAllowed(): boolean {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return vercelEnv !== 'production';
}

/**
 * Parse a user-supplied instant. Accepts any string `Date` understands, as
 * long as it lands in a plausible year — anything else yields null so the
 * page quietly falls back to the real clock.
 */
export function parsePreviewInstant(value: unknown): Date | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  if (year < 2020 || year > 2100) return null;
  return parsed;
}

/** Resolve the instant to render for, honouring the override only where allowed. */
export function resolvePreviewInstant(value: unknown): Date | null {
  if (!isClockPreviewAllowed()) return null;
  return parsePreviewInstant(value);
}
