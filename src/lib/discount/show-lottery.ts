/**
 * Popup show lottery (client-side)
 *
 * Caps how often the discount popup is offered: only a share of visits draws it
 * at all. Keeping the offer scarce protects margin and stops the popup reading
 * as a permanent site-wide sale to anyone who browses more than one page.
 *
 * The roll is memoized per visit (same 30-minute session window the visit
 * tracker uses), so a reload or a second content page inside one visit doesn't
 * re-roll — the popup never blinks in and out on the same visitor. A genuinely
 * new visit draws again.
 *
 * Deliberately localStorage-based, like the visit tracker and ticket-holder
 * marker, so it works when analytics and cookies are blocked.
 */

/**
 * Default share of visits that are offered the popup. Applies to the standard
 * dwell-delay popup and the recurring-visitor offer; UTM lottery winners bypass
 * it entirely, since a QR code or flyer already promised them a discount.
 */
export const POPUP_SHOW_PROBABILITY = 0.3;

const SHOW_ROLL_STORAGE_KEY = 'zjs:discount:showRoll:v1';

interface ShowRollRecord {
  /** Visit number the roll was made for */
  visit: number;
  /** Whether that roll won */
  show: boolean;
}

function readRecord(): ShowRollRecord | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SHOW_ROLL_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as ShowRollRecord).visit === 'number' &&
      typeof (parsed as ShowRollRecord).show === 'boolean'
    ) {
      return parsed as ShowRollRecord;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Rolls the show lottery for the current visit and returns whether the popup
 * may be offered.
 *
 * Call from an effect (never during render) — it uses `Math.random()`, which
 * would desync SSR and client markup.
 *
 * @param visitCount - running visit number from `recordVisit()`; 0 when
 *   localStorage is unavailable, in which case the roll can't be remembered and
 *   each page load draws fresh.
 * @param probability - share of visits that win, 0-1. Defaults to
 *   `POPUP_SHOW_PROBABILITY`. Values outside the range are clamped.
 */
export function rollPopupShowLottery(
  visitCount: number,
  probability: number = POPUP_SHOW_PROBABILITY
): boolean {
  const clamped = Math.min(Math.max(Number.isFinite(probability) ? probability : 0, 0), 1);

  // Reuse this visit's decision so reloads and in-visit navigation are stable.
  if (visitCount > 0) {
    const existing = readRecord();
    if (existing?.visit === visitCount) return existing.show;
  }

  const show = Math.random() < clamped;

  if (visitCount > 0 && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        SHOW_ROLL_STORAGE_KEY,
        JSON.stringify({ visit: visitCount, show } satisfies ShowRollRecord)
      );
    } catch {
      // Quota / private mode — the in-memory answer still stands for this load.
    }
  }

  return show;
}
