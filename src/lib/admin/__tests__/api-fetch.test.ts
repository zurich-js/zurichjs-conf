import { describe, it, expect, vi, afterEach } from 'vitest';
import { adminFetch, AdminApiError } from '../api-fetch';
import { defaultQueryClientConfig } from '@/lib/query-client';

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminFetch', () => {
  it('returns parsed JSON on success', async () => {
    mockFetchOnce(200, { ok: true });
    await expect(adminFetch<{ ok: boolean }>('/api/admin/test')).resolves.toEqual({ ok: true });
  });

  it('throws AdminApiError with the server-provided message and status', async () => {
    mockFetchOnce(403, { error: 'Forbidden' });
    const err = await adminFetch('/api/admin/test').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AdminApiError);
    expect((err as AdminApiError).status).toBe(403);
    expect((err as AdminApiError).message).toBe('Forbidden');
  });

  it('falls back to a generic message for non-JSON error bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );
    const err = await adminFetch('/api/admin/test').catch((e: unknown) => e);
    expect((err as AdminApiError).message).toBe('Request failed with status 500');
    expect((err as AdminApiError).status).toBe(500);
  });

  it('forwards an AbortSignal to fetch', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const controller = new AbortController();
    await adminFetch('/api/admin/test', { signal: controller.signal });
    expect(fetchSpy).toHaveBeenCalledWith('/api/admin/test', { signal: controller.signal });
  });
});

describe('query client retry policy', () => {
  const retry = defaultQueryClientConfig.defaultOptions.queries.retry;

  it('does not retry non-transient 4xx errors', () => {
    expect(retry(0, new AdminApiError('Unauthorized', 401))).toBe(false);
    expect(retry(0, new AdminApiError('Not found', 404))).toBe(false);
    expect(retry(0, new AdminApiError('Bad request', 400))).toBe(false);
  });

  it('retries transient failures once', () => {
    expect(retry(0, new AdminApiError('Server error', 500))).toBe(true);
    expect(retry(1, new AdminApiError('Server error', 500))).toBe(false);
    expect(retry(0, new AdminApiError('Rate limited', 429))).toBe(true);
    expect(retry(0, new AdminApiError('Timeout', 408))).toBe(true);
    expect(retry(0, new Error('network down'))).toBe(true);
    expect(retry(1, new Error('network down'))).toBe(false);
  });
});
