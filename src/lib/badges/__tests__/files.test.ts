import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildBadgeExportFiles } from '../files';
import { createZip } from '../zip';
import type { BadgeExportSources } from '../export';

vi.mock('qrcode', () => ({
  default: {
    toBuffer: vi.fn(async (value: string) => Buffer.from(`png:${value}`)),
  },
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
  }],
  speakers: [{
    id: 'public-speaker',
    slug: 'public-speaker',
    first_name: 'Public',
    last_name: 'Speaker',
    company: 'ZurichJS',
    job_title: 'Speaker',
  }],
  sponsors: [{
    id: 'sponsor-1',
    company_name: 'Sponsor Co',
    contact_name: 'Grace Hopper',
    logo_url: 'https://cdn.example.test/mono.png',
    logo_url_color: 'https://cdn.example.test/color.png',
    share_id: '22222222-3333-4444-8555-666666666666',
  }],
};

describe('deployed badge export files', () => {
  it('builds relative archive paths, public speaker QRs, and color sponsor logos', async () => {
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
    expect(fetchLogo).toHaveBeenCalledWith(new URL('https://cdn.example.test/color.png'));
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

  it('rejects unsafe archive paths', () => {
    expect(() => createZip([{ name: '../private.txt', data: Buffer.from('x') }])).toThrow(
      /Unsafe ZIP entry/
    );
  });
});
