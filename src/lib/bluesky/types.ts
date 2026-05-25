export interface BlueskyFeedAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface BlueskyFeedPost {
  uri: string;
  webUrl: string;
  text: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  author: BlueskyFeedAuthor;
  isFromOfficial: boolean;
}

export interface BlueskyFeedDebugEntry {
  source: string;
  status: 'ok' | 'error';
  count: number;
  error?: string;
}

export interface BlueskyFeedDebug {
  authenticated: boolean;
  entries: BlueskyFeedDebugEntry[];
}

export interface BlueskyFeedResult {
  posts: BlueskyFeedPost[];
  nextCursor?: string;
  debug?: BlueskyFeedDebug;
}
