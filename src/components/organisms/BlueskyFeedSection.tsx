import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Button, Heading, Kicker, LinkText } from '@/components/atoms';
import { SocialIcon } from '@/components/atoms';
import { useMotion } from '@/contexts/MotionContext';
import { useBlueskyFeed } from '@/hooks/useBlueskyFeed';
import { blueskyConfig } from '@/data/social';
import type { BlueskyFeedPost } from '@/lib/queries/bluesky';

export interface BlueskyFeedSectionProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
}

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

function PostCard({ post, nowMs }: { post: BlueskyFeedPost; nowMs: number | null }) {
  const authorName = post.author.displayName ?? post.author.handle;
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <a
          href={`https://bsky.app/profile/${post.author.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={authorName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gray-light text-sm font-bold text-brand-gray-medium ring-2 ring-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={`https://bsky.app/profile/${post.author.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-semibold text-brand-black hover:text-brand-blue"
          >
            {authorName}
          </a>
          <span className="truncate text-xs text-brand-gray-medium">@{post.author.handle}</span>
        </div>
        <a
          href={post.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View post on Bluesky"
          className="shrink-0 text-brand-gray-medium hover:text-brand-blue"
        >
          <SocialIcon kind="bluesky" href={post.webUrl} tone="dark" />
        </a>
      </div>

      <p className="line-clamp-5 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-black">
        {post.text}
      </p>

      <div className="mt-auto flex items-center justify-between text-xs text-brand-gray-medium">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {post.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
            {post.repostCount}
          </span>
        </div>
        {nowMs !== null && (
          <a
            href={post.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-blue"
          >
            <time dateTime={post.createdAt}>{formatRelativeTime(post.createdAt, nowMs)}</time>
          </a>
        )}
      </div>
    </article>
  );
}

function PostSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand-gray-light" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-brand-gray-light" />
          <div className="h-2.5 w-24 rounded bg-brand-gray-light" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-brand-gray-light" />
        <div className="h-3 w-5/6 rounded bg-brand-gray-light" />
        <div className="h-3 w-3/4 rounded bg-brand-gray-light" />
      </div>
    </div>
  );
}

/**
 * BlueskyFeedSection
 *
 * Surfaces recent Bluesky posts mentioning @zurichjs.com or the configured
 * conference hashtags as social proof. Renders nothing when the feed is empty
 * or has errored, so the section gracefully disappears rather than showing a
 * "no excitement here" empty state.
 */
export const BlueskyFeedSection: React.FC<BlueskyFeedSectionProps> = ({
  kicker = 'COMMUNITY BUZZ',
  title = 'What people are saying',
  subtitle = 'Real-time excitement from the Bluesky community. Join the conversation — tag #zurichjs to be featured.',
}) => {
  useMotion();
  const { data, isLoading, isError } = useBlueskyFeed();
  const posts = data?.posts ?? [];

  // Relative timestamps depend on `Date.now()` — render them only after mount
  // to avoid SSR/CSR hydration drift.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  // Hide section entirely on error or when there's nothing to show post-fetch.
  if (isError) return null;
  if (!isLoading && posts.length === 0) return null;

  const profileUrl = `https://bsky.app/profile/${blueskyConfig.handle}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <Kicker variant="light">{kicker}</Kicker>
        <Heading level="h2" variant="light" className="text-xl leading-tight text-balance">
          {title}
        </Heading>
        <p className="max-w-screen-sm text-base text-brand-gray-medium">{subtitle}</p>
        <LinkText href={profileUrl} animate>
          Follow @{blueskyConfig.handle} on Bluesky
        </LinkText>
      </div>

      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.map((post, idx) => {
              // Mobile: only show the first 3 posts.
              const hideOnMobile = idx >= 3 ? 'hidden sm:block' : '';
              // Mobile: fade most of the 3rd card when more posts hide behind it,
              // so the CTA below feels like the natural next step.
              const isFadedTeaser = idx === 2 && posts.length > 3;
              return (
                <div key={post.uri} className={`relative h-full ${hideOnMobile}`}>
                  <PostCard post={post} nowMs={nowMs} />
                  {isFadedTeaser && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[85%] bg-gradient-to-b from-transparent via-white/90 to-white sm:hidden"
                    />
                  )}
                </div>
              );
            })}
      </div>

      {/* Mobile-only CTA: appears under the faded 3rd card to drive follows. */}
      {!isLoading && posts.length > 3 && (
        <div className="-mt-4 flex justify-center sm:hidden">
          <Button
            asChild
            variant="primary"
            size="md"
            href={profileUrl}
            target="_blank"
          >
            See more on Bluesky
          </Button>
        </div>
      )}
    </div>
  );
};
