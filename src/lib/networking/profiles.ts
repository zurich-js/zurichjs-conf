/**
 * Server-only public networking profile resolution.
 *
 * Each resolver starts from a namespaced public identifier and returns the
 * narrow, explicitly public contract used by /share/[id].
 */

import { logger } from '@/lib/logger';
import { fetchPublicSpeakers } from '@/lib/queries/speakers';
import { createServiceRoleClient } from '@/lib/supabase';
import type {
  AttendeeNetworkingProfile,
  PublicNetworkingLink,
  PublicNetworkingProfile,
  SponsorNetworkingProfile,
} from '@/lib/types/networking';
import type { PublicSpeaker } from '@/lib/types/cfp';
import {
  attendeeNetworkingProfileSchema,
  sponsorNetworkingProfileSchema,
} from '@/lib/validations/networking';

const log = logger.scope('Public Networking Profiles');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SPEAKER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ParsedPublicId =
  | { kind: 'attendee'; shareId: string }
  | { kind: 'sponsor'; shareId: string }
  | { kind: 'speaker'; slug: string }
  | { kind: 'badge'; shareId: string };

function parsePublicId(publicId: string): ParsedPublicId | null {
  if (publicId.startsWith('attendee-')) {
    const shareId = publicId.slice('attendee-'.length);
    return UUID_PATTERN.test(shareId) ? { kind: 'attendee', shareId } : null;
  }

  if (publicId.startsWith('sponsor-')) {
    const shareId = publicId.slice('sponsor-'.length);
    return UUID_PATTERN.test(shareId) ? { kind: 'sponsor', shareId } : null;
  }

  if (publicId.startsWith('speaker-')) {
    const slug = publicId.slice('speaker-'.length);
    return slug.length <= 160 && SPEAKER_SLUG_PATTERN.test(slug) ? { kind: 'speaker', slug } : null;
  }

  if (publicId.startsWith('badge-')) {
    const shareId = publicId.slice('badge-'.length);
    return UUID_PATTERN.test(shareId) ? { kind: 'badge', shareId } : null;
  }

  return null;
}

export function isValidNetworkingPublicId(publicId: string): boolean {
  return parsePublicId(publicId) !== null;
}

function headline(role: string | null, company: string | null): string | null {
  const cleanRole = role?.trim() || null;
  const cleanCompany = company?.trim() || null;
  if (cleanRole && cleanCompany) return `${cleanRole} @ ${cleanCompany}`;
  return cleanRole ?? cleanCompany;
}

function profileWithoutLinks(
  publicId: string,
  kind: PublicNetworkingProfile['kind'],
  name: string,
  profileHeadline: string | null,
  imageUrl: string | null
): PublicNetworkingProfile {
  return {
    publicId,
    kind,
    name,
    headline: profileHeadline,
    imageUrl,
    links: [],
    path: `/share/${publicId}`,
  };
}

function sponsorContactName(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const contactName = (value as Record<string, unknown>).contactName;
  if (typeof contactName !== 'string') return null;
  const trimmed = contactName.trim();
  return trimmed.length > 0 && trimmed.length <= 120 ? trimmed : null;
}

function handleUrl(baseUrl: string, handle: string | null): string | null {
  const value = handle?.replace(/^@/, '').trim();
  return value ? `${baseUrl}${encodeURIComponent(value)}` : null;
}

function attendeeLinks(profile: AttendeeNetworkingProfile): PublicNetworkingLink[] {
  const mastodon = canonicalMastodonUrl(profile.mastodonHandle);
  const links: Array<PublicNetworkingLink | null> = [
    profile.email ? { kind: 'email', label: 'Email', href: `mailto:${profile.email}` } : null,
    profile.linkedinUrl ? { kind: 'linkedin', label: 'LinkedIn', href: profile.linkedinUrl } : null,
    profile.githubUrl ? { kind: 'github', label: 'GitHub', href: profile.githubUrl } : null,
    handleUrl('https://x.com/', profile.xHandle)
      ? { kind: 'x', label: 'X', href: handleUrl('https://x.com/', profile.xHandle)! }
      : null,
    handleUrl('https://bsky.app/profile/', profile.blueskyHandle)
      ? { kind: 'bluesky', label: 'Bluesky', href: handleUrl('https://bsky.app/profile/', profile.blueskyHandle)! }
      : null,
    mastodon ? { kind: 'mastodon', label: 'Mastodon', href: mastodon } : null,
    profile.websiteUrl ? { kind: 'website', label: 'Website', href: profile.websiteUrl } : null,
  ];

  return links.filter((link): link is PublicNetworkingLink => link !== null);
}

