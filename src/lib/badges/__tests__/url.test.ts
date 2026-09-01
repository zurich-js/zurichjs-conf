import { describe, expect, it, vi } from 'vitest';
import type { NextApiRequest } from 'next';

vi.mock('@/lib/url', () => ({ getBaseUrl: () => 'https://conf.example.test' }));

import { getBadgeBaseUrl } from '@/lib/badges/url';

function request(headers: NextApiRequest['headers']): NextApiRequest {
  return { headers } as NextApiRequest;
}

describe('badge base URL', () => {
  it('uses the actual localhost port instead of NEXT_PUBLIC_BASE_URL', () => {
    expect(getBadgeBaseUrl(request({ host: 'localhost:3003' }))).toBe('http://localhost:3003');
    expect(getBadgeBaseUrl(request({
      host: '127.0.0.1:4010',
      'x-forwarded-proto': 'https',
    }))).toBe('https://127.0.0.1:4010');
  });
});
