export type NetworkingProfileKind = 'attendee' | 'vip' | 'speaker' | 'sponsor' | 'organizer';

export type NetworkingLinkKind =
  | 'linkedin'
  | 'github'
  | 'x'
  | 'bluesky'
  | 'mastodon'
  | 'website'
  | 'email'
  | 'phone';

export interface AttendeeNetworkingProfile {
  email: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  xHandle: string | null;
  blueskyHandle: string | null;
  mastodonHandle: string | null;
  websiteUrl: string | null;
}

export interface SponsorNetworkingProfile {
  contactName: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  preferredMethod: 'email' | 'phone' | 'website' | 'linkedin' | null;
}

export interface NetworkingSettings<T> {
  shareId: string | null;
  enabled: boolean;
  profile: T;
}

export interface PublicNetworkingLink {
  kind: NetworkingLinkKind;
  label: string;
  href: string;
}

export interface PublicNetworkingProfile {
  publicId: string;
  kind: NetworkingProfileKind;
  name: string;
  headline: string | null;
  imageUrl: string | null;
  links: PublicNetworkingLink[];
  path: string;
}

export interface SavedNetworkingProfile extends PublicNetworkingProfile {
  savedAt: string;
  version: 1;
}

/** Where an admin directory entry's networking settings live. */
export type NetworkingDirectorySource = 'attendee' | 'sponsor' | 'manual';

/** One row of the admin networking directory (/admin/networking). */
export interface NetworkingDirectoryEntry {
  id: string;
  source: NetworkingDirectorySource;
  kind: NetworkingProfileKind;
  name: string;
  headline: string | null;
  /** Internal contact email (ticket / sponsor contact) — admin-only, never the public profile. */
  contactEmail: string | null;
  enabled: boolean;
  links: PublicNetworkingLink[];
  publicId: string;
  shareUrl: string;
  updatedAt: string;
}

export interface NetworkingDirectoryStats {
  total: number;
  enabled: number;
  bySource: Record<NetworkingDirectorySource, { total: number; enabled: number }>;
}

export interface NetworkingDirectoryResponse {
  entries: NetworkingDirectoryEntry[];
  stats: NetworkingDirectoryStats;
  generated_at: string;
}
