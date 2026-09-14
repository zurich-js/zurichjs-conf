/**
 * Workshop offering shape.
 *
 * On the live site this was assembled from Stripe prices and registration
 * counts. The archive keeps the type so the shared scheduling components can
 * still be typed, but never populates it — 2026 workshops are program history,
 * not on sale, so `offeringsBySubmissionId` is always empty.
 */
export interface WorkshopOfferingSummary {
  workshopId: string;
  sessionId: string | null;
  cfpSubmissionId: string | null;
  slug: string;
  lookupKey: string;
  priceId: string;
  stripeProductId: string | null;
  unitAmount: number;
  currency: string;
  capacity: number;
  enrolledCount: number;
  capacityRemaining: number;
  soldOut: boolean;
  purchaseClosed: boolean;
  room: string | null;
  durationMinutes: number | null;
}