function phoneHref(phone: string | null): string | null {
  if (!phone || !/^[+()\d\s.-]+$/.test(phone)) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`;
}

function sponsorLinks(profile: SponsorNetworkingProfile): PublicNetworkingLink[] {
  const phone = phoneHref(profile.phone);
  const links: Array<{ method: NonNullable<SponsorNetworkingProfile['preferredMethod']>; link: PublicNetworkingLink }> = [];

  if (profile.email) {
    links.push({ method: 'email', link: { kind: 'email', label: 'Email', href: `mailto:${profile.email}` } });
  }
  if (phone) {
    links.push({ method: 'phone', link: { kind: 'phone', label: 'Phone', href: phone } });
  }
  if (profile.websiteUrl) {
    links.push({ method: 'website', link: { kind: 'website', label: 'Website', href: profile.websiteUrl } });
  }
  if (profile.linkedinUrl) {
    links.push({
      method: 'linkedin',
      link: { kind: 'linkedin', label: 'LinkedIn', href: profile.linkedinUrl },
    });
  }

  if (profile.preferredMethod) {
    links.sort((left, right) => {
      if (left.method === profile.preferredMethod) return -1;
      if (right.method === profile.preferredMethod) return 1;
      return 0;
    });
  }

  return links.map(({ link }) => link);
}

function canonicalMastodonUrl(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!['http:', 'https:'].includes(url.protocol) || !/^\/@[^/]+\/?$/.test(url.pathname)) return null;
      return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
    } catch {
      return null;
    }
  }

  const federatedHandle = trimmed.match(/^@?([a-z0-9_.-]+)@([a-z0-9.-]+\.[a-z]{2,})$/i);
  if (federatedHandle) {
    return `https://${federatedHandle[2].toLowerCase()}/@${federatedHandle[1]}`;
  }

  const mastodonSocialHandle = trimmed.match(/^@?([a-z0-9_.-]+)$/i);
  return mastodonSocialHandle ? `https://mastodon.social/@${mastodonSocialHandle[1]}` : null;
}

function speakerLinks(speaker: PublicSpeaker): PublicNetworkingLink[] {
  const linkedin = attendeeNetworkingProfileSchema.safeParse({ linkedinUrl: speaker.socials.linkedin_url });
  const github = attendeeNetworkingProfileSchema.safeParse({ githubUrl: speaker.socials.github_url });
  const x = attendeeNetworkingProfileSchema.safeParse({ xHandle: speaker.socials.twitter_handle });
  const bluesky = attendeeNetworkingProfileSchema.safeParse({ blueskyHandle: speaker.socials.bluesky_handle });
  const mastodon = canonicalMastodonUrl(speaker.socials.mastodon_handle);
  const xUrl = x.success ? handleUrl('https://x.com/', x.data.xHandle) : null;
  const blueskyUrl = bluesky.success ? handleUrl('https://bsky.app/profile/', bluesky.data.blueskyHandle) : null;

  const links: Array<PublicNetworkingLink | null> = [
    linkedin.success && linkedin.data.linkedinUrl
      ? { kind: 'linkedin', label: 'LinkedIn', href: linkedin.data.linkedinUrl }
      : null,
    github.success && github.data.githubUrl
      ? { kind: 'github', label: 'GitHub', href: github.data.githubUrl }
      : null,
    xUrl ? { kind: 'x', label: 'X', href: xUrl } : null,
    blueskyUrl ? { kind: 'bluesky', label: 'Bluesky', href: blueskyUrl } : null,
    mastodon ? { kind: 'mastodon', label: 'Mastodon', href: mastodon } : null,
  ];

  return links.filter((link): link is PublicNetworkingLink => link !== null);
}

async function resolveAttendee(publicId: string, shareId: string): Promise<PublicNetworkingProfile | null> {
  const supabase = createServiceRoleClient();
  const { data: networking, error: networkingError } = await supabase
    .from('networking_profiles')
    .select('ticket_id, enabled, profile')
    .eq('share_id', shareId)
    .eq('subject_type', 'attendee')
    .maybeSingle();

  if (networkingError) {
    log.error('Failed to resolve attendee networking profile', networkingError, { publicId });
    return null;
  }
  if (!networking?.ticket_id) return null;

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('first_name, last_name, company, job_title, status')
    .eq('id', networking.ticket_id)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (ticketError) {
    log.error('Failed to resolve attendee identity for networking', ticketError, { publicId });
    return null;
  }
  if (!ticket || ticket.status !== 'confirmed') return null;

  const name = `${ticket.first_name} ${ticket.last_name}`.trim();
  if (!networking.enabled) {
    return profileWithoutLinks(
      publicId,
      'attendee',
      name,
      headline(ticket.job_title, ticket.company),
      null
    );
  }

  const profileResult = attendeeNetworkingProfileSchema.safeParse(networking.profile);
  if (!profileResult.success) return null;

  const links = attendeeLinks(profileResult.data);
  if (links.length === 0) return null;

  return {
    publicId,
    kind: 'attendee',
    name,
    headline: headline(ticket.job_title, ticket.company),
    imageUrl: null,
    links,
    path: `/share/${publicId}`,
  };
}

