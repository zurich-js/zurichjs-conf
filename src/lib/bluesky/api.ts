import type { BlueskyFeedResult } from '@/lib/bluesky/types';

interface FetchBlueskyFeedPageParams {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function fetchBlueskyFeedPage({
  cursor,
  limit,
  signal,
}: FetchBlueskyFeedPageParams = {}): Promise<BlueskyFeedResult> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));

  const query = params.toString();
  const response = await fetch(`/api/social/bluesky-posts${query ? `?${query}` : ''}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Bluesky feed page: ${response.status}`);
  }

  return response.json() as Promise<BlueskyFeedResult>;
}
