import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  createWorkshopRegistration: vi.fn(),
  sendWorkshopConfirmationEmail: vi.fn(),
  fetchPublicSpeakers: vi.fn(),
  generateWorkshopPDF: vi.fn(),
  imageUrlToDataUrl: vi.fn(),
  generateTicketQRCode: vi.fn(),
  workshopSingle: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mocks.workshopSingle,
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/workshops', () => ({
  createWorkshopRegistration: mocks.createWorkshopRegistration,
}));

vi.mock('@/lib/email', () => ({
  sendWorkshopConfirmationEmail: mocks.sendWorkshopConfirmationEmail,
}));

vi.mock('@/lib/queries/speakers', () => ({
  fetchPublicSpeakers: mocks.fetchPublicSpeakers,
}));

vi.mock('@/lib/pdf', () => ({
  generateWorkshopPDF: mocks.generateWorkshopPDF,
  imageUrlToDataUrl: mocks.imageUrlToDataUrl,
}));

vi.mock('@/lib/qrcode', () => ({
  generateTicketQRCode: mocks.generateTicketQRCode,
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

import handler from '../issue-workshop-ticket';

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

async function callHandler(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

const WORKSHOP_ID = 'a3bb189e-8bf9-4888-9912-ace4e6543002';

const workshop = {
  id: WORKSHOP_ID,
  title: 'Advanced TypeScript',
  description: 'A deep dive.',
  date: '2026-09-10',
  session_id: null,
  cfp_submission_id: null,
};

const registration = {
  id: 'reg-1',
  workshop_id: WORKSHOP_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  amount_paid: 0,
  currency: 'CHF',
  status: 'confirmed',
  qr_code_url: 'https://cdn.test/qr.png',
  created_at: '2026-07-23T00:00:00Z',
};

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    workshopId: WORKSHOP_ID,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    paymentType: 'complimentary',
    complimentaryReason: 'speaker',
    sendEmail: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyAdminAccess.mockReturnValue({ authorized: true });
  mocks.workshopSingle.mockResolvedValue({ data: workshop, error: null });
  mocks.createWorkshopRegistration.mockResolvedValue({ success: true, registration });
  mocks.sendWorkshopConfirmationEmail.mockResolvedValue({ success: true });
  mocks.fetchPublicSpeakers.mockResolvedValue({ speakers: [] });
  mocks.imageUrlToDataUrl.mockResolvedValue('data:image/png;base64,abc');
  mocks.generateWorkshopPDF.mockResolvedValue(Buffer.from('pdf'));
});

describe('POST /api/admin/issue-workshop-ticket', () => {
  it('rejects non-POST methods', async () => {
    const res = await callHandler({ method: 'GET' });
    expect(res._status).toBe(405);
  });

  it('rejects unauthorized requests', async () => {
    mocks.verifyAdminAccess.mockReturnValue({ authorized: false });
    const res = await callHandler({ method: 'POST', body: validBody() });
    expect(res._status).toBe(401);
  });

  it('rejects bank transfer without an amount', async () => {
    const res = await callHandler({
      method: 'POST',
      body: validBody({ paymentType: 'bank_transfer' }),
    });
    expect(res._status).toBe(400);
    expect(mocks.createWorkshopRegistration).not.toHaveBeenCalled();
  });

  it('rejects stripe payments without a payment ID', async () => {
    const res = await callHandler({
      method: 'POST',
      body: validBody({ paymentType: 'stripe', amountPaid: 10000 }),
    });
    expect(res._status).toBe(400);
    expect(mocks.createWorkshopRegistration).not.toHaveBeenCalled();
  });

  it('rejects unsupported currencies', async () => {
    const res = await callHandler({
      method: 'POST',
      body: validBody({ paymentType: 'bank_transfer', amountPaid: 10000, currency: 'AUD' }),
    });
    expect(res._status).toBe(400);
  });

  it('returns 404 when the workshop does not exist', async () => {
    mocks.workshopSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = await callHandler({ method: 'POST', body: validBody() });
    expect(res._status).toBe(404);
  });

  it('issues a complimentary seat with zero amount and sends the confirmation email', async () => {
    const res = await callHandler({ method: 'POST', body: validBody() });

    expect(res._status).toBe(201);
    expect(mocks.createWorkshopRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        workshopId: WORKSHOP_ID,
        amountPaid: 0,
        currency: 'CHF',
        status: 'confirmed',
        seatIndex: 0,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        metadata: expect.objectContaining({
          issued_manually: true,
          payment_type: 'complimentary',
          complimentary_reason: 'speaker',
        }),
      })
    );
    const params = mocks.createWorkshopRegistration.mock.calls[0][0];
    expect(params.stripeSessionId).toMatch(/^manual_/);

    expect(mocks.sendWorkshopConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        workshopTitle: 'Advanced TypeScript',
        seatIndex: 0,
        totalSeats: 1,
        qrCodeUrl: registration.qr_code_url,
      })
    );
    expect((res._json as { emailSent: boolean }).emailSent).toBe(true);
  });

  it('issues a bank transfer seat with the given amount, currency, and reference', async () => {
    const res = await callHandler({
      method: 'POST',
      body: validBody({
        paymentType: 'bank_transfer',
        amountPaid: 25000,
        currency: 'EUR',
        bankTransferReference: 'INV-42',
        complimentaryReason: undefined,
      }),
    });

    expect(res._status).toBe(201);
    expect(mocks.createWorkshopRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaid: 25000,
        currency: 'EUR',
        metadata: expect.objectContaining({
          payment_type: 'bank_transfer',
          bank_transfer_reference: 'INV-42',
        }),
      })
    );
  });

  it('normalizes lowercase Stripe currencies and links the payment id', async () => {
    const res = await callHandler({
      method: 'POST',
      body: validBody({
        paymentType: 'stripe',
        stripePaymentId: 'pi_123',
        amountPaid: 19900,
        currency: 'usd',
        complimentaryReason: undefined,
      }),
    });

    expect(res._status).toBe(201);
    expect(mocks.createWorkshopRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaid: 19900,
        currency: 'USD',
        stripePaymentIntentId: 'pi_123',
      })
    );
  });

  it('returns 409 when the workshop is at capacity', async () => {
    mocks.createWorkshopRegistration.mockResolvedValue({
      success: false,
      oversold: true,
      error: 'Workshop is at full capacity',
    });
    const res = await callHandler({ method: 'POST', body: validBody() });
    expect(res._status).toBe(409);
    expect(mocks.sendWorkshopConfirmationEmail).not.toHaveBeenCalled();
  });

  it('skips the email when sendEmail is false', async () => {
    const res = await callHandler({ method: 'POST', body: validBody({ sendEmail: false }) });
    expect(res._status).toBe(201);
    expect(mocks.sendWorkshopConfirmationEmail).not.toHaveBeenCalled();
    expect((res._json as { emailSent: boolean }).emailSent).toBe(false);
  });

  it('still returns 201 when the email fails to send', async () => {
    mocks.sendWorkshopConfirmationEmail.mockResolvedValue({ success: false, error: 'boom' });
    const res = await callHandler({ method: 'POST', body: validBody() });
    expect(res._status).toBe(201);
    expect((res._json as { emailSent: boolean }).emailSent).toBe(false);
  });
});
