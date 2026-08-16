/**
 * Discount Cookie Helpers (client-side)
 *
 * Manages the client-readable dismissed-state cookie.
 * httpOnly cookies (discount_code, discount_expires_at) are managed by the API routes.
 *
 * A single cookie records the dismissal, and its *value* records how far the
 * visitor got — which is what decides how long the popup stays suppressed:
 *
 * - `1`       — dismissed before a code existed (email gate), or a legacy
 *               dismissal from before this value existed. The offer still
 *               stands, so we may re-ask on a later visit.
 * - `code`    — dismissed while holding a live code. Same short window; the
 *               code remains redeemable until it expires.
 * - `expired` — dismissed *and* the offer ran out. The visitor closed the
 *               popup and let the code die, so the popup never comes back.
 */

import { COOKIE_NAMES } from './config';

/** How long a dismissal suppresses the popup while the offer is still live */
const DISMISSED_MAX_AGE_SECONDS = 24 * 3600;
/** A dismissal that outlived its offer — suppressed for a full conference cycle */
const DISMISSED_EXPIRED_MAX_AGE_SECONDS = 365 * 24 * 3600;

const DISMISSED_GATE_VALUE = '1';
const DISMISSED_WITH_CODE_VALUE = 'code';
const DISMISSED_EXPIRED_VALUE = 'expired';

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** True for any dismissal, whichever stage it happened at. */
export function hasDismissedCookie(): boolean {
  return Boolean(getCookie(COOKIE_NAMES.DISMISSED));
}

/** True when the visitor dismissed the popup while holding a live code. */
export function hasDismissedWithCode(): boolean {
  return getCookie(COOKIE_NAMES.DISMISSED) === DISMISSED_WITH_CODE_VALUE;
}

/** True when the dismissal already outlived its offer — never pop up again. */
export function hasDismissedExpiredOffer(): boolean {
  return getCookie(COOKIE_NAMES.DISMISSED) === DISMISSED_EXPIRED_VALUE;
}

export function setDismissedCookie(hasCode = false): void {
  // Dismissed state lasts until the discount expires (max 24h as fallback)
  setCookie(
    COOKIE_NAMES.DISMISSED,
    hasCode ? DISMISSED_WITH_CODE_VALUE : DISMISSED_GATE_VALUE,
    DISMISSED_MAX_AGE_SECONDS
  );
}

/**
 * Records that a dismissed offer has since expired. The visitor said no and
 * then let the code run out — two signals — so the popup stays suppressed long
 * past the offer window instead of being cleared and re-triggering.
 */
export function setExpiredDismissalCookie(): void {
  setCookie(COOKIE_NAMES.DISMISSED, DISMISSED_EXPIRED_VALUE, DISMISSED_EXPIRED_MAX_AGE_SECONDS);
}

export function clearDiscountCookies(): void {
  deleteCookie(COOKIE_NAMES.DISMISSED);
}
