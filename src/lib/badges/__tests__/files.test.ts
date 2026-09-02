import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { buildBadgeExportFiles } from '../files';
import { createZip } from '../zip';
import type { BadgeExportSources } from '../export';

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(async (value: string) => Buffer.from(`png:${value}`)),
  },
}));
vi.mock('@/lib/badges/pdf', () => ({
  buildBadgePdfFiles: vi.fn(async () => [{
    name: 'pdf/vip/ada-lovelace-attendee-ticket-1.pdf',
    data: Buffer.from('pdf'),
  }]),
}));

const sources: BadgeExportSources = {
  attendees: [{
    id: 'ticket-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    company: 'Engines',
    job_title: 'Programmer',
    ticket_category: 'vip',
  share_id: '11111111-2222-4333-8444-555555555555',
  badge_code: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }],
  speakers: [{
    id: 'public-speaker',
    slug: 'public-speaker',
    first_name: 'Public',
    last_name: 'Speaker',
    company: 'ZurichJS',
  job_title: 'Speaker',
  badge_code: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  }],
  sponsors: [{
    id: 'sponsor-1',
    company_name: 'Sponsor Co',
    contact_name: 'Grace Hopper',
    logo_url: 'https://cdn.example.test/mono.png',
    logo_url_color: 'https://cdn.example.test/color.png',
  share_id: '22222222-3333-4444-8555-666666666666',
  badge_code: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  }],
  manual: [],
};

describe('deployed badge export files', () => {
  it('builds relative archive paths, public speaker QRs, and default sponsor logos', async () => {
    const fetchLogo = vi.fn(async () => new Response(Buffer.from('color-logo'), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    }));
    const files = await buildBadgeExportFiles(sources, 'https://conf.example.test', {
      csvPath: (fileName) => fileName,
      fetchLogo,
    });

    expect(files.map((file) => file.name)).toContain('qr/speaker-public-speaker.png');
    expect(files.map((file) => file.name)).toContain('logos/sponsor-sponsor-1.png');
    expect(fetchLogo).toHaveBeenCalledWith(new URL('https://cdn.example.test/mono.png'));
    expect(files.find((file) => file.name === 'speaker.csv')?.data.toString()).toContain(
      'qr/speaker-public-speaker.png'
    );
    expect(files.find((file) => file.name === 'manifest.json')?.data.toString()).toContain(
      'public lineup (is_visible=true)'
    );
  });

  it('creates a standards-compatible ZIP archive', () => {
    const archive = createZip([
      { name: 'badges.csv', data: Buffer.from('first_name\nAda\n') },
      { name: 'qr/ada.png', data: Buffer.from('png') },
    ], new Date('2026-08-31T12:00:00Z'));
    const directory = mkdtempSync(path.join(tmpdir(), 'badge-zip-'));
    const archivePath = path.join(directory, 'badges.zip');
    writeFileSync(archivePath, archive);

    const listing = execFileSync('unzip', ['-t', archivePath], { encoding: 'utf8' });
    expect(listing).toContain('testing: badges.csv');
    expect(listing).toContain('testing: qr/ada.png');
    expect(listing).toContain('No errors detected');
  });

  it('can return print PDFs without CSV, QR, logo, or manifest files', async () => {
    const files = await buildBadgeExportFiles(sources, 'https://conf.example.test', {
      csvPath: (fileName) => fileName,
      includeDataFiles: false,
      fetchLogo: async () => new Response(Buffer.from('logo'), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    });

    expect(files).toEqual([{
      name: 'pdf/vip/ada-lovelace-attendee-ticket-1.pdf',
      data: Buffer.from('pdf'),
    }]);
  });

  it('applies temporary entry edits to exports without mutating source records', async () => {
    const files = await buildBadgeExportFiles(sources, 'https://conf.example.test', {
      csvPath: (fileName) => fileName,
      entryOverrides: new Map([['attendee:ticket-1', {
        firstName: 'Ada',
        lastName: 'LOVELACE corrected',
        role: 'Lead programmer',
        company: 'Analytical Engines',
      }]]),
      fetchLogo: async () => new Response(Buffer.from('logo'), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    });

    const vipCsv = files.find((file) => file.name === 'vip.csv')?.data.toString();
    expect(vipCsv).toContain('Ada,LOVELACE corrected,Lead programmer,Analytical Engines');
    expect(sources.attendees[0]).toMatchObject({
      last_name: 'Lovelace',
      job_title: 'Programmer',
      company: 'Engines',
    });
  });

  it('applies a temporary print label without persisting it to source data', async () => {
    const files = await buildBadgeExportFiles(sources, 'https://conf.example.test', {
      csvPath: (fileName) => fileName,
      labelOverrides: new Map([['speaker:public-speaker', 'Guest Speaker']]),
      fetchLogo: async () => new Response(Buffer.from('logo'), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    });

    const speakerCsv = files.find((file) => file.name === 'speaker.csv')?.data.toString();
    expect(speakerCsv).toContain('Public,Speaker,Speaker,ZurichJS,Guest Speaker');
    expect(sources.speakers[0]).not.toHaveProperty('label');
  });

  it('uses a one-time sponsor PNG override without downloading or persisting it', async () => {
    const override = await sharp({
      create: { width: 320, height: 80, channels: 4, background: '#3366ff' },
    }).png().toBuffer();
    const fetchLogo = vi.fn();
    const onWarning = vi.fn();
    const files = await buildBadgeExportFiles(sources, 'https://conf.example.test', {
      csvPath: (fileName) => fileName,
      fetchLogo,
      onWarning,
      logoOverrides: new Map([['sponsor:sponsor-1', {
        data: override,
        fileName: 'replacement.png',
        mimeType: 'image/png' as const,
      }]]),
    });

    expect(fetchLogo).not.toHaveBeenCalled();
    expect(files.find((file) => file.name === 'logos/sponsor-sponsor-1.png')?.data).toEqual(override);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('only 320px wide'));
    expect(files.find((file) => file.name === 'WARNINGS.txt')?.data.toString()).toContain(
      'use at least 500px for print'
    );
  });

  it('rejects unsafe archive paths', () => {
    expect(() => createZip([{ name: '../private.txt', data: Buffer.from('x') }])).toThrow(
      /Unsafe ZIP entry/
    );
  });
});
