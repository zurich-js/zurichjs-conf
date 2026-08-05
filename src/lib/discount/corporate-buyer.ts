/**
 * Corporate-buyer marker (client-side)
 *
 * Enterprise and team buyers pay out of a training budget: they are not price
 * sensitive, a discount nudge does nothing for their decision, and every offer
 * they see is margin we hand back for free. Once a browser is marked as a
 * corporate buyer the discount popup never opens for it again.
 *
 * Deliberately mirrors ticket-holder.ts, with the same two layers:
 * 1. A durable localStorage marker — works even when PostHog is blocked, and
 *    persists across sessions on the same browser.
 * 2. The `is_corporate_buyer` PostHog person property, so the same person is
 *    recognisable on other devices once identified, and so the segment can be
 *    excluded from discount analysis.
 *
 * Kept separate from the ticket-holder marker rather than reusing it: a
 * corporate buyer hasn't bought yet, and conflating the two would make
 * "bought a ticket" mean two different things in analytics.
 */

import posthog from 'posthog-js';

const CORPORATE_BUYER_STORAGE_KEY = 'zjs:corporateBuyer:v1';

/** Returns true when this browser has been marked as a corporate buyer. */
export function isCorporateBuyer(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(CORPORATE_BUYER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Marks this browser (and the identified PostHog person) as a corporate buyer.
 * Called from the corporate access page once the signed code is verified.
 *
 * @param label Free-text organisation label from the code, for analytics only.
 */
export function markCorporateBuyer(label?: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CORPORATE_BUYER_STORAGE_KEY, '1');
    } catch {
      // Storage unavailable (private mode / quota) — PostHog layer still applies.
    }
  }

  // posthog directly (not the analytics wrapper): the wrapper's lazy
  // `initialized` flag may not be set yet on a freshly opened link, which
  // would silently drop the person property.
  try {
    if (posthog.get_distinct_id()) {
      posthog.people.set({
        is_corporate_buyer: true,
        ...(label ? { corporate_buyer_label: label } : {}),
      });
    }
  } catch {
    // PostHog unavailable — the localStorage marker still suppresses the popup.
  }
}

/** Clears the marker. Exposed for support / QA, not used in the normal flow. */
export function clearCorporateBuyer(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CORPORATE_BUYER_STORAGE_KEY);
  } catch {
    // noop
  }
}
