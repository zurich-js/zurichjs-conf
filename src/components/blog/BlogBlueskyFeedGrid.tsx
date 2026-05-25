import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { SocialIcon } from '@/components/atoms';
import { useBlueskyFeed } from '@/hooks/useBlueskyFeed';
import { useLoadMoreOnIntersect } from '@/hooks/useLoadMoreOnIntersect';
import type { BlueskyFeedPost, BlueskyFeedResult } from '@/lib/bluesky/types';

interface BlogBlueskyFeedGridProps {
  initialFeed: BlueskyFeedResult;
  className?: string;
}

const loadingCardKeys = ['loading-1', 'loading-2', 'loading-3'] as const;

function formatRelativeTime(isoDate: string, now: number): string {
  const diff = now - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function BlogBlueskyPostCard({ post, nowMs }: { post: BlueskyFeedPost; nowMs: number | null }) {
  const authorName = post.author.displayName ?? post.author.handle;

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg bg-brand-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md focus-within:ring-2 focus-within:ring-brand-yellow-main">
      <div className="flex items-center gap-3">
        <a
          href={`https://bsky.app/profile/${post.author.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
        >
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={authorName}
              width={40}
              height={40}
              className="size-10 rounded-full object-cover ring-2 ring-brand-white"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-gray-light text-sm font-bold text-brand-gray-medium ring-2 ring-brand-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-brand-black transition-colors group-hover:text-brand-blue">
              {authorName}
            </span>
            <span className="block truncate text-xs text-brand-gray-medium">@{post.author.handle}</span>
          </span>
        </a>
        <SocialIcon
          kind="bluesky"
          href={post.webUrl}
          label="View post on Bluesky"
          tone="dark"
          className="focus:!bg-brand-yellow-main focus:!text-brand-black focus:!ring-brand-yellow-main"
        />
      </div>

      <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-black sm:line-clamp-5">
        {post.text}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 text-xs text-brand-gray-medium">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden="true" />
            {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            {post.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="size-3.5" aria-hidden="true" />
            {post.repostCount}
          </span>
        </div>
        {nowMs !== null && <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt, nowMs)}</time>}
      </div>
    </article>
  );
}

export function BlogBlueskyFeedGrid({ initialFeed, className = '' }: BlogBlueskyFeedGridProps) {
  const { posts, fetchNextPage, hasNextPage, isFetchingNextPage } = useBlueskyFeed({ initialFeed });
  const [nowMs, setNowMs] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useLoadMoreOnIntersect({
    targetRef: loadMoreRef,
    enabled: Boolean(hasNextPage) && !isFetchingNextPage,
    onLoadMore: handleLoadMore,
  });

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className={`flex flex-col gap-8 ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogBlueskyPostCard key={post.uri} post={post} nowMs={nowMs} />
        ))}
      </div>
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {loadingCardKeys.map((key) => (
            <div key={key} className="min-h-48 animate-pulse rounded-lg bg-brand-gray-light" />
          ))}
        </div>
      )}
      {hasNextPage && <div ref={loadMoreRef} className="h-4" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {isFetchingNextPage ? 'Loading more Bluesky posts' : ''}
      </span>
    </div>
  );
}
