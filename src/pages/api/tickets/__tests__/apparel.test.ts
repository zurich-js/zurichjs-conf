import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyOrderToken = vi.fn();
const mockTicketEq = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/auth/orderTokenServer', () => ({
  verifyOrderTokenForCurrentTicket: (...args: unknown[]) => mockVerifyOrderToken(...args),
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === 'tickets') {
        return {
          select: () => ({
            eq: (...args: unknown[]) => {
              mockTicketEq(...args);
              return {
                single: () =>
                  Promise.resolve({
                    data: { id: TICKET_ID, ticket_category: 'standard' },
                    error: null,
                  }),
              };
            },
          }),
        };
      }

      return {
        upsert: (...args: unknown[]) => {
          mockUpsert(...args);
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: { tshirt_size: 'M', hoodie_size: null },
                error: null,
              }),
            }),
          };
        },
      };
    },
  }),
}));

import handler from '../[id]/apparel';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';

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

describe('POST /api/tickets/[id]/apparel', () => {
  beforeEach(() => {
    mockVerifyOrderToken.mockReset();
    mockTicketEq.mockReset();
    mockUpsert.mockReset();
    mockVerifyOrderToken.mockResolvedValue(TICKET_ID);
  });

  it('accepts an uppercase route UUID and persists the canonical ticket ID', async () => {
    const req = {
      method: 'POST',
      query: { id: TICKET_ID.toUpperCase() },
      body: { token: 'signed-token', tshirtSize: 'M', hoodieSize: null },
    } as unknown as NextApiRequest;
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockTicketEq).toHaveBeenCalledWith('id', TICKET_ID);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ ticket_id: TICKET_ID }),
      { onConflict: 'ticket_id' }
    );
  });
});
