import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyOrderTokenClaims = vi.fn();
const mockRpc = vi.fn();
const mockRpcSingle = vi.fn();

vi.mock('@/lib/auth/orderToken', () => ({
  verifyOrderTokenClaims: (...args: unknown[]) => mockVerifyOrderTokenClaims(...args),
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    rpc: (...args: unknown[]) => {
      mockRpc(...args);
      return { single: mockRpcSingle };
    },
  }),
}));

import handler from '../[id]/networking';

const TICKET_ID = 'fdd332be-86c9-4842-912c-e5c1c0968606';
const MANAGE_TOKEN_NONCE = '9dc7c037-ef40-4ac5-b24c-66ee9e9ee0f9';
const SHARE_ID = '11111111-2222-4333-8444-555555555555';
const PROFILE = {
  linkedinUrl: 'https://linkedin.com/in/ada',
  githubUrl: 'https://github.com/ada',
  xHandle: '@ada',
  blueskyHandle: null,
  mastodonHandle: '@ada@fosstodon.org',
  websiteUrl: 'https://ada.example.com',
};

function makeReq(body: unknown, method = 'POST', id = TICKET_ID): NextApiRequest {
  return {
    method,
    body,
    query: { id },
    headers: {},
  } as unknown as NextApiRequest;
}

function makeRes(): NextApiResponse & { statusCode: number; jsonBody: unknown } {
  const response = {
    statusCode: 0,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
  };
  return response as typeof response & NextApiResponse;
}

describe('POST /api/tickets/[id]/networking', () => {
  beforeEach(() => {
    mockVerifyOrderTokenClaims.mockReset();
    mockRpc.mockReset();
    mockRpcSingle.mockReset();
    mockVerifyOrderTokenClaims.mockReturnValue({
      ticketId: TICKET_ID,
      manageTokenNonce: MANAGE_TOKEN_NONCE,
    });
    mockRpcSingle.mockResolvedValue({
      data: {
        result: 'ok',
        share_id: SHARE_ID,
        enabled: true,
        profile: PROFILE,
      },
      error: null,
    });
  });

  it('rejects unsupported methods', async () => {
    const res = makeRes();
    await handler(makeReq({}, 'GET'), res);

    expect(res.statusCode).toBe(405);
    expect(mockVerifyOrderTokenClaims).not.toHaveBeenCalled();
  });

  it('authenticates before validating the profile payload', async () => {
    mockVerifyOrderTokenClaims.mockReturnValue(null);
    const res = makeRes();
    await handler(makeReq({ enabled: true, profile: PROFILE }), res);

    expect(res.statusCode).toBe(401);
    expect(mockVerifyOrderTokenClaims).toHaveBeenCalledWith('');
  });

  it('validates the profile after authentication', async () => {
    const res = makeRes();
    await handler(makeReq({ token: 'signed-token', enabled: 'yes', profile: PROFILE }), res);

    expect(res.statusCode).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid or mismatched order token before mutation', async () => {
    mockVerifyOrderTokenClaims
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({
        ticketId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        manageTokenNonce: MANAGE_TOKEN_NONCE,
      });

    const invalidRes = makeRes();
    await handler(makeReq({ token: 'invalid', enabled: true, profile: PROFILE }), invalidRes);
    expect(invalidRes.statusCode).toBe(401);

    const mismatchRes = makeRes();
    await handler(makeReq({ token: 'signed-token', malformed: true }), mismatchRes);
    expect(mismatchRes.statusCode).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('atomically checks the nonce and stores the attendee profile', async () => {
    const res = makeRes();
    await handler(makeReq({ token: 'signed-token', enabled: true, profile: PROFILE }), res);

    expect(mockRpc).toHaveBeenCalledWith('update_attendee_networking_profile', {
      p_ticket_id: TICKET_ID,
      p_manage_token_nonce: MANAGE_TOKEN_NONCE,
      p_enabled: true,
      p_profile: PROFILE,
    });
    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ shareId: SHARE_ID, enabled: true, profile: PROFILE });
    expect(res.jsonBody).not.toHaveProperty('token');
    expect(JSON.stringify(res.jsonBody)).not.toContain('email');
  });

  it('rejects a valid-HMAC token whose nonce became stale before the locked update', async () => {
    mockRpcSingle.mockResolvedValue({
      data: { result: 'invalid_token', share_id: null, enabled: null, profile: null },
      error: null,
    });
    const res = makeRes();

    await handler(makeReq({ token: 'stale-signed-token', enabled: true, profile: PROFILE }), res);

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Invalid or expired token' });
  });

  it('requires a confirmed ticket when enabling', async () => {
    mockRpcSingle.mockResolvedValue({
      data: { result: 'ticket_not_confirmed', share_id: null, enabled: null, profile: null },
      error: null,
    });
    const res = makeRes();

    await handler(makeReq({ token: 'signed-token', enabled: true, profile: PROFILE }), res);

    expect(res.statusCode).toBe(409);
  });

  it('allows disabling regardless of ticket status', async () => {
    mockRpcSingle.mockResolvedValue({
      data: { result: 'ok', share_id: SHARE_ID, enabled: false, profile: PROFILE },
      error: null,
    });
    const res = makeRes();

    await handler(makeReq({ token: 'signed-token', enabled: false, profile: PROFILE }), res);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ shareId: SHARE_ID, enabled: false, profile: PROFILE });
  });

  it('returns 404 for a missing ticket and 500 for database failures', async () => {
    mockRpcSingle.mockResolvedValueOnce({
      data: { result: 'not_found', share_id: null, enabled: null, profile: null },
      error: null,
    });
    const missingRes = makeRes();
    await handler(makeReq({ token: 'signed-token', enabled: true, profile: PROFILE }), missingRes);
    expect(missingRes.statusCode).toBe(404);

    mockRpcSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'database unavailable' },
    });
    const failedRes = makeRes();
    await handler(makeReq({ token: 'signed-token', enabled: true, profile: PROFILE }), failedRes);
    expect(failedRes.statusCode).toBe(500);
  });
});
