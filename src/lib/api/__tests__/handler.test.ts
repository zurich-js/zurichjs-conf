/**
 * Contract tests for withApiHandler / respondError — the error surface every
 * migrated route inherits. The non-negotiables:
 * - every response carries the same requestId in header and body,
 * - internal error text NEVER reaches a 5xx body,
 * - thrown HttpError/AppError map to the right status and safe message.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  getIsolationScope: () => ({ setTag: vi.fn() }),
}));

import {
  AuthError,
  DatabaseError,
  ErrorCodes,
  FulfillmentError,
  HttpError,
} from '@/lib/errors';
import { withApiHandler } from '../handler';

interface MockRes {
  statusCode: number | undefined;
  body: unknown;
  headers: Record<string, string>;
  res: NextApiResponse;
}

function mockReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return { method: 'POST', headers: {}, body: {}, query: {}, ...overrides } as NextApiRequest;
}

function mockRes(): MockRes {
  const state: MockRes = {
    statusCode: undefined,
    body: undefined,
    headers: {},
    res: undefined as unknown as NextApiResponse,
  };
  state.res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name: string) {
      return state.headers[name.toLowerCase()];
    },
    get headersSent() {
      return false;
    },
  } as unknown as NextApiResponse;
  return state;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withApiHandler', () => {
  it('responds 405 with Allow header for unsupported methods', async () => {
    const state = mockRes();
    await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async () => {})(
      mockReq({ method: 'GET' }),
      state.res
    );

    expect(state.statusCode).toBe(405);
    expect(state.headers['allow']).toBe('POST');
    const body = state.body as { code: string; requestId: string };
    expect(body.code).toBe(ErrorCodes.METHOD_NOT_ALLOWED);
    expect(body.requestId).toBe(state.headers['x-request-id']);
  });

  it('responds 400 with issues on Zod failure, keeping the documented shape', async () => {
    const state = mockRes();
    await withApiHandler(
      { scope: 'Test API', methods: ['POST'], bodySchema: z.object({ title: z.string().min(1) }) },
      async () => {}
    )(mockReq({ body: { title: 42 } }), state.res);

    expect(state.statusCode).toBe(400);
    const body = state.body as { error: string; code: string; issues: unknown[]; requestId: string };
    expect(body.error).toBe('Validation failed');
    expect(body.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.requestId).toBeTruthy();
  });

  it('passes parsed body and a requestId-scoped context to the handler', async () => {
    const state = mockRes();
    let seen: { body: { title: string }; requestId: string } | undefined;
    await withApiHandler(
      { scope: 'Test API', methods: ['POST'], bodySchema: z.object({ title: z.string() }) },
      async (_req, res, ctx) => {
        seen = { body: ctx.body, requestId: ctx.requestId };
        res.status(200).json({ ok: true });
      }
    )(mockReq({ body: { title: 'hi' } }), state.res);

    expect(seen?.body).toEqual({ title: 'hi' });
    expect(seen?.requestId).toBe(state.headers['x-request-id']);
    expect(state.statusCode).toBe(200);
  });

  it('honors an inbound x-request-id so traces continue across services', async () => {
    const state = mockRes();
    await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async (_req, res) => {
      res.status(200).json({ ok: true });
    })(mockReq({ headers: { 'x-request-id': 'upstream-7' } }), state.res);

    expect(state.headers['x-request-id']).toBe('upstream-7');
  });

  it('maps a thrown 4xx HttpError to its status and user-facing message', async () => {
    const state = mockRes();
    await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async () => {
      throw new HttpError(404, 'Ticket not found', { code: ErrorCodes.NOT_FOUND });
    })(mockReq(), state.res);

    expect(state.statusCode).toBe(404);
    const body = state.body as { error: string; code: string };
    expect(body.error).toBe('Ticket not found');
    expect(body.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it('maps AppError codes to statuses (auth → 401, rate limit → 429)', async () => {
    for (const [error, expected] of [
      [new AuthError('nope'), 401],
      [new HttpError(429, 'slow down', { code: ErrorCodes.RATE_LIMITED }), 429],
    ] as const) {
      const state = mockRes();
      await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async () => {
        throw error;
      })(mockReq(), state.res);
      expect(state.statusCode).toBe(expected);
    }
  });

  it('NEVER leaks internal error text on a 500', async () => {
    const marker = 'pg: permission denied for table secret_finances';
    for (const thrown of [
      new Error(marker),
      new DatabaseError(marker),
      new FulfillmentError(marker, { code: ErrorCodes.REFUND_DB_UPDATE_FAILED }),
    ]) {
      const state = mockRes();
      await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async () => {
        throw thrown;
      })(mockReq(), state.res);

      expect(state.statusCode).toBe(500);
      expect(JSON.stringify(state.body)).not.toContain('secret_finances');
      const body = state.body as { error: string; code: string; requestId: string };
      expect(body.error).toBeTruthy();
      expect(body.code).toBeTruthy();
      expect(body.requestId).toBe(state.headers['x-request-id']);
    }
  });

  it('keeps the domain code on the 500 body so incidents are searchable', async () => {
    const state = mockRes();
    await withApiHandler({ scope: 'Test API', methods: ['POST'] }, async () => {
      throw new FulfillmentError('stripe refunded, db failed', {
        code: ErrorCodes.REFUND_DB_UPDATE_FAILED,
      });
    })(mockReq(), state.res);

    expect((state.body as { code: string }).code).toBe(ErrorCodes.REFUND_DB_UPDATE_FAILED);
  });
});
