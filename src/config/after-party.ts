/**
 * After Party Configuration
 * Venue capacity for the VIP after party (Sep 11). This is a planning number:
 * the admin view warns when the roster goes over it but nothing is blocked,
 * since light overbooking is allowed.
 */

export const AFTER_PARTY_CAPACITY = 90;

/** Fraction of capacity at which the admin view starts showing an amber warning */
export const AFTER_PARTY_WARNING_THRESHOLD = 0.85;
