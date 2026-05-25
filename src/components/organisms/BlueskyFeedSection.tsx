import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { SocialIcon } from '@/components/atoms';
import { SectionSplitView } from '@/components/organisms/SectionSplitView';
import { useMotion } from '@/contexts/MotionContext';
import type { BlueskyFeedPost } from '@/lib/bluesky/types';

export interface BlueskyFeedSectionProps {
  posts: BlueskyFeedPost[];
  kicker?: string;
  title?: string;
  subtitle?: React.ReactNode;
  className?: string;
}

interface PostCardProps {
  post: BlueskyFeedPost;
  nowMs: number | null;
  compact?: boolean;
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

function PostCard({ post, nowMs, compact = false }: PostCardProps) {
  const authorName = post.author.displayName ?? post.author.handle;
  const isDark = compact;

  return (
    <article
      className={[
        'flex h-full flex-col rounded-lg ring-1 transition',
        isDark
          ? 'bg-brand-gray-darkest text-brand-white shadow-none ring-brand-white/10 hover:ring-brand-white/25 focus-within:ring-2 focus-within:ring-brand-yellow-main'
          : 'bg-brand-white text-brand-black shadow-sm ring-black/5 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-yellow-main',
        compact ? 'w-[18rem] gap-2.5 p-4 sm:w-[20rem]' : 'gap-3 p-5',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <a
          href={`https://bsky.app/profile/${post.author.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={authorName}
              width={compact ? 36 : 40}
              height={compact ? 36 : 40}
              className={`${compact ? 'size-9' : 'size-10'} rounded-full object-cover ring-2 ${isDark ? 'ring-brand-black' : 'ring-brand-white'}`}
            />
          ) : (
            <div
              className={`${compact ? 'size-9' : 'size-10'} flex items-center justify-center rounded-full text-sm font-bold ring-2 ${
                isDark
                  ? 'bg-brand-black text-brand-white ring-brand-black'
                  : 'bg-brand-gray-light text-brand-gray-medium ring-brand-white'
              }`}
            >
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-semibold transition-colors group-hover:text-brand-blue ${
                isDark ? 'text-brand-white' : 'text-brand-black'
              }`}
            >
              {authorName}
            </span>
            <span className={`block truncate text-xs ${isDark ? 'text-brand-gray-light' : 'text-brand-gray-medium'}`}>
              @{post.author.handle}
            </span>
          </span>
        </a>
        <SocialIcon
          kind="bluesky"
          href={post.webUrl}
          label="View post on Bluesky"
          tone={isDark ? 'light' : 'dark'}
          className={`${compact ? 'size-8' : ''} ${isDark ? 'hover:!text-brand-blue' : ''}`}
        />
      </div>

      <p
        className={[
          'flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed',
          isDark ? 'text-brand-gray-lightest' : 'text-brand-black',
          compact ? 'line-clamp-3 min-h-[4.5rem]' : 'line-clamp-5',
        ].join(' ')}
      >
        {post.text}
      </p>

      <div className={`mt-auto flex items-center justify-between gap-3 text-xs ${isDark ? 'text-brand-gray-light' : 'text-brand-gray-medium'}`}>
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

const defaultSubtitle = (
  <>
    <span className="block">
      Follow the latest ZurichJS conversation from the Bluesky community.
    </span>
    <span className="mt-3 block">
      Not yet on Bluesky? Find us on{' '}
      <a
        href="https://linkedin.com/company/zurichjs"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand-blue underline-offset-4 hover:underline"
      >
        LinkedIn
      </a>
      ,{' '}
      <a
        href="https://x.com/zurichjs/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand-blue underline-offset-4 hover:underline"
      >
        Twitter
      </a>
      , or{' '}
      <a
        href="http://instagram.com/zurich.js"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand-blue underline-offset-4 hover:underline"
      >
        Instagram
      </a>
    </span>
  </>
);

export const BlueskyFeedSection: React.FC<BlueskyFeedSectionProps> = ({
  posts,
  kicker = 'Community Vibes',
  title = 'Join us on Bluesky',
  subtitle = defaultSubtitle,
  className = '',
}) => {
  const { shouldAnimate } = useMotion();
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  if (posts.length === 0) {
    return null;
  }

  const shouldScroll = shouldAnimate && posts.length > 1;
  const shouldAnimateScroller = shouldScroll && !hasFocusWithin;

  return (
    <SectionSplitView
      kicker={kicker}
      title={title}
      subtitle={subtitle}
      variant="dark"
      className={className}
    >
      <div className="pt-8 lg:pt-10">
        <div
          className="relative -mx-4 overflow-hidden sm:-mx-8"
          role="region"
          aria-label="Recent Bluesky posts about ZurichJS"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={(event) => {
            const focusCameFromOutside = !event.currentTarget.contains(event.relatedTarget);
            setIsPaused(true);
            setHasFocusWithin(true);
            if (focusCameFromOutside) {
              scrollerRef.current?.scrollTo({
                left: 0,
                behavior: shouldAnimate ? 'smooth' : 'auto',
              });
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsPaused(false);
              setHasFocusWithin(false);
            }
          }}
        >
          <div
            ref={scrollerRef}
            className="scrollbar-hide overflow-x-auto overscroll-x-contain px-4 py-2 sm:px-8 [mask-image:linear-gradient(to_right,transparent_0,black_12px,black_calc(100%-12px),transparent_100%)] md:[mask-image:linear-gradient(to_right,transparent_0,black_48px,black_calc(100%-48px),transparent_100%)]"
          >
            <div
              className="flex w-max gap-4"
              style={
                shouldAnimateScroller
                  ? {
                      animation: 'bluesky-feed-marquee 130s linear infinite',
                      animationPlayState: isPaused ? 'paused' : 'running',
                    }
                  : undefined
              }
            >
              {posts.map((post) => (
                <PostCard key={post.uri} post={post} nowMs={nowMs} compact />
              ))}
              {shouldScroll && (
                <div className="contents" aria-hidden="true" inert>
                  {posts.map((post) => (
                    <PostCard key={`${post.uri}-clone`} post={post} nowMs={nowMs} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bluesky-feed-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </SectionSplitView>
  );
};
