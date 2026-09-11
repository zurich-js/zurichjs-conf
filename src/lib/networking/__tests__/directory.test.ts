/**
 * buildNetworkingDirectory shapes raw rows into the admin list. These cover
 * the joins and the rules that decide who appears: cancelled tickets vanish,
 * manual rows only show when networking was touched, disabled profiles are
 * listed but flagged, and stats add up per source.
 */

import { describe, expect, it, vi } from 'vitest';

// The builder is pure, but it shares link helpers with the public resolver,
// whose module wires up Supabase and speaker queries at import time.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BASE_URL ??= 'https://conf.zurichjs.com';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://prod-ref.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'k';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= 'pk_test_123';
});
vi.mock('@/lib/supabase', () => ({ createServiceRoleClient: vi.fn() }));
vi.mock('@/lib/queries/speakers', () => ({ fetchPublicSpeakers: vi.fn() }));

import { buildNetworkingDirectory, type NetworkingDirectoryInputs } from '../directory';

const BASE_URL = 'https://conf.zurichjs.com/';

function inputs(overrides: Partial<NetworkingDirectoryInputs> = {}): NetworkingDirectoryInputs {
  return {
    profiles: [
      {
        id: 'np-ada',
        subject_type: 'attendee',
        ticket_id: 'tkt-ada',
        sponsor_id: null,
        share_id: 'share-ada',
        enabled: true,
        profile: { linkedinUrl: 'https://linkedin.com/in/ada', xHandle: '@ada' },
        updated_at: '2026-09-01T10:00:00Z',
      },
      {
        id: 'np-bob',
        subject_type: 'attendee',
        ticket_id: 'tkt-bob',
        sponsor_id: null,
        share_id: 'share-bob',
        enabled: false,
        profile: { githubUrl: 'https://github.com/bob' },
        updated_at: '2026-09-02T10:00:00Z',
      },
      {
        id: 'np-gone',
        subject_type: 'attendee',
        ticket_id: 'tkt-refunded',
        sponsor_id: null,
        share_id: 'share-gone',
        enabled: true,
        profile: { email: 'gone@example.com' },
        updated_at: '2026-09-03T10:00:00Z',
      },
      {
        id: 'np-acme',
        subject_type: 'sponsor',
        ticket_id: null,
        sponsor_id: 'spo-acme',
        share_id: 'share-acme',
        enabled: true,
        profile: { contactName: 'Zed Sales', email: 'hello@acme.test', preferredMethod: 'email' },
        updated_at: '2026-09-04T10:00:00Z',
      },
    ],
    tickets: [
      {
        id: 'tkt-ada',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        company: 'Analytical Engines',
        job_title: 'Engineer',
        ticket_category: 'vip',
        status: 'confirmed',
      },
      {
        id: 'tkt-bob',
        first_name: 'Bob',
        last_name: 'Builder',
        email: 'bob@example.com',
        company: null,
        job_title: null,
        ticket_category: 'standard',
        status: 'confirmed',
      },
      {
        id: 'tkt-refunded',
        first_name: 'Gone',
        last_name: 'Person',
        email: 'gone@example.com',
        company: null,
        job_title: null,
        ticket_category: 'standard',
        status: 'refunded',
      },
    ],
    sponsors: [
      { id: 'spo-acme', company_name: 'ACME', contact_name: 'Wile E.', contact_email: 'wile@acme.test' },
    ],
    manualRows: [
      {
        id: 'man-org',
        category: 'organizer',
        first_name: 'Olga',
        last_name: 'Organizer',
        role: 'Lead',
        company: 'ZurichJS',
        share_id: 'share-olga',
        networking_enabled: true,
        networking_profile: { websiteUrl: 'https://zurichjs.com' },
        updated_at: '2026-09-05T10:00:00Z',
      },
      {
        id: 'man-blank',
        category: 'vip',
        first_name: 'Blank',
        last_name: 'Badge',
        role: '',
        company: '',
        share_id: 'share-blank',
        networking_enabled: false,
        networking_profile: {},
        updated_at: '2026-09-06T10:00:00Z',
      },
    ],
    ...overrides,
  };
}

