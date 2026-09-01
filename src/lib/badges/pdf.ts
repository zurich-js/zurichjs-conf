import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFEmbeddedPage, type PDFFont, type PDFPage, rgb } from 'pdf-lib';
import sharp from 'sharp';
import type { BadgeCategory, BadgeEntry } from '@/lib/badges/export';
import type { BadgeExportFile } from '@/lib/badges/files';

const MM_TO_POINTS = 72 / 25.4;
const TEMPLATE_DIRECTORY = path.join(process.cwd(), 'assets', 'badges', 'templates');
const FONT_DIRECTORY = path.join(process.cwd(), 'public', 'fonts');
const VARIABLE_WIDTH_MM = 84;
const SPONSOR_LOGO_BOX_WIDTH_MM = 36;
const SPONSOR_LOGO_BOX_HEIGHT_MM = 8;
const SPONSOR_LOGO_TOP_MM = 116;

interface BadgePdfAssets {
  qrImages: ReadonlyMap<string, Buffer>;
  logoImages: ReadonlyMap<string, Buffer>;
}

function mm(value: number): number {
  return value * MM_TO_POINTS;
}

function entryAssetKey(entry: BadgeEntry): string {
  return entry.selectionId;
}

function fileSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'badge';
}

function entryPdfPath(entry: BadgeEntry): string {
  const name = fileSegment(`${entry.firstName}-${entry.lastName}`);
  const identity = fileSegment(`${entry.source}-${entry.id}`);
  return `pdf/${entry.category}/${name}-${identity}.pdf`;
}

function copyPageBoxes(target: PDFPage, source: PDFPage): void {
  const crop = source.getCropBox();
  const bleed = source.getBleedBox();
  const trim = source.getTrimBox();
  const art = source.getArtBox();
  target.setCropBox(crop.x, crop.y, crop.width, crop.height);
  target.setBleedBox(bleed.x, bleed.y, bleed.width, bleed.height);
  target.setTrimBox(trim.x, trim.y, trim.width, trim.height);
  target.setArtBox(art.x, art.y, art.width, art.height);
}

function fittedSize(font: PDFFont, text: string, preferred: number, maxWidth: number, minimum: number): number {
  if (!text) return preferred;
  const width = font.widthOfTextAtSize(text, preferred);
  return width <= maxWidth ? preferred : Math.max(minimum, preferred * maxWidth / width);
}

