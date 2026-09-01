import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';
import type { BadgeCategory, BadgeEntry } from '@/lib/badges/export';
import { buildBadgePdfFiles } from '@/lib/badges/pdf';

function entry(category: BadgeCategory): BadgeEntry {
  const id = `11111111-2222-4333-8444-${category.padEnd(12, '0').slice(0, 12)}`;
  return {
    category,
    source: 'manual',
    selectionId: `manual:${id}`,
    id,
    firstName: category === 'vip' ? 'Alexandria-Cassandra' : 'Ada',
    lastName: 'Lovelace',
    role: 'Maintainer of an intentionally long software project title',
    company: 'Analytical Engines International GmbH',
    publicId: `badge-${id}`,
    badgeCode: id,
    shareUrl: `https://conf.example.test/share/badge-${id}`,
    qrUrl: `https://conf.example.test/b/${id}`,
    logoUrl: category === 'sponsor' ? 'https://example.test/logo.png' : null,
  };
}

describe('badge PDF renderer', () => {
  it('renders two vector-template pages per person for every category', async () => {
    const entries = (['vip', 'attendee', 'speaker', 'sponsor', 'organizer'] as BadgeCategory[]).map(entry);
    const qrImages = new Map<string, Buffer>();
    for (const badge of entries) {
      qrImages.set(badge.selectionId, await QRCode.toBuffer(badge.qrUrl, { width: 400, margin: 2 }));
    }
    const sponsor = entries.find((badge) => badge.category === 'sponsor')!;
    const logoImages = new Map([[sponsor.selectionId, await sharp({
      create: { width: 600, height: 120, channels: 4, background: '#2463eb' },
    }).png().toBuffer()]]);

    const files = await buildBadgePdfFiles(entries, { qrImages, logoImages });

    expect(files.map((file) => file.name)).toEqual([
      'pdf/vip-all.pdf',
      'pdf/attendee-all.pdf',
      'pdf/speaker-all.pdf',
      'pdf/sponsor-all.pdf',
      'pdf/organizer-all.pdf',
    ]);
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
