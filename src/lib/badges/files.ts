import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  badgeCategories,
  buildBadgeEntries,
  categoryCsv,
  combinedCsv,
  type BadgeExportSources,
} from '@/lib/badges/export';
import { buildBadgePdfFiles } from '@/lib/badges/pdf';

export interface BadgeExportFile {
  name: string;
  data: Buffer;
}

export interface BadgeLogoOverride {
  data: Buffer;
  fileName: string;
  mimeType: 'image/png';
}

interface BuildBadgeFilesOptions {
  csvPath: (fileName: string) => string;
  fetchLogo?: typeof fetch;
  includeDataFiles?: boolean;
  logoOverrides?: ReadonlyMap<string, BadgeLogoOverride>;
  onWarning?: (message: string) => void;
}

function extensionForLogo(url: string, contentType: string | null): string {
  const type = contentType?.split(';')[0].trim().toLowerCase();
  const byType: Record<string, string> = {
    'image/svg+xml': '.svg',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  if (type && byType[type]) return byType[type];
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension)
    ? extension
    : '.img';
}

async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

export async function buildBadgeExportFiles(
  sources: BadgeExportSources,
  baseUrl: string,
  options: BuildBadgeFilesOptions
): Promise<BadgeExportFile[]> {
  const entries = buildBadgeEntries(sources, baseUrl);
  const warnings: string[] = [];
  const warn = (message: string) => {
    warnings.push(message);
    options.onWarning?.(message);
  };
  const qrPaths = new Map<string, string>();
  const logoPaths = new Map<string, string>();
  const qrImages = new Map<string, Buffer>();
  const logoImages = new Map<string, Buffer>();

  const qrFiles = await mapConcurrent(entries, 8, async (entry) => {
    const name = `qr/${entry.source}-${entry.id}.png`;
    qrPaths.set(entry.selectionId, options.csvPath(name));
    const data = await QRCode.toBuffer(entry.qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
    qrImages.set(entry.selectionId, data);
    return { name, data };
  });

  const sponsorEntries = entries.filter((entry) => (
    entry.category === 'sponsor' && (entry.logoUrl || options.logoOverrides?.has(entry.selectionId))
  ));
  const logoResults: Array<BadgeExportFile | null> = await mapConcurrent(
    sponsorEntries,
    6,
    async (entry): Promise<BadgeExportFile | null> => {
      try {
        const override = options.logoOverrides?.get(entry.selectionId);
        if (override) {
          const name = `logos/${entry.source}-${entry.id}.png`;
          logoPaths.set(entry.selectionId, options.csvPath(name));
          logoImages.set(entry.selectionId, override.data);
          const metadata = await sharp(override.data).metadata();
          if (metadata.width && metadata.width < 500) {
            warn(
              `Logo override for ${entry.company} is only ${metadata.width}px wide; use at least 500px for print.`
            );
          }
          return { name, data: override.data };
        }

        const logoUrl = new URL(entry.logoUrl!);
        if (!['http:', 'https:'].includes(logoUrl.protocol)) {
          throw new Error('logo URL must use http or https');
        }
        const response = await (options.fetchLogo ?? fetch)(logoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = Buffer.from(await response.arrayBuffer());
        if (data.byteLength > 10 * 1024 * 1024) throw new Error('file exceeds 10 MB');
        const extension = extensionForLogo(entry.logoUrl!, response.headers.get('content-type'));
        const name = `logos/${entry.source}-${entry.id}${extension}`;
        logoPaths.set(entry.selectionId, options.csvPath(name));
        logoImages.set(entry.selectionId, data);
        try {
          const metadata = await sharp(data).metadata();
          if (metadata.width && metadata.width < 500) {
            warn(
              `Logo for ${entry.company} is only ${metadata.width}px wide; use a one-time PNG override of at least 500px for print.`
            );
          }
        } catch {
          warn(`Could not inspect the pixel dimensions of the logo for ${entry.company}.`);
        }
        return { name, data };
      } catch (error) {
        warn(
          `Could not download logo for ${entry.company}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
  );

  const populatedCategories = badgeCategories.filter((category) => (
    entries.some((entry) => entry.category === category)
  ));
  const csvFiles = populatedCategories.map((category): BadgeExportFile => ({
    name: `${category}.csv`,
    data: Buffer.from(categoryCsv(category, entries, qrPaths, logoPaths), 'utf8'),
  }));
  csvFiles.push({
    name: 'badges.csv',
    data: Buffer.from(combinedCsv(entries, qrPaths, logoPaths), 'utf8'),
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    speakerSource: 'public lineup (is_visible=true)',
    counts: Object.fromEntries(badgeCategories.map((category) => [
      category,
      entries.filter((entry) => entry.category === category).length,
    ])),
    warnings,
  };
  const pdfFiles = await buildBadgePdfFiles(entries, { qrImages, logoImages });

  if (options.includeDataFiles === false) return pdfFiles;

  return [
    ...csvFiles,
    {
      name: 'README.txt',
      data: Buffer.from(
        'The pdf/ directory contains print-ready, two-page front/back badge PDFs rendered from the approved templates. ' +
        'CSV and image assets remain available for manual review or Illustrator workflows. ' +
        'Extract the complete archive and keep qr/ and logos/ beside the CSV files. ' +
        'Badge QR tokens redirect to stable share pages and can be replaced from /admin/badges before printing.\n',
        'utf8'
      ),
    },
    ...(warnings.length > 0 ? [{
      name: 'WARNINGS.txt',
      data: Buffer.from(`${warnings.join('\n')}\n`, 'utf8'),
    }] : []),
    { name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8') },
    ...pdfFiles,
    ...qrFiles,
    ...logoResults.filter((file): file is BadgeExportFile => file !== null),
  ];
}
