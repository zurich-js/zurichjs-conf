import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createBrowserZip } from '@/lib/badges/browser-zip';

describe('browser badge ZIP', () => {
  it('creates a standards-compatible archive from downloaded PDFs', async () => {
    const archive = createBrowserZip([
      {
        name: 'pdf/attendee/ada.pdf',
        data: new TextEncoder().encode('%PDF-ada'),
      },
      {
        name: 'pdf/attendee/grace.pdf',
        data: new TextEncoder().encode('%PDF-grace'),
      },
    ], new Date('2026-09-01T12:00:00Z'));
    const directory = mkdtempSync(path.join(tmpdir(), 'browser-badge-zip-'));
    const archivePath = path.join(directory, 'badges.zip');
    writeFileSync(archivePath, Buffer.from(await archive.arrayBuffer()));

    const listing = execFileSync('unzip', ['-t', archivePath], { encoding: 'utf8' });
    expect(listing).toContain('testing: pdf/attendee/ada.pdf');
    expect(listing).toContain('testing: pdf/attendee/grace.pdf');
    expect(listing).toContain('No errors detected');
  });
});