describe('buildNetworkingDirectory', () => {
  it('joins attendees, sponsors and manual rows and drops non-confirmed tickets and untouched badges', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    expect(entries.map((entry) => entry.id)).toEqual(['np-acme', 'np-ada', 'man-org', 'np-bob']);
  });

  it('lists public entries first, then alphabetically', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    expect(entries.map((entry) => [entry.name, entry.enabled])).toEqual([
      ['ACME', true],
      ['Ada Lovelace', true],
      ['Olga Organizer', true],
      ['Bob Builder', false],
    ]);
  });

  it('shapes an attendee entry with kind, headline, contact email, links and share URL', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    const ada = entries.find((entry) => entry.id === 'np-ada')!;
    expect(ada).toMatchObject({
      source: 'attendee',
      kind: 'vip',
      name: 'Ada Lovelace',
      headline: 'Engineer @ Analytical Engines',
      contactEmail: 'ada@example.com',
      enabled: true,
      publicId: 'attendee-share-ada',
      shareUrl: 'https://conf.zurichjs.com/share/attendee-share-ada',
      updatedAt: '2026-09-01T10:00:00Z',
    });
    expect(ada.links.map((link) => link.kind)).toEqual(['linkedin', 'x']);
  });

  it('uses the sponsor company name, networking contact name and internal contact email', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    const acme = entries.find((entry) => entry.id === 'np-acme')!;
    expect(acme).toMatchObject({
      source: 'sponsor',
      kind: 'sponsor',
      name: 'ACME',
      headline: 'Zed Sales',
      contactEmail: 'wile@acme.test',
      publicId: 'sponsor-share-acme',
    });
    expect(acme.links.map((link) => link.kind)).toEqual(['email']);
  });

  it('keeps disabled attendee rows so admins can see who switched off', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    const bob = entries.find((entry) => entry.id === 'np-bob')!;
    expect(bob.enabled).toBe(false);
    expect(bob.kind).toBe('attendee');
    expect(bob.headline).toBeNull();
    expect(bob.links.map((link) => link.kind)).toEqual(['github']);
  });

  it('maps manual badge rows to badge share pages with their category as kind', () => {
    const { entries } = buildNetworkingDirectory(inputs(), BASE_URL);
    const olga = entries.find((entry) => entry.id === 'man-org')!;
    expect(olga).toMatchObject({
      source: 'manual',
      kind: 'organizer',
      headline: 'Lead @ ZurichJS',
      contactEmail: null,
      publicId: 'badge-share-olga',
      shareUrl: 'https://conf.zurichjs.com/share/badge-share-olga',
    });
  });

  it('includes a manual row that saved links but is switched off', () => {
    const { entries } = buildNetworkingDirectory(
      inputs({
        manualRows: [
          {
            id: 'man-off',
            category: 'speaker',
            first_name: 'Sam',
            last_name: 'Speaker',
            role: '',
            company: '',
            share_id: 'share-sam',
            networking_enabled: false,
            networking_profile: { githubUrl: 'https://github.com/sam' },
            updated_at: '2026-09-07T10:00:00Z',
          },
        ],
      }),
      BASE_URL
    );
    expect(entries.some((entry) => entry.id === 'man-off' && entry.enabled === false)).toBe(true);
  });

  it('drops profiles whose subject record is missing', () => {
    const { entries } = buildNetworkingDirectory(inputs({ tickets: [], sponsors: [] }), BASE_URL);
    expect(entries.map((entry) => entry.id)).toEqual(['man-org']);
  });

  it('returns an empty link list for an unparseable profile instead of failing', () => {
    const { entries } = buildNetworkingDirectory(
      inputs({
        profiles: [
          {
            id: 'np-bad',
            subject_type: 'attendee',
            ticket_id: 'tkt-ada',
            sponsor_id: null,
            share_id: 'share-bad',
            enabled: true,
            profile: { linkedinUrl: 'https://evil.example/not-linkedin' },
            updated_at: '2026-09-01T10:00:00Z',
          },
        ],
        manualRows: [],
      }),
      BASE_URL
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].links).toEqual([]);
  });

  it('counts totals and public entries per source', () => {
    const { stats } = buildNetworkingDirectory(inputs(), BASE_URL);
    expect(stats).toEqual({
      total: 4,
      enabled: 3,
      bySource: {
        attendee: { total: 2, enabled: 1 },
        sponsor: { total: 1, enabled: 1 },
        manual: { total: 1, enabled: 1 },
      },
    });
  });
});
