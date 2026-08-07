import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';

const mockToBuffer = vi.fn();
const mockGetAbsoluteUrl = vi.fn((path: string, _req?: NextApiRequest) => `https://conf.example.test${path}`);
const mockIsValidNetworkingPublicId = vi.fn();

vi.mock('qrcode', () => ({
  default: {
    toBuffer: (...args: unknown[]) => mockToBuffer(...args),
  },
}));

vi.mock('@/lib/url', () => ({
  getAbsoluteUrl: (path: string, req?: NextApiRequest) => mockGetAbsoluteUrl(path, req),
}));

vi.mock('@/lib/networking/profiles', () => ({
  isValidNetworkingPublicId: (...args: unknown[]) => mockIsValidNetworkingPublicId(...args),
}));

import handler from '../[id]';

const SHARE_ID = '11111111-2222-4333-8444-555555555555';

function makeReq(id: string, method = 'GET', host = 'conf.example.test'): NextApiRequest {
  return {
    method,
    query: { id },
    headers: { host },
  } as unknown as NextApiRequest;
}

function makeRes(): NextApiResponse & {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
} {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response as typeof response & NextApiResponse;
}

describe('GET /api/share/qr/[id]', () => {
  beforeEach(() => {
    mockToBuffer.mockReset();
    mockGetAbsoluteUrl.mockClear();
    mockIsValidNetworkingPublicId.mockReset();
    mockIsValidNetworkingPublicId.mockReturnValue(true);
    mockToBuffer.mockResolvedValue(Buffer.from('png'));
  });

  it('rejects unsupported methods', async () => {
    const res = makeRes();
    await handler(makeReq(`attendee-${SHARE_ID}`, 'POST'), res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET');
    expect(mockToBuffer).not.toHaveBeenCalled();
  });

  it.each([
    SHARE_ID,
    'attendee-not-a-uuid',
    'sponsor-11111111-2222-4333-8444-555555555555?private=true',
    'speaker-Alex-Ng',
    'speaker-alex/ng',
  ])('rejects malformed public ID %s', async (id) => {
    mockIsValidNetworkingPublicId.mockReturnValue(false);
    const res = makeRes();
    await handler(makeReq(id), res);

    expect(res.statusCode).toBe(400);
    expect(mockToBuffer).not.toHaveBeenCalled();
  });

  it('encodes the configured public URL and ignores an untrusted Host header', async () => {
    const publicId = `attendee-${SHARE_ID}`;
    const res = makeRes();
    await handler(makeReq(publicId, 'GET', 'attacker.example'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(Buffer.from('png'));
    expect(res.headers['Content-Type']).toBe('image/png');
    expect(res.headers['Cache-Control']).toContain('s-maxage=604800');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');

    expect(mockGetAbsoluteUrl).toHaveBeenCalledWith(`/share/${publicId}`, undefined);
    const encodedUrl = new URL(mockToBuffer.mock.calls[0][0] as string);
    expect(encodedUrl.origin).toBe('https://conf.example.test');
    expect(encodedUrl.pathname).toBe(`/share/${publicId}`);
    expect(encodedUrl.searchParams.get('utm_source')).toBe('offline');
    expect(encodedUrl.searchParams.get('utm_medium')).toBe('qr_code');
    expect(encodedUrl.searchParams.get('utm_campaign')).toBe('zurichjs_networking');
    expect(mockToBuffer.mock.calls[0][1]).toMatchObject({ width: 400, errorCorrectionLevel: 'H' });
  });

  it('supports speaker slugs without resolving private records', async () => {
    const res = makeRes();
    await handler(makeReq('speaker-alex-ng'), res);

    expect(res.statusCode).toBe(200);
    expect(mockToBuffer).toHaveBeenCalledTimes(1);
    expect(mockToBuffer.mock.calls[0][0]).toContain('/share/speaker-alex-ng');
  });

  it('returns a generic error when QR generation fails', async () => {
    mockToBuffer.mockRejectedValue(new Error('generation failed'));
    const res = makeRes();
    await handler(makeReq(`sponsor-${SHARE_ID}`), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to generate QR code' });
  });
});
