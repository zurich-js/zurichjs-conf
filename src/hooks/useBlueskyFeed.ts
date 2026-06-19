import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { BLUESKY_FEED_LOAD_MORE_PAGE_SIZE } from '@/lib/bluesky/config';
import { fetchBlueskyFeedPage } from '@/lib/bluesky/api';
import type { BlueskyFeedPost, BlueskyFeedResult } from '@/lib/bluesky/types';
import { queryKeys } from '@/lib/query-keys';

interface UseBlueskyFeedOptions {
  initialFeed: BlueskyFeedResult;
  pageSize?: number;
}

function uniquePosts(posts: BlueskyFeedPost[]): BlueskyFeedPost[] {
  const seen = new Set<string>();
  const unique: BlueskyFeedPost[] = [];

  for (const post of posts) {
    if (seen.has(post.uri)) continue;
    seen.add(post.uri);
    unique.push(post);
  }

  return unique;
}

export function useBlueskyFeed({
  initialFeed,
  pageSize = BLUESKY_FEED_LOAD_MORE_PAGE_SIZE,
}: UseBlueskyFeedOptions) {
  const hasInitialPage = initialFeed.posts.length > 0 || Boolean(initialFeed.nextCursor);

  const query = useInfiniteQuery({
    queryKey: queryKeys.bluesky.feed(pageSize),
    queryFn: ({ pageParam, signal }) =>
      fetchBlueskyFeedPage({
        cursor: pageParam,
        limit: pageSize,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: hasInitialPage
      ? {
          pages: [initialFeed],
          pageParams: [undefined],
        }
      : undefined,
  });

  const posts = useMemo(
    () => uniquePosts(query.data?.pages.flatMap((page) => page.posts) ?? []),
    [query.data]
  );

  return {
    ...query,
    posts,
  };
}
