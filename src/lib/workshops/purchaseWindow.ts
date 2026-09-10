/**
 * Workshop purchase window.
 *
 * Seats can be bought right up until the workshop starts (Zurich local time).
 * Once the scheduled start has passed, the offering is treated as closed for
 * sale: the public UI hides the buy CTA and checkout validation rejects it.
 *
 * Pure — no DB access — so it is safe to call from API routes and the Stripe
 * checkout validation path alike.
 */

import { zurichWallClockToUtc } from '@/lib/time/zurich';

export interface WorkshopPurchaseWindowInput {
  /** `YYYY-MM-DD` in Zurich local time. */
  date: string | null;
  /** `HH:MM[:SS]` in Zurich local time. */
  start_time: string | null;
}

export const WORKSHOP_SALES_CLOSED_MESSAGE = 'Sales closed';

/**
 * The instant after which the workshop can no longer be purchased.
 *
 * - date + start_time → the workshop's start.
 * - date only         → end of that day (the schedule is incomplete, but we
 *                        still must not sell a workshop that already happened).
 * - no date           → `null`: nothing to gate on, sales stay open.
 */
export function getWorkshopPurchaseCloseDate(
  workshop: WorkshopPurchaseWindowInput
): Date | null {
  if (!workshop.date) return null;
  if (workshop.start_time) {
    return zurichWallClockToUtc(workshop.date, workshop.start_time);
  }
  return zurichWallClockToUtc(workshop.date, '23:59:59');
}

/**
 * True once the workshop's scheduled start (Zurich time) is in the past.
 */
export function isWorkshopPurchaseClosed(
  workshop: WorkshopPurchaseWindowInput,
  now: Date = new Date()
): boolean {
  const closesAt = getWorkshopPurchaseCloseDate(workshop);
  if (!closesAt) return false;
  return now.getTime() >= closesAt.getTime();
}
