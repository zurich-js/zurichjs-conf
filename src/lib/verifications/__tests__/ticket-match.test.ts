import { describe, it, expect } from 'vitest';
import {
  matchVerificationToTickets,
  getFollowUpStatus,
  enrichVerificationsWithTickets,
  type TicketForMatching,
  type VerificationForMatching,
} from '../ticket-match';

function makeVerification(overrides: Partial<VerificationForMatching> = {}): VerificationForMatching {
  return {
    id: 'ver-1',
    email: 'anna@example.com',
    status: 'approved',
    stripe_session_id: null,
    ...overrides,
  };
}

function makeTicket(overrides: Partial<TicketForMatching> = {}): TicketForMatching {
  return {
    id: 'ticket-1',
    email: 'anna@example.com',
    status: 'confirmed',
    ticket_category: 'student',
    stripe_session_id: 'cs_100',
    created_at: '2026-07-01T10:00:00Z',
    ...overrides,
  };
}

describe('matchVerificationToTickets', () => {
  it('matches by stripe session id first (authoritative)', () => {
    const verification = makeVerification({
      stripe_session_id: 'cs_100',
      email: 'different@example.com',
    });
    const match = matchVerificationToTickets(verification, [makeTicket()]);

    expect(match.purchased).toBe(true);
    expect(match.matched_by).toBe('session');
    expect(match.ticket_id).toBe('ticket-1');
  });

  it('prefers session match over an email match on another ticket', () => {
    const verification = makeVerification({ stripe_session_id: 'cs_200' });
    const bySession = makeTicket({ id: 'ticket-session', stripe_session_id: 'cs_200', email: 'other@example.com' });
    const byEmail = makeTicket({ id: 'ticket-email', stripe_session_id: 'cs_999' });

    const match = matchVerificationToTickets(verification, [byEmail, bySession]);
    expect(match.ticket_id).toBe('ticket-session');
    expect(match.matched_by).toBe('session');
  });

  it('falls back to case-insensitive email matching', () => {
    const verification = makeVerification({ email: 'Anna@Example.COM ' });
    const match = matchVerificationToTickets(verification, [
      makeTicket({ email: 'anna@example.com', stripe_session_id: 'cs_other' }),
    ]);

    expect(match.purchased).toBe(true);
    expect(match.matched_by).toBe('email');
  });

  it('prefers a student/unemployed ticket over a standard one on email match', () => {
    const verification = makeVerification();
    const standard = makeTicket({ id: 'ticket-standard', ticket_category: 'standard', created_at: '2026-07-10T10:00:00Z' });
    const student = makeTicket({ id: 'ticket-student', ticket_category: 'student', created_at: '2026-07-01T10:00:00Z' });

    const match = matchVerificationToTickets(verification, [standard, student]);
    expect(match.ticket_id).toBe('ticket-student');
    expect(match.ticket_category).toBe('student');
  });

  it('prefers the most recent ticket within the same category preference', () => {
    const verification = makeVerification();
    const older = makeTicket({ id: 'ticket-old', created_at: '2026-06-01T10:00:00Z' });
    const newer = makeTicket({ id: 'ticket-new', created_at: '2026-07-05T10:00:00Z' });

    const match = matchVerificationToTickets(verification, [older, newer]);
    expect(match.ticket_id).toBe('ticket-new');
  });

  it('ignores cancelled, refunded, and pending tickets', () => {
    const verification = makeVerification({ stripe_session_id: 'cs_100' });
    const tickets = [
      makeTicket({ id: 't1', status: 'cancelled' }),
      makeTicket({ id: 't2', status: 'refunded' }),
      makeTicket({ id: 't3', status: 'pending' }),
    ];

    const match = matchVerificationToTickets(verification, tickets);
    expect(match.purchased).toBe(false);
    expect(match.matched_by).toBeNull();
    expect(match.ticket_id).toBeNull();
  });

  it('returns no match when nothing lines up', () => {
    const verification = makeVerification({ email: 'nobody@example.com' });
    const match = matchVerificationToTickets(verification, [makeTicket()]);
    expect(match.purchased).toBe(false);
  });
});

describe('getFollowUpStatus', () => {
  const purchased = { purchased: true, matched_by: 'email' as const, ticket_id: 't', ticket_category: 'student', purchased_at: '2026-07-01T10:00:00Z' };
  const noMatch = { purchased: false, matched_by: null, ticket_id: null, ticket_category: null, purchased_at: null };

  it('is purchased whenever a ticket match exists', () => {
    expect(getFollowUpStatus('approved', purchased)).toBe('purchased');
    expect(getFollowUpStatus('pending', purchased)).toBe('purchased');
    expect(getFollowUpStatus('rejected', purchased)).toBe('purchased');
  });

  it('flags approved requests without a ticket as needing follow-up', () => {
    expect(getFollowUpStatus('approved', noMatch)).toBe('needs_follow_up');
  });

  it('marks unpurchased pending requests as awaiting review', () => {
    expect(getFollowUpStatus('pending', noMatch)).toBe('awaiting_review');
  });

  it('marks unpurchased rejected requests as not applicable', () => {
    expect(getFollowUpStatus('rejected', noMatch)).toBe('not_applicable');
  });
});

describe('enrichVerificationsWithTickets', () => {
  it('attaches ticket_match and follow_up_status to every row', () => {
    const purchasedVer = makeVerification({ id: 'v1', email: 'anna@example.com' });
    const followUpVer = makeVerification({ id: 'v2', email: 'ben@example.com' });

    const [first, second] = enrichVerificationsWithTickets(
      [purchasedVer, followUpVer],
      [makeTicket()]
    );

    expect(first.follow_up_status).toBe('purchased');
    expect(first.ticket_match.ticket_id).toBe('ticket-1');
    expect(second.follow_up_status).toBe('needs_follow_up');
    expect(second.ticket_match.purchased).toBe(false);
  });
});
