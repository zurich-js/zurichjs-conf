import { useQuery } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';

interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface BlueskyPost {
  uri: string;
  author: BlueskyAuthor;
  record: {
    text: string;
    createdAt: string;
  };
  likeCount?: number;
  replyCount?: number;
}

interface BlueskyThreadView {
  post: BlueskyPost;
  replies?: BlueskyThreadView[];
}

function atUriToWebUrl(uri: string): string {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return 'https://bsky.app';
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function BlueskyReply({
  thread,
  depth = 0,
}: {
  thread: BlueskyThreadView;
  depth?: number;
}) {
  if (depth > 4) return null;
  const { post, replies } = thread;
  const webUrl = atUriToWebUrl(post.uri);

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-8 mt-4' : ''}`}>
      <a
        href={`https://bsky.app/profile/${post.author.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0"
      >
        {post.author.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author.avatar}
            alt={post.author.displayName ?? post.author.handle}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
            width={36}
            height={36}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold ring-2 ring-white">
            {(post.author.displayName ?? post.author.handle).charAt(0).toUpperCase()}
          </div>
        )}
      </a>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <a
            href={`https://bsky.app/profile/${post.author.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm text-gray-900 hover:text-brand-blue transition-colors"
          >
            {post.author.displayName ?? post.author.handle}
          </a>
          <span className="text-gray-400 text-xs">@{post.author.handle}</span>
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 text-xs hover:text-gray-600 transition-colors ml-auto"
          >
            {formatRelativeTime(post.record.createdAt)}
          </a>
        </div>

        <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap break-words">
          {post.record.text}
        </p>

        <div className="flex items-center gap-4 mt-2">
          {typeof post.likeCount === 'number' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Heart className="w-3.5 h-3.5" />
              {post.likeCount}
            </span>
          )}
          {typeof post.replyCount === 'number' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MessageCircle className="w-3.5 h-3.5" />
              {post.replyCount}
            </span>
          )}
        </div>

        {replies && replies.length > 0 && (
          <div className="mt-2 border-l-2 border-gray-100 pl-0">
            {replies.map((reply) => (
              <BlueskyReply key={reply.post.uri} thread={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchThread(uri: string): Promise<BlueskyThreadView> {
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=5`
  );
  if (!res.ok) throw new Error('Failed to load comments');
  const data = await res.json();
  return data.thread as BlueskyThreadView;
}

export function BlueskyComments({ postUri }: { postUri?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bluesky-thread', postUri],
    queryFn: () => fetchThread(postUri!),
    enabled: !!postUri,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (!postUri) return null;

  const webUrl = atUriToWebUrl(postUri);
  const replies = data?.replies ?? [];

  return (
    <section className="mt-16 pt-12 border-t border-gray-100">
      {/* Heading */}
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        Join the conversation
        {!isLoading && replies.length > 0 && (
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
          </span>
        )}
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        The conversation is happening on{' '}
        <a
          href={webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue hover:underline font-medium"
        >
          Bluesky
        </a>
        .
      </p>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <p className="text-sm text-gray-500">
          Could not load comments.{' '}
          <a href={webUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">
            View them directly on Bluesky.
          </a>
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && replies.length === 0 && (
        <p className="text-sm text-gray-500">
          No replies yet — be the first to start the conversation!
        </p>
      )}

      {/* Comments list */}
      {!isLoading && !isError && replies.length > 0 && (
        <div className="space-y-5 divide-y divide-gray-100">
          {replies.map((reply) => (
            <div key={reply.post.uri} className="pt-5 first:pt-0">
              <BlueskyReply thread={reply} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
