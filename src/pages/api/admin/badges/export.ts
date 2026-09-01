import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { filterBadgeSources, loadBadgeSources } from '@/lib/badges/data';
import { buildBadgeExportFiles } from '@/lib/badges/files';
import type { BadgeLogoOverride } from '@/lib/badges/files';
import type { BadgeEntryOverride } from '@/lib/badges/overrides';
import { loadPublicBadgeSpeakers } from '@/lib/badges/speakers';
import { getBadgeBaseUrl } from '@/lib/badges/url';
import { createZip } from '@/lib/badges/zip';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';
import { badgeExportRequestSchema } from '@/lib/validations/badges';

const log = logger.scope('Admin Badge Export API');

export const config = {
  api: {
    bodyParser: { sizeLimit: '22mb' },
    responseLimit: false,
  },
  maxDuration: 300,
};

function decodeLogoOverrides(
  values: Record<string, { fileName: string; dataUrl: string }>
): Map<string, BadgeLogoOverride> {
  return new Map(Object.entries(values).map(([selectionId, value]) => {
    const data = Buffer.from(value.dataUrl.slice('data:image/png;base64,'.length), 'base64');
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (data.byteLength > 10 * 1024 * 1024 || !data.subarray(0, 8).equals(pngSignature)) {
      throw new Error(`Invalid PNG logo override for ${selectionId}`);
    }
    return [selectionId, { data, fileName: value.fileName, mimeType: 'image/png' }];
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || (req.method === 'POST' && isBot)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = badgeExportRequestSchema.safeParse(
    req.method === 'GET' ? { provisionShareIds: false } : req.body
  );
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    return;
  }

  try {
    const sources = filterBadgeSources(await loadBadgeSources(
      createServiceRoleClient(),
      await loadPublicBadgeSpeakers(),
      result.data.provisionShareIds,
      result.data.includedIds
    ), result.data.includedIds);
    const files = await buildBadgeExportFiles(sources, getBadgeBaseUrl(req), {
      csvPath: (fileName) => fileName,
      includeDataFiles: result.data.mode.endsWith('-data'),
      entryOverrides: new Map<string, BadgeEntryOverride>(
        Object.entries(result.data.entryOverrides)
      ),
      logoOverrides: decodeLogoOverrides(result.data.logoOverrides),
      onWarning: (message) => log.warn(message),
    });
    const date = new Date().toISOString().slice(0, 10);

    if (result.data.mode === 'single-pdf') {
      const pdfs = files.filter((file) => file.name.startsWith('pdf/'));
      if (pdfs.length !== 1) {
        res.status(404).json({ error: 'The selected badge PDF was not found' });
        return;
      }
      const [pdf] = pdfs;
      const fileName = pdf.name.split('/').at(-1) ?? 'zurichjs-badge.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdf.data.length);
      res.setHeader('X-Badge-Archive-Path', pdf.name);
      res.status(200).send(pdf.data);
      return;
    }

    if (result.data.mode === 'tab-pdfs') {
      const pdfs = files.filter((file) => file.name.startsWith(`pdf/${result.data.category}/`));
      if (pdfs.length === 0) {
        res.status(404).json({ error: `No ${result.data.category} badges were selected` });
        return;
      }
      const archive = createZip(pdfs);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="zurichjs-${result.data.category}-badge-pdfs-${date}.zip"`
      );
      res.setHeader('Content-Length', archive.length);
      res.status(200).send(archive);
      return;
    }

    const archive = createZip(files);
    const archiveLabel = result.data.mode === 'all-pdfs'
      ? 'all-badge-pdfs'
      : result.data.mode === 'tab-data'
        ? `${result.data.category}-badge-data`
        : 'all-badge-data';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="zurichjs-${archiveLabel}-${date}.zip"`
    );
    res.setHeader('Content-Length', archive.length);
    res.status(200).send(archive);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create badge export';
    const missingIds = /need share IDs|need provisioning/.test(message);
    log.error('Failed to create badge export', error);
    res.status(missingIds ? 409 : 500).json({ error: message });
  }
}
