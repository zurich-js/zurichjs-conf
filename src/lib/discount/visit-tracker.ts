/**
 * Visit Tracker (client-side)
 *
 * Counts distinct visits in localStorage so the discount experiment can tell
 * a first-time visitor from a recurring one who keeps coming back without
 * buying. Visits less than SESSION_GAP_MS apart count as the same visit, so
 * client-side navigation and quick reloads don't inflate the count.
 *
 * Deliberately localStorage-based (not PostHog) so it works when analytics
 * is blocked, mirroring the ticket-holder marker.
 */

const VISIT_STORAGE_KEY = 'zjs:discount:visits:v1';

/** Two page loads more than 30 minutes apart count as separate visits. */
export const VISIT_SESSION_GAP_MS = 30 * 60 * 1000;

interface VisitRecord {
  count: number;
  lastVisitAt: number;
}

function readRecord(): VisitRecord | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VISIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as VisitRecord).count === 'number' &&
      typeof (parsed as VisitRecord).lastVisitAt === 'number'
    ) {
      return parsed as VisitRecord;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Records the current page load as a visit and returns the running total.
 * Call from an effect (never during render). Returns 0 when storage is
 * unavailable — callers treat that as "not a recurring visitor".
 */
export function recordVisit(now: number = Date.now()): number {
  if (typeof localStorage === 'undefined') return 0;

  const existing = readRecord();

  // Same session — refresh the timestamp so long sessions don't split.
  if (existing && now - existing.lastVisitAt < VISIT_SESSION_GAP_MS) {
    try {
      localStorage.setItem(
        VISIT_STORAGE_KEY,
        JSON.stringify({ count: existing.count, lastVisitAt: now })
      );
    } catch {
      // Quota / private mode — keep the in-memory answer.
    }
    return existing.count;
  }

  const next: VisitRecord = { count: (existing?.count ?? 0) + 1, lastVisitAt: now };
  try {
    localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return 0;
  }
  return next.count;
}

/** Current visit count without recording a new visit. */
export function getVisitCount(): number {
  return readRecord()?.count ?? 0;
}
