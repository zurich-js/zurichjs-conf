#!/usr/bin/env tsx

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { defaultBadgeLabel, type BadgeCategory, type BadgeEntry } from '@/lib/badges/export';
import { buildBadgePdfFiles } from '@/lib/badges/pdf';

const CATEGORIES: BadgeCategory[] = ['vip', 'attendee', 'speaker', 'sponsor', 'organizer'];

function sampleEntry(category: BadgeCategory, index: number): BadgeEntry {
  const suffix = String(index + 1).padStart(12, '0');
  const id = `10000000-0000-4000-8000-${suffix}`;
  return {
    category,
    source: 'manual',
    selectionId: `manual:${id}`,
    id,
    firstName: category === 'organizer' ? 'Alexandria' : 'Ada',
    lastName: category === 'sponsor' ? 'Lovelace-Hopper' : 'Lovelace',
    role: 'Maintainer of TanStack Query, Software Engineer',
    company: 'IGS Informatikgesellschaft für Sozialversicherungen GmbH',
    label: defaultBadgeLabel(category),
    publicId: `badge-${id}`,
    badgeCode: id,
    shareUrl: `https://conf.zurichjs.com/share/badge-${id}`,
    qrUrl: `https://conf.zurichjs.com/b/${id}`,
    logoUrl: category === 'sponsor' ? 'sample' : null,
  };
}

async function main(): Promise<void> {
  const entries = CATEGORIES.map(sampleEntry);
  const qrImages = new Map<string, Buffer>();
  for (const entry of entries) {
    qrImages.set(entry.selectionId, await QRCode.toBuffer(entry.qrUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
    }));
  }
  const sponsor = entries.find((entry) => entry.category === 'sponsor')!;
  const logo = await sharp(Buffer.from(
    '<svg width="900" height="180" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="90" cy="90" r="82" fill="#315fb0"/>' +
    '<text x="90" y="122" text-anchor="middle" font-family="sans-serif" font-size="94" font-weight="700" fill="white">N</text>' +
    '<text x="205" y="123" font-family="sans-serif" font-size="104" font-weight="700" fill="white">sample</text>' +
    '</svg>'
  )).png().toBuffer();

  const files = await buildBadgePdfFiles(entries, {
    qrImages,
    logoImages: new Map([[sponsor.selectionId, logo]]),
  });
  const outputDirectory = path.join(process.cwd(), 'output', 'pdf', 'badge-samples');
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(files.map((file) => writeFile(
    path.join(outputDirectory, `${file.name.split('/')[1]}-sample.pdf`),
    file.data
  )));
  process.stdout.write(`Wrote ${files.length} sample badge PDFs to ${outputDirectory}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
