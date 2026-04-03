/**
 * Sponsor Color Logo API
 * POST /api/admin/sponsorships/[id]/logo-color - Upload sponsor hover color logo
 * DELETE /api/admin/sponsorships/[id]/logo-color - Remove sponsor hover color logo
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getSponsor, updateSponsorColorLogo } from '@/lib/sponsorship';
import { createServiceRoleClient } from '@/lib/supabase';
import {
  LOGO_UPLOAD_ALLOWED_MIME_TYPES,
  LOGO_UPLOAD_MAX_FILE_SIZE_BYTES,
} from '@/lib/constants/logo-upload';
import { logger } from '@/lib/logger';

const log = logger.scope('Sponsor Color Logo API');

// Disable Next.js default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing sponsor ID' });
  }

  switch (req.method) {
    case 'POST':
      return handleUpload(id, req, res);
    case 'DELETE':
      return handleDelete(id, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleUpload(
  sponsorId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const sponsor = await getSponsor(sponsorId);
    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    const form = formidable({
      maxFileSize: LOGO_UPLOAD_MAX_FILE_SIZE_BYTES,
      filter: ({ mimetype }) => {
        return !!mimetype && LOGO_UPLOAD_ALLOWED_MIME_TYPES.includes(mimetype);
      },
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!uploadedFile.mimetype || !LOGO_UPLOAD_ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: ${LOGO_UPLOAD_ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    const ext = uploadedFile.mimetype === 'image/png' ? 'png' :
      uploadedFile.mimetype === 'image/webp' ? 'webp' :
        uploadedFile.mimetype === 'image/svg+xml' ? 'svg' : 'jpg';

    const supabase = createServiceRoleClient();
    const timestamp = Date.now();
    const filename = `logo_color_${timestamp}.${ext}`;
    const logoDirectory = `logos/${sponsorId}/color`;
    const filePath = `${logoDirectory}/${filename}`;

    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list(logoDirectory);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${logoDirectory}/${f.name}`);
      await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
    }

    const contentType = uploadedFile.mimetype === 'image/svg+xml'
      ? 'application/octet-stream'
      : uploadedFile.mimetype;

    const { error: uploadError } = await supabase.storage
      .from('sponsorship-assets')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sponsorship-assets')
      .getPublicUrl(filePath);

    const logoUrl = `${publicUrl}?v=${timestamp}`;
    await updateSponsorColorLogo(sponsorId, logoUrl);

    await fs.unlink(uploadedFile.filepath).catch(() => {});

    log.info('Sponsor color logo uploaded', { sponsorId, logoUrl });

    return res.status(200).json({ success: true, logoUrl });
  } catch (error) {
    log.error('Error uploading sponsor color logo', { error, sponsorId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload color logo',
    });
  }
}

async function handleDelete(sponsorId: string, res: NextApiResponse) {
  try {
    const sponsor = await getSponsor(sponsorId);
    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found' });
    }

    const supabase = createServiceRoleClient();
    const logoDirectory = `logos/${sponsorId}/color`;
    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list(logoDirectory);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${logoDirectory}/${f.name}`);
      await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
    }

    await updateSponsorColorLogo(sponsorId, null);

    log.info('Sponsor color logo removed', { sponsorId });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error removing sponsor color logo', { error, sponsorId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove color logo',
    });
  }
}
