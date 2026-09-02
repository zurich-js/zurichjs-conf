import { describe, expect, it } from 'vitest';
import {
  buildBadgeEntries,
  categoryCsv,
  combinedCsv,
  splitContactName,
  type BadgeExportSources,
} from '../export';
import { parseArgs } from '../../../../scripts/export-badges';

const sources: BadgeExportSources = {
  attendees: [
    {
      id: 'ticket-vip',
      first_name: 'Ada',
      last_name: 'Lovelace',
      company: 'Analytical, Engines',
      job_title: 'Programmer',
      ticket_category: 'vip',
      share_id: '11111111-2222-4333-8444-555555555555',
      badge_code: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    {
      id: 'ticket-standard',
      first_name: 'Linus',
      last_name: 'Torvalds',
      company: null,
      job_title: null,
      ticket_category: 'standard',
      share_id: '22222222-3333-4444-8555-666666666666',
      badge_code: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  ],
  speakers: [
    {
      id: 'aaaaaaaa-1111-4111-8111-111111111111',
      slug: 'alex-ng',
      first_name: 'Alex',
      last_name: 'Ng',
      company: 'Example Labs',
      job_title: 'Engineer',
      badge_code: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    },
    {
      id: 'bbbbbbbb-2222-4222-8222-222222222222',
      slug: 'alex-ng-bbbbbbbb',
      first_name: 'Alex',
      last_name: 'Ng',
      company: null,
      job_title: null,
      badge_code: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    },
  ],
  sponsors: [
    {
      id: 'sponsor-one',
      company_name: 'Color Corp',
      contact_name: 'Grace Brewster Murray Hopper',
      logo_url: 'https://cdn.example.test/mono.svg',
      logo_url_color: 'https://cdn.example.test/color.svg',
      share_id: '33333333-4444-4555-8666-777777777777',
      badge_code: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    },
  ],
  manual: [{
    id: 'manual-organizer',
    category: 'organizer',
    first_name: 'Ada',
    last_name: 'Byron',
    role: 'Organizer',
    company: 'ZurichJS',
    logo_url: null,
    share_id: '44444444-5555-4666-8777-888888888888',
    badge_code: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  }],
};

describe('badge export data', () => {
  it('builds every category and uses resolved public speaker slugs', () => {
    const entries = buildBadgeEntries(sources, 'https://conf.example.test');

    expect(entries.map((entry) => entry.category)).toEqual([
      'vip',
      'attendee',
      'speaker',
      'speaker',
      'sponsor',
      'organizer',
    ]);
    expect(entries[0].qrUrl).toBe(
      'https://conf.example.test/b/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?utm_source=offline&utm_medium=qr_code&utm_campaign=zurichjs_networking'
    );
    expect(entries[2].publicId).toBe('speaker-alex-ng');
    expect(entries[3].publicId).toBe('speaker-alex-ng-bbbbbbbb');
    expect(entries.at(-1)).toMatchObject({
      category: 'organizer',
      publicId: 'badge-44444444-5555-4666-8777-888888888888',
    });
    expect(entries.find((entry) => entry.category === 'sponsor')).toMatchObject({
      firstName: 'Grace Brewster Murray',
      lastName: 'Hopper',
      role: 'Sponsor',
      company: 'Color Corp',
      logoUrl: 'https://cdn.example.test/mono.svg',
    });
  });

  it('splits single and multi-part sponsor contact names conservatively', () => {
    expect(splitContactName('Prince')).toEqual({ firstName: 'Prince', lastName: '' });
    expect(splitContactName('  Mary Jane Watson  ')).toEqual({ firstName: 'Mary Jane', lastName: 'Watson' });
  });

  it('writes category CSVs with Illustrator variable names and escaped values', () => {
    const entries = buildBadgeEntries(sources, 'https://conf.example.test');
    const qrPaths = new Map(entries.map((entry) => [entry.selectionId, `/exports/qr/${entry.id}.png`]));
    const logoPaths = new Map([['sponsor:sponsor-one', '/exports/logos/color.svg']]);

    expect(categoryCsv('vip', entries, qrPaths, logoPaths)).toBe(
      'vip_first_name,vip_last_name,vip_role,vip_company,vip_label,@vip_qr\n' +
      'Ada,Lovelace,Programmer,"Analytical, Engines",VIP,/exports/qr/ticket-vip.png\n'
    );
    expect(categoryCsv('sponsor', entries, qrPaths, logoPaths)).toContain(
      'sponsor_first_name,sponsor_last_name,sponsor_role,sponsor_company,sponsor_label,@sponsor_qr,@sponsor_logo\n'
    );
    expect(categoryCsv('sponsor', entries, qrPaths, logoPaths)).toContain('/exports/logos/color.svg');
  });

  it('writes a sparse combined CSV with all template variables', () => {
    const entries = buildBadgeEntries(sources, 'https://conf.example.test');
    const qrPaths = new Map(entries.map((entry) => [entry.selectionId, `/qr/${entry.id}.png`]));
    const csv = combinedCsv(entries, qrPaths, new Map());
    const [headers, vipRow, attendeeRow] = csv.trimEnd().split('\n');

    expect(headers).toContain('vip_first_name');
    expect(headers).toContain('attendee_first_name');
    expect(headers).toContain('speaker_first_name');
    expect(headers).toContain('@sponsor_logo');
    expect(headers).toContain('organizer_first_name');
    expect(vipRow).toContain('Ada,Lovelace,Programmer');
    expect(attendeeRow).toContain('Linus,Torvalds');
  });
});

describe('badge export CLI arguments', () => {
  it('is read-only unless provisioning is explicitly requested', () => {
    expect(parseArgs([], 'https://conf.example.test')).toMatchObject({
      outputDir: 'badge-export',
      provisionShareIds: false,
    });
    expect(parseArgs(['--provision-share-ids', '--output', 'tmp/badges'], 'https://conf.example.test')).toMatchObject({
      outputDir: 'tmp/badges',
      provisionShareIds: true,
    });
  });

  it('rejects unsafe or incomplete URL arguments', () => {
    expect(() => parseArgs([], '')).toThrow(/NEXT_PUBLIC_BASE_URL/);
    expect(() => parseArgs(['--base-url', 'file:///tmp'], '')).toThrow(/http or https/);
    expect(() => parseArgs(['--unknown'], 'https://conf.example.test')).toThrow(/Unknown option/);
  });
});
