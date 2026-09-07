/**
 * Discount Pop-up Closure
 *
 * The discount offer only makes sense while there is still a ticket to sell.
 * From the conference day itself (11 September 2026) onwards the popup is off:
 * no email gate, no corner widget, and no new codes from the API.
 *
 * The cutoff is Zurich local midnight at the start of the 11th. September is
 * always CEST (UTC+2) — DST ends in late October — so the instant is pinned
 * directly instead of resolving an offset at runtime.
 */

/** Local date (Europe/Zurich) from which the popup is disabled — conference day. */
export const DISCOUNT_POPUP_CLOSE_DATE_ISO = '2026-09-11';

/** 2026-09-11T00:00:00 in Zurich (CEST, UTC+2). */
const DISCOUNT_POPUP_CLOSES_AT_MS = Date.UTC(2026, 8, 10, 22, 0, 0);

/** The instant the popup stops being offered. */
export function getDiscountPopupCloseDate(): Date {
  return new Date(DISCOUNT_POPUP_CLOSES_AT_MS);
}

/** True once the offer window has passed — the popup must not be shown. */
export function isDiscountPopupClosed(now: Date = new Date()): boolean {
  return now.getTime() >= DISCOUNT_POPUP_CLOSES_AT_MS;
}
