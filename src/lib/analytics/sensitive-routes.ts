/**
 * Sensitive route policy for analytics and session replay.
 *
 * Door check-in screens display attendee names, email addresses, apparel sizes
 * and workshop bookings, and their URLs carry a ticket UUID that is itself the
 * admission credential. Neither may reach a third-party processor:
 *
 *  - session replay must not record these screens at all;
 *  - the UUID must be stripped from any captured URL or path.
 *
 * The repo's own rules already require this — see src/lib/analytics/CLAUDE.md
 * and docs/ANALYTICS_AND_LOGGING.md — but nothing enforced it, because the only
 * route logic in _app.tsx was a NavBar check against /admin.
 */

/**
 * Route prefixes whose screens must never be recorded and whose paths must be
 * scrubbed before capture.
 *
 * `/validate` is the legacy QR landing page; `/checkin` is the door station.
 */
export const SENSITIVE_ROUTE_PREFIXES = ['/validate', '/checkin'] as const;

/** Placeholder substituted for an identifier in a captured path. */
export const SCRUBBED_SEGMENT = ':id';

const UUID_SEGMENT =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * Whether a pathname belongs to a screen that must not be recorded.
 *
 * Accepts a full URL or a bare path; anything unparseable is treated as
 * sensitive, so a parsing failure fails safe rather than starting a recording.
 */
export function isSensitiveRoute(pathnameOrUrl: string | undefined | null): boolean {
  if (!pathnameOrUrl) return false;

  let pathname = pathnameOrUrl;

  if (pathname.includes('://')) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return true;
    }
  }

  // Drop any query string or fragment before matching.
  pathname = pathname.split(/[?#]/)[0];

  return SENSITIVE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Replace every UUID in a path or URL with a placeholder.
 *
 * Applied unconditionally rather than only on sensitive routes: a ticket UUID
 * is an admission credential wherever it appears, and other routes
 * (/manage-order, /api/calendar/…) carry one too.
 */
export function scrubIdentifiers(pathnameOrUrl: string): string {
  return pathnameOrUrl.replace(UUID_SEGMENT, SCRUBBED_SEGMENT);
}
