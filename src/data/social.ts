/**
 * Social account configuration
 *
 * Central source of truth for the ZurichJS social handles and the search terms
 * used to surface community chatter on the conference website.
 */

export interface BlueskyConfig {
  /** Bluesky handle (no leading @) — also used to link out to the profile. */
  handle: string;
  /** Hashtags to surface in the social-validation feed. No leading #. */
  hashtags: readonly string[];
  /** Max number of posts to render in the homepage feed. */
  maxPosts: number;
}

export const blueskyConfig = {
  handle: 'zurichjs.com',
  hashtags: ['zurichjs', 'zurichjsconf'] as const,
  maxPosts: 8,
} as const satisfies BlueskyConfig;