async function resolveSponsor(publicId: string, shareId: string): Promise<PublicNetworkingProfile | null> {
  const supabase = createServiceRoleClient();
  const { data: networking, error: networkingError } = await supabase
    .from('networking_profiles')
    .select('sponsor_id, enabled, profile')
    .eq('share_id', shareId)
    .eq('subject_type', 'sponsor')
    .maybeSingle();

  if (networkingError) {
    log.error('Failed to resolve sponsor networking profile', networkingError, { publicId });
    return null;
  }
  if (!networking?.sponsor_id) return null;

  const { data: sponsor, error: sponsorError } = await supabase
    .from('sponsors')
    .select('company_name, logo_url, logo_url_color')
    .eq('id', networking.sponsor_id)
    .maybeSingle();

  if (sponsorError) {
    log.error('Failed to resolve sponsor identity for networking', sponsorError, { publicId });
    return null;
  }
  if (!sponsor) return null;

  if (!networking.enabled) {
    return profileWithoutLinks(
      publicId,
      'sponsor',
      sponsor.company_name,
      sponsorContactName(networking.profile),
      sponsor.logo_url ?? sponsor.logo_url_color
    );
  }

  const profileResult = sponsorNetworkingProfileSchema.safeParse(networking.profile);
  if (!profileResult.success) return null;

  const links = sponsorLinks(profileResult.data);
  if (links.length === 0) return null;

  return {
    publicId,
    kind: 'sponsor',
    name: sponsor.company_name,
    headline: profileResult.data.contactName,
    imageUrl: sponsor.logo_url ?? sponsor.logo_url_color,
    links,
    path: `/share/${publicId}`,
  };
}

async function resolveSpeaker(publicId: string, slug: string): Promise<PublicNetworkingProfile | null> {
  const { speakers } = await fetchPublicSpeakers();
  const speaker = speakers.find((entry) => entry.slug === slug);
  if (!speaker) return null;

  const links = speakerLinks(speaker);
  if (links.length === 0) return null;

  return {
    publicId,
    kind: 'speaker',
    name: `${speaker.first_name} ${speaker.last_name}`.trim(),
    headline: headline(speaker.job_title, speaker.company),
    imageUrl: speaker.profile_image_url,
    links,
    path: `/share/${publicId}`,
  };
}

async function resolveManualBadge(publicId: string, shareId: string): Promise<PublicNetworkingProfile | null> {
  const { data, error } = await createServiceRoleClient()
    .from('manual_badge_entries')
    .select('category, first_name, last_name, role, company, logo_url, networking_enabled, networking_profile')
    .eq('share_id', shareId)
    .maybeSingle();

  if (error) {
    log.error('Failed to resolve manual badge networking profile', error, { publicId });
    return null;
  }
  if (!data) return null;

  const kind = data.category === 'vip' || data.category === 'attendee' ||
    data.category === 'speaker' || data.category === 'sponsor' || data.category === 'organizer'
    ? data.category
    : 'attendee';
  const name = `${data.first_name} ${data.last_name}`.trim();

  if (!data.networking_enabled) {
    return profileWithoutLinks(
      publicId,
      kind,
      name,
      headline(data.role, data.company),
      data.logo_url
    );
  }

  const profileResult = attendeeNetworkingProfileSchema.safeParse(data.networking_profile);
  if (!profileResult.success) return null;
  const links = attendeeLinks(profileResult.data);
  if (links.length === 0) return null;

  return {
    publicId,
    kind,
    name,
    headline: headline(data.role, data.company),
    imageUrl: data.logo_url,
    links,
    path: `/share/${publicId}`,
  };
}

export async function resolvePublicNetworkingProfile(publicId: string): Promise<PublicNetworkingProfile | null> {
  const parsed = parsePublicId(publicId);
  if (!parsed) return null;

  if (parsed.kind === 'attendee') return resolveAttendee(publicId, parsed.shareId);
  if (parsed.kind === 'sponsor') return resolveSponsor(publicId, parsed.shareId);
  if (parsed.kind === 'speaker') return resolveSpeaker(publicId, parsed.slug);
  return resolveManualBadge(publicId, parsed.shareId);
}
