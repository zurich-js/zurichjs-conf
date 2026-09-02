import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest } from 'next';

import { getBadgeBaseUrl } from '@/lib/badges/url';

function request(headers: NextApiRequest['headers']): NextApiRequest {
  return { headers } as NextApiRequest;
}

describe('badge base URL', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the actual localhost port instead of NEXT_PUBLIC_BASE_URL', () => {
    expect(getBadgeBaseUrl(request({ host: 'localhost:3003' }))).toBe('http://localhost:3003');
    expect(getBadgeBaseUrl(request({
      host: '127.0.0.1:4010',
      'x-forwarded-proto': 'https',
    }))).toBe('https://127.0.0.1:4010');
  });

  it('uses the canonical public URL instead of the Vercel preview host', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://conf.zurichjs.com');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_URL', 'zurichjs-conf-preview.vercel.app');

    expect(getBadgeBaseUrl(request({
      host: 'zurichjs-conf-preview.vercel.app',
      'x-forwarded-proto': 'https',
    }))).toBe('https://conf.zurichjs.com');
  });

  it('falls back to the production conference domain when the canonical URL is absent', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '');

    expect(getBadgeBaseUrl(request({
      host: 'zurichjs-conf-preview.vercel.app',
    }))).toBe('https://conf.zurichjs.com');
  });
});
