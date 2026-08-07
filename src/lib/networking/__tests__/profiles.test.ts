import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };

const tableResults = new Map<string, QueryResult>();
const selectCalls: Array<{ table: string; columns: string }> = [];
const mockFetchPublicSpeakers = vi.fn();

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      const builder = {
        select: (columns: string) => {
          selectCalls.push({ table, columns });
          return builder;
        },
        eq: () => builder,
        maybeSingle: () => Promise.resolve(tableResults.get(table) ?? { data: null, error: null }),
      };
      return builder;
    },
  }),
}));

vi.mock('@/lib/queries/speakers', () => ({
  fetchPublicSpeakers: (...args: unknown[]) => mockFetchPublicSpeakers(...args),
}));

import { isValidNetworkingPublicId, resolvePublicNetworkingProfile } from '../profiles';

const SHARE_ID = '11111111-2222-4333-8444-555555555555';
const TICKET_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const SPONSOR_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

describe('public networking profiles', () => {
  beforeEach(() => {
    tableResults.clear();
    selectCalls.length = 0;
    mockFetchPublicSpeakers.mockReset();
    mockFetchPublicSpeakers.mockResolvedValue({ speakers: [], programSpeakerCount: 0 });
  });

  it('strictly validates namespaced public IDs', () => {
    expect(isValidNetworkingPublicId(`attendee-${SHARE_ID}`)).toBe(true);
    expect(isValidNetworkingPublicId(`sponsor-${SHARE_ID}`)).toBe(true);
    expect(isValidNetworkingPublicId('speaker-alex-ng')).toBe(true);

    expect(isValidNetworkingPublicId(SHARE_ID)).toBe(false);
    expect(isValidNetworkingPublicId('attendee-not-a-uuid')).toBe(false);
    expect(isValidNetworkingPublicId('attendee-AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE')).toBe(false);
    expect(isValidNetworkingPublicId('speaker-Alex-Ng')).toBe(false);
    expect(isValidNetworkingPublicId('speaker-alex/ng')).toBe(false);
    expect(isValidNetworkingPublicId('sponsor-11111111-2222-4333-8444-555555555555?admin=true')).toBe(false);
  });

  it('returns null for malformed IDs without querying private data', async () => {
    expect(await resolvePublicNetworkingProfile('attendee-not-a-uuid')).toBeNull();
    expect(selectCalls).toHaveLength(0);
    expect(mockFetchPublicSpeakers).not.toHaveBeenCalled();
  });

  it('resolves an enabled attendee through a confirmed ticket with a safe projection', async () => {
    tableResults.set('networking_profiles', {
      data: {
        ticket_id: TICKET_ID,
        profile: {
          linkedinUrl: 'linkedin.com/in/ada',
          githubUrl: 'github.com/ada',
          xHandle: 'ada_dev',
          blueskyHandle: 'ada.bsky.social',
          mastodonHandle: 'https://fosstodon.org/@ada',
          websiteUrl: 'ada.example.com',
        },
      },
      error: null,
    });
    tableResults.set('tickets', {
      data: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        company: 'Analytical Engines',
        job_title: 'Programmer',
        status: 'confirmed',
        email: 'private@example.com',
      },
      error: null,
    });

    const profile = await resolvePublicNetworkingProfile(`attendee-${SHARE_ID}`);

    expect(profile).toEqual({
      publicId: `attendee-${SHARE_ID}`,
      kind: 'attendee',
      name: 'Ada Lovelace',
      headline: 'Programmer @ Analytical Engines',
      imageUrl: null,
      links: [
        { kind: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/ada' },
        { kind: 'github', label: 'GitHub', href: 'https://github.com/ada' },
        { kind: 'x', label: 'X', href: 'https://x.com/ada_dev' },
        { kind: 'bluesky', label: 'Bluesky', href: 'https://bsky.app/profile/ada.bsky.social' },
        { kind: 'mastodon', label: 'Mastodon', href: 'https://fosstodon.org/@ada' },
        { kind: 'website', label: 'Website', href: 'https://ada.example.com' },
      ],
      path: `/share/attendee-${SHARE_ID}`,
    });
    expect(JSON.stringify(profile)).not.toContain(TICKET_ID);
    expect(JSON.stringify(profile)).not.toContain('private@example.com');
    expect(selectCalls.find((call) => call.table === 'tickets')?.columns).toBe(
      'first_name, last_name, company, job_title, status'
    );
  });

  it('rejects an attendee with an unconfirmed ticket or malformed stored profile', async () => {
    tableResults.set('networking_profiles', {
      data: {
        ticket_id: TICKET_ID,
        profile: {
          linkedinUrl: null,
          githubUrl: null,
          xHandle: null,
          blueskyHandle: null,
          mastodonHandle: null,
          websiteUrl: 'https://example.com',
        },
      },
      error: null,
    });
    tableResults.set('tickets', {
      data: { first_name: 'Ada', last_name: 'Lovelace', company: null, job_title: null, status: 'cancelled' },
      error: null,
    });

    expect(await resolvePublicNetworkingProfile(`attendee-${SHARE_ID}`)).toBeNull();

    tableResults.set('networking_profiles', {
      data: { ticket_id: TICKET_ID, profile: { email: 'not-public@example.com' } },
      error: null,
    });
    expect(await resolvePublicNetworkingProfile(`attendee-${SHARE_ID}`)).toBeNull();
  });

  it('resolves only explicitly configured sponsor contacts and narrowly selected branding', async () => {
    tableResults.set('networking_profiles', {
      data: {
        sponsor_id: SPONSOR_ID,
        profile: {
          contactName: 'Grace Hopper',
          email: 'networking@example.com',
          phone: '+41 (44) 555-01-23',
          websiteUrl: 'https://example.com',
          linkedinUrl: 'https://linkedin.com/in/example',
          preferredMethod: 'phone',
        },
      },
      error: null,
    });
    tableResults.set('sponsors', {
      data: {
        company_name: 'Example Sponsor',
        logo_url: 'https://cdn.example.com/logo.svg',
        logo_url_color: 'https://cdn.example.com/logo-color.svg',
        contact_email: 'billing-private@example.com',
        billing_address_street: 'Private Street 1',
      },
      error: null,
    });

    const profile = await resolvePublicNetworkingProfile(`sponsor-${SHARE_ID}`);

    expect(profile?.links[0]).toEqual({ kind: 'phone', label: 'Phone', href: 'tel:+41445550123' });
    expect(profile).toMatchObject({
      kind: 'sponsor',
      name: 'Example Sponsor',
      headline: 'Grace Hopper',
      imageUrl: 'https://cdn.example.com/logo-color.svg',
    });
    expect(JSON.stringify(profile)).not.toContain(SPONSOR_ID);
    expect(JSON.stringify(profile)).not.toContain('billing-private@example.com');
    expect(selectCalls.find((call) => call.table === 'sponsors')?.columns).toBe(
      'company_name, logo_url, logo_url_color'
    );
  });

  it('maps only public speaker data and drops unsafe social URLs', async () => {
    mockFetchPublicSpeakers.mockResolvedValue({
      programSpeakerCount: 1,
      speakers: [
        {
          id: 'speaker-private-id',
          slug: 'alex-ng',
          first_name: 'Alex',
          last_name: 'Ng',
          job_title: 'Engineer',
          company: 'Example Labs',
          bio: null,
          profile_image_url: '/alex.png',
          header_image_url: null,
          portrait_foreground_url: null,
          portrait_background_url: null,
          is_featured: true,
          speaker_role: 'speaker',
          tags: [],
          socials: {
            linkedin_url: 'https://linkedin.com/in/alex',
            github_url: 'https://github.com/alex',
            twitter_handle: 'https://evil.example/alex',
            bluesky_handle: '@alex.bsky.social',
            mastodon_handle: '@alex@fosstodon.org',
          },
          assigned_session_kinds: { talks: true, workshops: false },
          sessions: [],
          email: 'speaker-private@example.com',
        },
      ],
    });

    const profile = await resolvePublicNetworkingProfile('speaker-alex-ng');

    expect(profile).toEqual({
      publicId: 'speaker-alex-ng',
      kind: 'speaker',
      name: 'Alex Ng',
      headline: 'Engineer @ Example Labs',
      imageUrl: '/alex.png',
      links: [
        { kind: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/alex' },
        { kind: 'github', label: 'GitHub', href: 'https://github.com/alex' },
        { kind: 'bluesky', label: 'Bluesky', href: 'https://bsky.app/profile/alex.bsky.social' },
        { kind: 'mastodon', label: 'Mastodon', href: 'https://fosstodon.org/@alex' },
      ],
      path: '/share/speaker-alex-ng',
    });
    expect(JSON.stringify(profile)).not.toContain('speaker-private-id');
    expect(JSON.stringify(profile)).not.toContain('speaker-private@example.com');
  });
});
