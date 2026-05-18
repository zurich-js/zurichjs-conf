import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mocks = vi.hoisted(() => ({
  supabaseInsert: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mocks.supabaseInsert,
    })),
  })),
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

import handler from '../exit-intent';

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

function createRequest(method: string, body?: unknown): NextApiRequest {
  return { method, body } as NextApiRequest;
}

describe('POST /api/surveys/exit-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supabaseInsert.mockResolvedValue({ error: null });
  });

  it('rejects non-POST methods', async () => {
    const res = createResponse();
    await handler(
      createRequest('GET'),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(405);
  });

  it('validates required fields', async () => {
    const res = createResponse();
    await handler(
      createRequest('POST', {}),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(400);
    expect(res._json).toEqual({ success: false, error: 'Validation failed' });
  });

  it('rejects invalid reason values', async () => {
    const res = createResponse();
    await handler(
      createRequest('POST', {
        session_id: 'test-session',
        reason: 'invalid_reason',
      }),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(400);
  });

  it('accepts valid survey response with minimal fields', async () => {
    const res = createResponse();
    await handler(
      createRequest('POST', {
        session_id: 'test-session-123',
        reason: 'too_expensive',
      }),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(200);
    expect(res._json).toEqual({ success: true });
    expect(mocks.supabaseInsert).toHaveBeenCalledWith({
      session_id: 'test-session-123',
      reason: 'too_expensive',
    });
  });

  it('accepts valid survey response with all fields', async () => {
    const body = {
      session_id: 'sess-456',
      email: 'user@example.com',
      reason: 'other' as const,
      reason_detail: 'The venue is too far',
      cart_total: 15000,
      cart_currency: 'CHF',
      cart_items_count: 2,
      checkout_step: 'review',
      response_shown: 'We\'d love to understand',
      response_clicked: false,
      posthog_distinct_id: 'ph-distinct-123',
    };

    const res = createResponse();
    await handler(
      createRequest('POST', body),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(200);
    expect(mocks.supabaseInsert).toHaveBeenCalledWith(body);
  });

  it('handles Supabase insert errors gracefully', async () => {
    mocks.supabaseInsert.mockResolvedValue({
      error: { message: 'DB error', code: '42P01' },
    });

    const res = createResponse();
    await handler(
      createRequest('POST', {
        session_id: 'test-session',
        reason: 'not_ready',
      }),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(500);
    expect(res._json).toEqual({ success: false, error: 'Failed to save response' });
  });

  it('accepts all valid reason enum values', async () => {
    const reasons = ['too_expensive', 'not_ready', 'comparing', 'missing_info', 'other'] as const;

    for (const reason of reasons) {
      vi.clearAllMocks();
      mocks.supabaseInsert.mockResolvedValue({ error: null });

      const res = createResponse();
      await handler(
        createRequest('POST', { session_id: `session-${reason}`, reason }),
        res as unknown as NextApiResponse
      );
      expect(res._status).toBe(200);
    }
  });

  it('rejects reason_detail over 1000 characters', async () => {
    const res = createResponse();
    await handler(
      createRequest('POST', {
        session_id: 'test-session',
        reason: 'other',
        reason_detail: 'x'.repeat(1001),
      }),
      res as unknown as NextApiResponse
    );
    expect(res._status).toBe(400);
  });
});
