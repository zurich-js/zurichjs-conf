import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

vi.mock('@/lib/url', () => ({
  getBaseUrl: () => 'https://conf.zurichjs.com',
}));

const mockSingle = vi.fn();
vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

const mockSendEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendTicketConfirmationEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import handler from '../recover-link';

// Each test uses its own ticket ID — the per-ticket send limiter is
// module-level state shared across tests
const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';

function makeTicket(id: string) {
  return {
    id,
    email: 'attendee@example.com',
    first_name: 'Ada',
    last_name: 'Lovelace',
    ticket_category: 'standard',
    ticket_stage: 'early_bird',
    amount_paid: 250,
    currency: 'CHF',
    qr_code_url: 'https://example.com/qr.png',
  };
}

let ipCounter = 0;

function makeReq(body: unknown, method = 'POST'): NextApiRequest {
  ipCounter += 1;
  return {
    method,
    body,
    headers: { 'x-forwarded-for': `10.0.0.${ipCounter}` },
    query: {},
  } as unknown as NextApiRequest;
}

function makeRes() {
  const res = {
    statusCode: 0,
    jsonBody: undefined as unknown,
    headers: {} as Record<string, unknown>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
  };
  return res as typeof res & NextApiResponse;
}

describe('POST /api/orders/recover-link', () => {
  beforeEach(() => {
    vi.stubEnv('ORDER_TOKEN_SECRET', 'current-secret');
    mockSingle.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it('rejects non-POST methods', async () => {
    const res = makeRes();
    await handler(makeReq({}, 'GET'), res);

    expect(res.statusCode).toBe(405);
  });

  it('rejects a missing token with 400', async () => {
    const res = makeRes();
    await handler(makeReq({}), res);

    expect(res.statusCode).toBe(400);
  });

  it('emails a freshly signed link to the address on the ticket', async () => {
    mockSingle.mockResolvedValue({ data: makeTicket(TICKET_ID), error: null });

    const res = makeRes();
    // Stale token: signature no longer verifies, but the ticket ID is intact
    await handler(makeReq({ token: `${TICKET_ID}.some-stale-signature` }), res);

    expect(res.statusCode).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    const emailData = mockSendEmail.mock.calls[0][0] as { to: string; orderUrl: string };
    expect(emailData.to).toBe('attendee@example.com');
    expect(emailData.orderUrl).toContain(`/manage-order?token=${TICKET_ID}.`);
  });

  it('sends at most one email per ticket per window, even from different IPs', async () => {
    const ticketId = '11111111-2222-4333-8444-555555555555';
    mockSingle.mockResolvedValue({ data: makeTicket(ticketId), error: null });

    for (let i = 0; i < 2; i++) {
      const res = makeRes();
      await handler(makeReq({ token: `${ticketId}.stale` }), res);
      expect(res.statusCode).toBe(200);
    }

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it('returns the generic response without emailing when the ticket does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const res = makeRes();
    await handler(makeReq({ token: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.whatever' }), res);

    expect(res.statusCode).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns the generic response for a token that is not ticket-ID shaped', async () => {
    const res = makeRes();
    await handler(makeReq({ token: 'not-a-uuid.signature' }), res);

    expect(res.statusCode).toBe(200);
    expect(mockSingle).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 500 when the email fails to send', async () => {
    const ticketId = '99999999-8888-4777-8666-555555555544';
    mockSingle.mockResolvedValue({ data: makeTicket(ticketId), error: null });
    mockSendEmail.mockResolvedValue({ success: false, error: 'resend down' });

    const res = makeRes();
    await handler(makeReq({ token: `${ticketId}.sig` }), res);

    expect(res.statusCode).toBe(500);
  });

  it('rate limits repeated requests from the same IP', async () => {
    const ticketId = '12121212-3434-4565-8787-909090909090';
    mockSingle.mockResolvedValue({ data: makeTicket(ticketId), error: null });
    const sameIpReq = () =>
      ({
        method: 'POST',
        body: { token: `${ticketId}.sig` },
        headers: { 'x-forwarded-for': '192.168.1.99' },
        query: {},
      }) as unknown as NextApiRequest;

    for (let i = 0; i < 3; i++) {
      const res = makeRes();
      await handler(sameIpReq(), res);
      expect(res.statusCode).toBe(200);
    }

    const res = makeRes();
    await handler(sameIpReq(), res);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeDefined();
  });
});
