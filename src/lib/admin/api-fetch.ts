/**
 * Minimal fetch helper for admin API calls made through TanStack Query.
 *
 * - Throws `AdminApiError` carrying the HTTP status so the query client can
 *   skip retrying non-transient 4xx failures (see `src/lib/query-client.ts`).
 * - Accepts `RequestInit` so callers can pass TanStack Query's `AbortSignal`
 *   (`queryFn: ({ signal }) => adminFetch(url, { signal })`), letting
 *   superseded requests cancel instead of racing.
 */

export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error;
    }
  } catch {
    // Non-JSON error body — fall through to the generic message
  }
  return `Request failed with status ${res.status}`;
}

export async function adminFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new AdminApiError(await extractErrorMessage(res), res.status);
  }
  return res.json() as Promise<T>;
}
