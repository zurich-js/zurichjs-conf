/**
 * Where the archive lives, and where the living conference moved to.
 *
 * The 2026 site was served from conf.zurichjs.com. That hostname now carries
 * the next edition, so the archive has its own permanent home and every
 * forward-looking call to action points back at conf.zurichjs.com rather than
 * at a dead in-archive route like `/#tickets` or `/sponsorship`.
 */

/** Canonical origin for the frozen 2026 site. Override per-deploy if needed. */
export const ARCHIVE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://2026.zurichjs.com';

/** The living conference — teaser and waitlist for the next edition. */
export const NEXT_EDITION_URL = 'https://conf.zurichjs.com';

/** Standard label for the "this event is over, here's the next one" CTA. */
export const NEXT_EDITION_CTA_LABEL = 'Join us at the next edition';
