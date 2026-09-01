import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'node:fs/promises';
import formidable from 'formidable';
import sharp from 'sharp';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { BADGE_LOGO_BUCKET, badgeLogoDirectory } from '@/lib/badges/logo-storage';
import {
  LOGO_UPLOAD_ALLOWED_MIME_TYPES,
  LOGO_UPLOAD_MAX_FILE_SIZE_BYTES,
} from '@/lib/constants/logo-upload';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Badge Sponsor Logo API');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const config = {
  api: { bodyParser: false },
};

function extension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'jpg';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || isBot) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id || !UUID_PATTERN.test(id)) {
    res.status(400).json({ error: 'Invalid manual badge ID' });
    return;
  }

  const client = createServiceRoleClient();
  const { data: badge, error: badgeError } = await client
    .from('manual_badge_entries')
    .select('id, category')
    .eq('id', id)
    .maybeSingle();
  if (badgeError) {
    log.error('Failed to load sponsor badge before logo change', badgeError, { id });
    res.status(500).json({ error: 'Could not load sponsor badge' });
    return;
  }
  if (!badge || badge.category !== 'sponsor') {
    res.status(404).json({ error: 'Manual sponsor badge not found' });
    return;
  }

  const directory = badgeLogoDirectory(id);
  if (req.method === 'DELETE') {
    const { error } = await client.from('manual_badge_entries').update({ logo_url: null }).eq('id', id);
    if (error) {
      res.status(500).json({ error: 'Could not remove sponsor badge logo' });
      return;
    }
    const { data: existingFiles } = await client.storage.from(BADGE_LOGO_BUCKET).list(directory);
    if (existingFiles?.length) {
      await client.storage.from(BADGE_LOGO_BUCKET)
        .remove(existingFiles.map((file) => `${directory}/${file.name}`));
    }
    res.status(204).end();
    return;
  }

  let temporaryPath: string | null = null;
  try {
    const form = formidable({
      maxFileSize: LOGO_UPLOAD_MAX_FILE_SIZE_BYTES,
      filter: ({ mimetype }) => Boolean(
        mimetype && LOGO_UPLOAD_ALLOWED_MIME_TYPES.includes(mimetype)
      ),
    });
    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];
    if (!uploadedFile?.mimetype) {
      res.status(400).json({ error: 'Choose a PNG, JPEG, WebP, or SVG logo' });
      return;
    }
    temporaryPath = uploadedFile.filepath;
    if (!LOGO_UPLOAD_ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype)) {
      res.status(400).json({ error: 'Unsupported sponsor logo format' });
      return;
    }

    const data = await fs.readFile(uploadedFile.filepath);
    const metadata = await sharp(data, { density: 300 }).metadata();
    const timestamp = Date.now();
    const fileName = `default_${timestamp}.${extension(uploadedFile.mimetype)}`;
    const filePath = `${directory}/${fileName}`;
    const contentType = uploadedFile.mimetype === 'image/svg+xml'
      ? 'application/octet-stream'
      : uploadedFile.mimetype;
    const { error: uploadError } = await client.storage.from(BADGE_LOGO_BUCKET).upload(
      filePath,
      data,
      { contentType, upsert: false }
    );
    if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

    const { data: publicData } = client.storage.from(BADGE_LOGO_BUCKET).getPublicUrl(filePath);
    const logoUrl = `${publicData.publicUrl}?v=${timestamp}`;
    const { error: updateError } = await client.from('manual_badge_entries')
      .update({ logo_url: logoUrl })
      .eq('id', id);
    if (updateError) {
      await client.storage.from(BADGE_LOGO_BUCKET).remove([filePath]);
      throw new Error(`Could not save logo URL: ${updateError.message}`);
    }

    const { data: existingFiles } = await client.storage.from(BADGE_LOGO_BUCKET).list(directory);
    const obsoleteFiles = existingFiles?.filter((file) => file.name !== fileName) ?? [];
    if (obsoleteFiles.length) {
      await client.storage.from(BADGE_LOGO_BUCKET)
        .remove(obsoleteFiles.map((file) => `${directory}/${file.name}`));
    }

    res.status(200).json({
      logoUrl,
      width: metadata.width ?? null,
      warning: metadata.width && metadata.width < 500
        ? `This logo is only ${metadata.width}px wide; at least 500px is recommended for print.`
        : null,
    });
  } catch (error) {
    log.error('Sponsor badge logo upload failed', error, { id });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Sponsor badge logo upload failed',
    });
  } finally {
    if (temporaryPath) await fs.unlink(temporaryPath).catch(() => undefined);
  }
}