function drawCenteredLine(
  page: PDFPage,
  text: string,
  font: PDFFont,
  preferredSize: number,
  topBaselineMm: number,
  minimumSize: number
): void {
  if (!text) return;
  const maxWidth = mm(VARIABLE_WIDTH_MM);
  const size = fittedSize(font, text, preferredSize, maxWidth, minimumSize);
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y: page.getHeight() - mm(topBaselineMm),
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredWrapped(
  page: PDFPage,
  text: string,
  font: PDFFont,
  preferredSize: number,
  topBaselineMm: number,
  minimumSize: number
): void {
  if (!text) return;
  const maxWidth = mm(VARIABLE_WIDTH_MM);
  let size = preferredSize;
  let lines = wrapText(font, text, size, maxWidth);
  while (lines.length > 2 && size > minimumSize) {
    size = Math.max(minimumSize, size - 0.5);
    lines = wrapText(font, text, size, maxWidth);
  }
  if (lines.length > 2) {
    lines = [lines[0], lines.slice(1).join(' ')];
    size = fittedSize(font, lines[1], size, maxWidth, minimumSize);
  }

  const lineHeight = size * 1.18;
  lines.slice(0, 2).forEach((line, index) => {
    const width = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: (page.getWidth() - width) / 2,
      y: page.getHeight() - mm(topBaselineMm) - index * lineHeight,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

async function rasterizeLogo(data: Buffer): Promise<Buffer> {
  return sharp(data, { density: 300 })
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 10,
      lineArt: true,
    })
    .png()
    .toBuffer();
}

async function addEntryPages(
  output: PDFDocument,
  frontTemplate: PDFEmbeddedPage,
  backTemplate: PDFEmbeddedPage,
  frontSource: PDFPage,
  backSource: PDFPage,
  entry: BadgeEntry,
  bold: PDFFont,
  regular: PDFFont,
  assets: BadgePdfAssets
): Promise<void> {
  const front = output.addPage([frontTemplate.width, frontTemplate.height]);
  const back = output.addPage([backTemplate.width, backTemplate.height]);
  copyPageBoxes(front, frontSource);
  copyPageBoxes(back, backSource);
  front.drawPage(frontTemplate, {
    x: 0,
    y: 0,
    width: front.getWidth(),
    height: front.getHeight(),
  });
  back.drawPage(backTemplate, {
    x: 0,
    y: 0,
    width: back.getWidth(),
    height: back.getHeight(),
  });

  drawCenteredLine(front, entry.firstName, bold, 30, 32.346, 18);
  drawCenteredLine(front, entry.lastName, bold, 20, 44.217, 12);
  drawCenteredWrapped(front, entry.role, regular, 14, 60, 9);
  drawCenteredWrapped(front, entry.company, regular, 11, 76, 7);

  const qrData = assets.qrImages.get(entryAssetKey(entry));
  if (!qrData) throw new Error(`Missing QR image for ${entry.selectionId}`);
  const qr = await output.embedPng(qrData);
  const qrSize = mm(30);
  back.drawImage(qr, {
    x: (back.getWidth() - qrSize) / 2,
    y: back.getHeight() - mm(65) - qrSize,
    width: qrSize,
    height: qrSize,
  });

  if (entry.category === 'sponsor') {
    const logoData = assets.logoImages.get(entryAssetKey(entry));
    if (logoData) {
      const logo = await output.embedPng(await rasterizeLogo(logoData));
      const boxWidth = mm(SPONSOR_LOGO_BOX_WIDTH_MM);
      const boxHeight = mm(SPONSOR_LOGO_BOX_HEIGHT_MM);
      const natural = logo.scale(1);
      const scale = Math.min(boxWidth / natural.width, boxHeight / natural.height);
      const width = natural.width * scale;
      const height = natural.height * scale;
      front.drawImage(logo, {
        x: (front.getWidth() - width) / 2,
        y: front.getHeight() - mm(SPONSOR_LOGO_TOP_MM) - (boxHeight + height) / 2,
        width,
        height,
      });
    }
  }
}

export async function buildBadgePdfFiles(
  entries: BadgeEntry[],
  assets: BadgePdfAssets
): Promise<BadgeExportFile[]> {
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(FONT_DIRECTORY, 'figtree-400.ttf')),
    readFile(path.join(FONT_DIRECTORY, 'figtree-700.ttf')),
  ]);
  const categories: BadgeCategory[] = ['vip', 'attendee', 'speaker', 'sponsor', 'organizer'];
  const files: BadgeExportFile[] = [];

  for (const category of categories) {
    const categoryEntries = entries.filter((entry) => entry.category === category);
    if (categoryEntries.length === 0) continue;

    const templateBytes = await readFile(path.join(TEMPLATE_DIRECTORY, `${category}.pdf`));
    const template = await PDFDocument.load(templateBytes);
    if (template.getPageCount() !== 2) {
      throw new Error(`${category} badge template must contain exactly two pages`);
    }

    for (const entry of categoryEntries) {
      const output = await PDFDocument.create();
      output.registerFontkit(fontkit);
      const [regular, bold, frontTemplate, backTemplate] = await Promise.all([
        output.embedFont(regularBytes, { subset: true }),
        output.embedFont(boldBytes, { subset: true }),
        output.embedPage(template.getPage(0)),
        output.embedPage(template.getPage(1)),
      ]);
      output.setTitle(`ZurichJS ${category} badge - ${entry.firstName} ${entry.lastName}`.trim());
      output.setCreator('ZurichJS Conference badge export');
      await addEntryPages(
        output,
        frontTemplate,
        backTemplate,
        template.getPage(0),
        template.getPage(1),
        entry,
        bold,
        regular,
        assets
      );
      files.push({
        name: entryPdfPath(entry),
        data: Buffer.from(await output.save({ useObjectStreams: false })),
      });
    }
  }

  return files;
}
