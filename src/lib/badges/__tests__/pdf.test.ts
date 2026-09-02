import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { BadgeCategory, BadgeEntry } from '@/lib/badges/export';
import { buildBadgePdfFiles, prepareSponsorLogo } from '@/lib/badges/pdf';

function entry(category: BadgeCategory, suffix: string = category): BadgeEntry {
  const id = `11111111-2222-4333-8444-${suffix.padEnd(12, '0').slice(0, 12)}`;
  return {
    category,
    source: 'manual',
    selectionId: `manual:${id}`,
    id,
    firstName: category === 'vip' ? 'Alexandria-Cassandra' : 'Ada',
    lastName: 'Lovelace',
    role: 'Maintainer of an intentionally long software project title',
    company: 'Analytical Engines International GmbH',
    label: category === 'organizer' ? 'Core' : category[0].toUpperCase() + category.slice(1),
    publicId: `badge-${id}`,
    badgeCode: id,
    shareUrl: `https://conf.example.test/share/badge-${id}`,
    qrUrl: `https://conf.example.test/b/${id}`,
    logoUrl: category === 'sponsor' ? 'https://example.test/logo.png' : null,
  };
}

describe('badge PDF renderer', () => {
  it('centers visible sponsor artwork despite uneven transparent source padding', async () => {
    const artwork = await sharp({
      create: { width: 240, height: 80, channels: 4, background: '#ffffff' },
    }).png().toBuffer();
    const padded = await sharp({
      create: { width: 900, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: artwork, left: 40, top: 30 }])
      .png()
      .toBuffer();

    const prepared = await prepareSponsorLogo(padded);
    const { data, info } = await sharp(prepared).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width;
    let right = -1;
    let top = info.height;
    let bottom = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        if (data[(y * info.width + x) * info.channels + 3] === 0) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    expect({ width: info.width, height: info.height }).toEqual({ width: 1080, height: 240 });
    expect(Math.abs(left - (info.width - 1 - right))).toBeLessThanOrEqual(1);
    expect(Math.abs(top - (info.height - 1 - bottom))).toBeLessThanOrEqual(1);
  });

  it('renders two vector-template pages per person for every category', async () => {
    const entries = (['vip', 'attendee', 'speaker', 'sponsor', 'organizer'] as BadgeCategory[])
      .map((category) => entry(category));
    entries.push({ ...entry('vip', 'vip-second'), firstName: 'Grace', lastName: 'Hopper' });
    const qrImages = new Map<string, Buffer>();
    for (const badge of entries) {
      qrImages.set(badge.selectionId, await QRCode.toBuffer(badge.qrUrl, { width: 400, margin: 2 }));
    }
    const sponsor = entries.find((badge) => badge.category === 'sponsor')!;
    const logoImages = new Map([[sponsor.selectionId, await sharp({
      create: { width: 600, height: 120, channels: 4, background: '#2463eb' },
    }).png().toBuffer()]]);

    const files = await buildBadgePdfFiles(entries, { qrImages, logoImages });

    expect(files).toHaveLength(entries.length);
    expect(files.filter((file) => file.name.startsWith('pdf/vip/'))).toHaveLength(2);
    expect(files.every((file) => !file.name.endsWith('-all.pdf'))).toBe(true);
    for (const file of files) {
      const pdf = await PDFDocument.load(file.data);
      expect(pdf.getPageCount()).toBe(2);
      expect(pdf.getPage(0).getWidth()).toBeCloseTo(266.457, 2);
      expect(pdf.getPage(0).getHeight()).toBeCloseTo(413.858, 2);
      expect(pdf.getPage(0).getTrimBox()).toMatchObject({
        x: expect.closeTo(8.5, 1),
        y: expect.closeTo(8.5, 1),
        width: expect.closeTo(249.45, 1),
        height: expect.closeTo(396.85, 1),
      });
    }
  }, 30_000);
});
