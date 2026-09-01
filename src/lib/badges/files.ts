import path from 'node:path';
import QRCode from 'qrcode';
import {
  badgeCategories,
  buildBadgeEntries,
  categoryCsv,
  combinedCsv,
  type BadgeExportSources,
} from '@/lib/badges/export';

export interface BadgeExportFile {
  name: string;
  data: Buffer;
}

interface BuildBadgeFilesOptions {
  csvPath: (fileName: string) => string;
  fetchLogo?: typeof fetch;
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
  const qrPaths = new Map<string, string>();
  const logoPaths = new Map<string, string>();

  const qrFiles = await mapConcurrent(entries, 8, async (entry) => {
    const name = `qr/${entry.category}-${entry.id}.png`;
    qrPaths.set(entry.id, options.csvPath(name));
    const data = await QRCode.toBuffer(entry.qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
    return { name, data };
  });

  const sponsorEntries = entries.filter((entry) => entry.category === 'sponsor' && entry.logoUrl);
  const logoResults: Array<BadgeExportFile | null> = await mapConcurrent(
    sponsorEntries,
    6,
    async (entry): Promise<BadgeExportFile | null> => {
      try {
        const logoUrl = new URL(entry.logoUrl!);
        if (!['http:', 'https:'].includes(logoUrl.protocol)) {
          throw new Error('logo URL must use http or https');
        }
        const response = await (options.fetchLogo ?? fetch)(logoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = Buffer.from(await response.arrayBuffer());
        if (data.byteLength > 10 * 1024 * 1024) throw new Error('file exceeds 10 MB');
        const extension = extensionForLogo(entry.logoUrl!, response.headers.get('content-type'));
        const name = `logos/sponsor-${entry.id}${extension}`;
        logoPaths.set(entry.id, options.csvPath(name));
        return { name, data };
      } catch (error) {
        options.onWarning?.(
          `Could not download logo for ${entry.company}: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
  );

  const csvFiles = badgeCategories.map((category): BadgeExportFile => ({
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
  };

  return [
    ...csvFiles,
    {
      name: 'README.txt',
      data: Buffer.from(
        'Extract the complete archive before importing a CSV into Illustrator. ' +
        'The deployed export uses relative QR and logo paths, so keep the qr/ and logos/ folders beside the CSV files.\n',
        'utf8'
      ),
    },
    { name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8') },
    ...qrFiles,
    ...logoResults.filter((file): file is BadgeExportFile => file !== null),
  ];
}
