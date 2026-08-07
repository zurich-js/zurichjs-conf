import { describe, expect, it } from 'vitest';
import {
  attendeeNetworkingProfileSchema,
  attendeeNetworkingUpdateSchema,
  sponsorNetworkingProfileSchema,
} from '../networking';

describe('networking validation', () => {
  it('normalizes supported attendee links and handles', () => {
    const result = attendeeNetworkingProfileSchema.safeParse({
      linkedinUrl: 'linkedin.com/in/ada',
      githubUrl: 'www.github.com/ada',
      xHandle: 'https://twitter.com/ada_dev/',
      blueskyHandle: 'https://bsky.app/profile/ada.bsky.social',
      mastodonHandle: 'https://Fosstodon.org/@Ada/',
      websiteUrl: 'ada.example.com',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      linkedinUrl: 'https://linkedin.com/in/ada',
      githubUrl: 'https://github.com/ada',
      xHandle: '@ada_dev',
      blueskyHandle: '@ada.bsky.social',
      mastodonHandle: '@ada@fosstodon.org',
      websiteUrl: 'https://ada.example.com',
    });
  });

  it.each([
    ['@ada@fosstodon.org', '@ada@fosstodon.org'],
    ['ada@fosstodon.org', '@ada@fosstodon.org'],
    ['https://fosstodon.org/@ada/', '@ada@fosstodon.org'],
    ['http://FOSSTODON.org/@ADA?source=profile', '@ada@fosstodon.org'],
  ])('normalizes Mastodon identity %s', (input, expected) => {
    const result = attendeeNetworkingProfileSchema.safeParse({ mastodonHandle: input });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mastodonHandle).toBe(expected);
  });

  it.each([
    '@ada',
    '@ada@localhost',
    '@ada@fosstodon',
    'https://fosstodon.org/users/ada',
    'https://user:password@fosstodon.org/@ada',
    'https://127.0.0.1/@ada',
    'ftp://fosstodon.org/@ada',
    'javascript:alert(1)',
  ])('rejects unsafe or non-federated Mastodon identity %s', (mastodonHandle) => {
    expect(attendeeNetworkingProfileSchema.safeParse({ mastodonHandle }).success).toBe(false);
  });

  it.each([
    { linkedinUrl: 'https://example.com/in/ada' },
    { linkedinUrl: 'https://linkedin.com.evil.example/in/ada' },
    { githubUrl: 'https://example.com/ada' },
    { githubUrl: 'https://github.com.evil.example/ada' },
  ])('rejects social profile URLs on the wrong host: $linkedinUrl$githubUrl', (profile) => {
    expect(attendeeNetworkingProfileSchema.safeParse(profile).success).toBe(false);
  });

  it.each([
    { xHandle: 'https://example.com/ada' },
    { xHandle: 'https://bsky.app/profile/ada' },
    { blueskyHandle: 'https://example.com/ada' },
    { blueskyHandle: 'https://x.com/ada' },
  ])('rejects absolute handle URLs from unrecognized networks', (profile) => {
    expect(attendeeNetworkingProfileSchema.safeParse(profile).success).toBe(false);
  });

  it('rejects non-HTTP website protocols', () => {
    expect(attendeeNetworkingProfileSchema.safeParse({ websiteUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(attendeeNetworkingProfileSchema.safeParse({ websiteUrl: 'ftp://example.com' }).success).toBe(false);
  });

  it('requires at least one link when an attendee enables sharing', () => {
    const result = attendeeNetworkingUpdateSchema.safeParse({
      token: 'signed-token',
      enabled: true,
      profile: {},
    });

    expect(result.success).toBe(false);
  });

  it('enforces the LinkedIn host for sponsors too', () => {
    expect(
      sponsorNetworkingProfileSchema.safeParse({ linkedinUrl: 'https://evil.example/company/sponsor' }).success
    ).toBe(false);
    expect(
      sponsorNetworkingProfileSchema.safeParse({ linkedinUrl: 'linkedin.com/company/sponsor' }).success
    ).toBe(true);
  });

  it('accepts international phone formatting and rejects unsafe or implausible values', () => {
    expect(sponsorNetworkingProfileSchema.safeParse({ phone: '+41 (44) 555-01-23' }).success).toBe(true);
    expect(sponsorNetworkingProfileSchema.safeParse({ phone: 'javascript:alert(1)' }).success).toBe(false);
    expect(sponsorNetworkingProfileSchema.safeParse({ phone: '123' }).success).toBe(false);
  });
});
