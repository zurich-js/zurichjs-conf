/**
 * Ticket-holder marker (client-side)
 *
 * Buyers should never see the discount popup again — offering a discount to
 * someone who already paid full price is pure margin loss and bad feelings.
 *
 * Two complementary layers:
 * 1. A durable localStorage marker set on the purchase success page — works
 *    even when PostHog is blocked, and across sessions on the same browser.
 * 2. The `is_ticket_holder` PostHog person property (set alongside the
 *    marker) — used as a release-condition exclusion on the experiment flag,
 *    which also covers the same person on other devices once identified.
 */

import posthog from 'posthog-js';

const TICKET_HOLDER_STORAGE_KEY = 'zjs:ticketHolder:v1';

/** Returns true when this browser completed a ticket purchase. */
export function isKnownTicketHolder(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(TICKET_HOLDER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Marks this browser (and the identified PostHog person) as a ticket holder.
 * Call from the checkout success page once the purchase is confirmed.
 */
export function markTicketHolder(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TICKET_HOLDER_STORAGE_KEY, '1');
    } catch {
      // Storage unavailable (private mode / quota) — PostHog layer still applies.
    }
  }

  // posthog directly (not the analytics wrapper): the wrapper's lazy
  // `initialized` flag may not be set yet on the success page, which would
  // silently drop the person property.
  try {
    if (posthog.get_distinct_id()) {
      posthog.people.set({ is_ticket_holder: true });
    }
  } catch {
    // PostHog unavailable — the localStorage marker still suppresses the popup.
  }
}
