/**
 * Bluesky feed configuration for ZurichJS social proof surfaces.
 */

export interface BlueskyFeedConfig {
  /** Bluesky handle without a leading @. */
  handle: string;
  /** Hashtags without leading #. */
  hashtags: readonly string[];
  /** Maximum number of posts shown by feed surfaces. */
  maxPosts: number;
}

export const blueskyFeedConfig = {
  handle: 'zurichjs.com',
  hashtags: ['zurichjs', 'zurichjsconf'] as const,
  maxPosts: 8,
} as const satisfies BlueskyFeedConfig;

export const BLUESKY_FEED_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
export const BLUESKY_FEED_TIMEOUT_MS = 3_000;
