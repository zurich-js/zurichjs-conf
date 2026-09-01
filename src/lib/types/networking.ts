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
