/**
 * Verification ↔ Ticket matching
 * Cross-references student/unemployed verification requests against purchased
 * tickets so admins can see who completed their purchase and who needs a
 * follow-up nudge.
 *
 * Matching is authoritative via stripe_session_id (written back by the Stripe
 * webhook when a payment-link checkout carrying verification_id completes) and
 * falls back to case-insensitive email matching for purchases made before the
 * webhook linkage existed or outside the payment link.
 */

export interface VerificationForMatching {
  id: string;
  email: string;
  /** 'pending' | 'approved' | 'rejected' — plain string to match the generated DB row type */
  status: string;
  stripe_session_id: string | null;
}

export interface TicketForMatching {
  id: string;
  email: string | null;
  status: string;
  ticket_category: string | null;
  stripe_session_id: string | null;
  created_at: string;
}

export type TicketMatchSource = 'session' | 'email';

export interface VerificationTicketMatch {
  purchased: boolean;
  matched_by: TicketMatchSource | null;
  ticket_id: string | null;
  ticket_category: string | null;
  purchased_at: string | null;
}

export type FollowUpStatus =
  | 'purchased'
  | 'needs_follow_up'
  | 'awaiting_review'
  | 'not_applicable';

const NO_MATCH: VerificationTicketMatch = {
  purchased: false,
  matched_by: null,
  ticket_id: null,
  ticket_category: null,
  purchased_at: null,
};

const DISCOUNT_CATEGORIES = new Set(['student', 'unemployed']);

function isDiscountCategory(category: string | null): boolean {
  return category !== null && DISCOUNT_CATEGORIES.has(category);
}

function toMatch(ticket: TicketForMatching, matchedBy: TicketMatchSource): VerificationTicketMatch {
  return {
    purchased: true,
    matched_by: matchedBy,
    ticket_id: ticket.id,
    ticket_category: ticket.ticket_category,
    purchased_at: ticket.created_at,
  };
}

/**
 * Find the ticket purchase (if any) for a single verification request.
 * Only confirmed tickets count — pending, cancelled, and refunded do not.
 */
export function matchVerificationToTickets(
  verification: VerificationForMatching,
  tickets: TicketForMatching[]
): VerificationTicketMatch {
  const confirmed = tickets.filter((t) => t.status === 'confirmed');

  if (verification.stripe_session_id) {
    const bySession = confirmed.find(
      (t) => t.stripe_session_id === verification.stripe_session_id
    );
    if (bySession) return toMatch(bySession, 'session');
  }

  const email = verification.email.trim().toLowerCase();
  const byEmail = confirmed
    .filter((t) => t.email?.trim().toLowerCase() === email)
    .sort((a, b) => {
      // Prefer discounted-category tickets, then the most recent purchase
      const aDiscount = isDiscountCategory(a.ticket_category) ? 0 : 1;
      const bDiscount = isDiscountCategory(b.ticket_category) ? 0 : 1;
      if (aDiscount !== bDiscount) return aDiscount - bDiscount;
      return b.created_at.localeCompare(a.created_at);
    });

  if (byEmail.length > 0) return toMatch(byEmail[0], 'email');

  return NO_MATCH;
}

/**
 * Derive the follow-up state shown to admins.
 * Only approved-but-unpurchased requests need action.
 */
export function getFollowUpStatus(
  verificationStatus: string,
  match: VerificationTicketMatch
): FollowUpStatus {
  if (match.purchased) return 'purchased';
  if (verificationStatus === 'approved') return 'needs_follow_up';
  if (verificationStatus === 'pending') return 'awaiting_review';
  return 'not_applicable';
}

/**
 * Enrich verification rows with their ticket match + follow-up status.
 */
export function enrichVerificationsWithTickets<V extends VerificationForMatching>(
  verifications: V[],
  tickets: TicketForMatching[]
): Array<V & { ticket_match: VerificationTicketMatch; follow_up_status: FollowUpStatus }> {
  return verifications.map((verification) => {
    const ticket_match = matchVerificationToTickets(verification, tickets);
    return {
      ...verification,
      ticket_match,
      follow_up_status: getFollowUpStatus(verification.status, ticket_match),
    };
  });
}
