import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  ticketSingle: vi.fn(),
  generateTicketPdfForTicket: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: mocks.ticketSingle }) }),
    }),
  })),
}));

vi.mock('@/lib/tickets', () => ({
  generateTicketPdfForTicket: mocks.generateTicketPdfForTicket,
  ticketPdfFilename: (id: string) => `ZurichJS_Conference_2026_Ticket_${id}.pdf`,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import handler from '../pdf';

const TICKET_ID = 'a3bb189e-8bf9-4888-9912-ace4e6543002';

interface MockResponse {
  _status: number;
  _json: unknown;
  _sent: unknown;
  _headers: Record<string, string | number>;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
  send: (data: unknown) => MockResponse;
  setHeader: (name: string, value: string | number) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    _sent: undefined,
    _headers: {},
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    send(data) {
      res._sent = data;
      return res;
    },
    setHeader(name, value) {
      res._headers[name] = value;
      return res;
    },
  };
  return res;
}

async function callHandler(req: Partial<NextApiRequest> = {}) {
  const res = createResponse();
  await handler(
    { method: 'GET', query: { id: TICKET_ID }, ...req } as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

const ticketRow = {
  id: TICKET_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  amount_paid: 25000,
  currency: 'CHF',
  qr_code_url: 'https://storage.example.com/qr.png',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true, isBot: false, botClient: null });
  mocks.ticketSingle.mockResolvedValue({ data: ticketRow, error: null });
  mocks.generateTicketPdfForTicket.mockResolvedValue(Buffer.from('%PDF-1.7 fake'));
});

describe('GET /api/admin/tickets/[id]/pdf', () => {
  it('rejects unauthenticated requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false, isBot: false, botClient: null });

    const res = await callHandler();

    expect(res._status).toBe(401);
    expect(mocks.ticketSingle).not.toHaveBeenCalled();
  });

  it('rejects non-GET methods', async () => {
    const res = await callHandler({ method: 'POST' });

    expect(res._status).toBe(405);
  });

  it('rejects a missing ticket ID', async () => {
    const res = await callHandler({ query: {} });

    expect(res._status).toBe(400);
  });

  it('returns 404 when the ticket does not exist', async () => {
    mocks.ticketSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const res = await callHandler();

    expect(res._status).toBe(404);
  });

  it('returns 422 when the ticket has no QR code', async () => {
    mocks.ticketSingle.mockResolvedValue({ data: { ...ticketRow, qr_code_url: null }, error: null });

    const res = await callHandler();

    expect(res._status).toBe(422);
    expect(mocks.generateTicketPdfForTicket).not.toHaveBeenCalled();
  });

  it('streams the generated PDF as an attachment', async () => {
    const res = await callHandler();

    expect(mocks.generateTicketPdfForTicket).toHaveBeenCalledWith(ticketRow);
    expect(res._headers['Content-Type']).toBe('application/pdf');
    expect(res._headers['Content-Disposition']).toBe(
      `attachment; filename="ZurichJS_Conference_2026_Ticket_${TICKET_ID}.pdf"`
    );
    expect(res._headers['Content-Length']).toBe(Buffer.from('%PDF-1.7 fake').length);
    expect(res._sent).toBeInstanceOf(Buffer);
  });

  it('returns 500 when PDF generation fails', async () => {
    mocks.generateTicketPdfForTicket.mockRejectedValue(new Error('boom'));

    const res = await callHandler();

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'Failed to generate ticket PDF' });
  });
});
