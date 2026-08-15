import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  from: vi.fn(),
  sendEmail: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@/lib/auth/orderTokenServer', () => ({
  verifyOrderTokenClaimsForCurrentTicket: mocks.verifyToken,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({ from: mocks.from })),
}));

vi.mock('@/lib/email', () => ({
  sendTicketConfirmationEmail: mocks.sendEmail,
}));

vi.mock('@/lib/stripe/ticket-utils', () => ({
  getTicketDisplayName: vi.fn(() => 'Standard Ticket'),
}));

vi.mock('@/lib/platform-notifications', () => ({
  notifyTicketReassigned: mocks.notify,
}));

vi.mock('@/lib/auth/orderToken', () => ({
  generateOrderUrl: vi.fn(() => 'https://conf.example.test/manage-order?token=new'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({ error: vi.fn() })),
  },
}));

import handler from '../[id]/reassign';

const TICKET_ID = '11111111-2222-4333-8444-555555555555';
const MANAGE_TOKEN_NONCE = '66666666-7777-4888-8999-000000000000';

const currentTicket = {
  id: TICKET_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  amount_paid: 29900,
  currency: 'CHF',
  qr_code_url: null,
  manage_token_nonce: MANAGE_TOKEN_NONCE,
};

function makeReq(id = TICKET_ID.toUpperCase()): NextApiRequest {
  return {
    method: 'POST',
    query: { id },
    body: {
      token: 'signed-token',
      email: 'grace@example.com',
      firstName: 'Grace',
      lastName: 'Hopper',
    },
  } as unknown as NextApiRequest;
}

function makeRes(): NextApiResponse & { statusCode: number; body: unknown } {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response as typeof response & NextApiResponse;
}

function configureTicketQueries(updatedTicket: typeof currentTicket | null) {
  const fetchQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  fetchQuery.select.mockReturnValue(fetchQuery);
  fetchQuery.eq.mockReturnValue(fetchQuery);
  fetchQuery.single.mockResolvedValue({ data: currentTicket, error: null });

  const updateQuery = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  updateQuery.update.mockReturnValue(updateQuery);
  updateQuery.eq.mockReturnValue(updateQuery);
  updateQuery.select.mockReturnValue(updateQuery);
  updateQuery.maybeSingle.mockResolvedValue({ data: updatedTicket, error: null });

  mocks.from.mockReturnValueOnce(fetchQuery).mockReturnValueOnce(updateQuery);
  return { fetchQuery, updateQuery };
}

describe('POST /api/tickets/[id]/reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyToken.mockResolvedValue({
      ticketId: TICKET_ID,
      manageTokenNonce: MANAGE_TOKEN_NONCE,
    });
    mocks.sendEmail.mockResolvedValue({ success: true });
  });

  it('normalizes the route ID and transfers only while the verified nonce is current', async () => {
    const updatedTicket = {
      ...currentTicket,
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@example.com',
      manage_token_nonce: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    };
    const { updateQuery } = configureTicketQueries(updatedTicket);
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      email: 'grace@example.com',
      first_name: 'Grace',
      last_name: 'Hopper',
      user_id: null,
    }));
    expect(updateQuery.eq).toHaveBeenNthCalledWith(1, 'id', TICKET_ID);
    expect(updateQuery.eq).toHaveBeenNthCalledWith(2, 'manage_token_nonce', MANAGE_TOKEN_NONCE);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it('rejects a stale concurrent transfer before sending email', async () => {
    configureTicketQueries(null);
    const res = makeRes();

    await handler(makeReq(), res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: 'Ticket access changed; reload and try again' });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
