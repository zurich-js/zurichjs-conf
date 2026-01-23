/**
 * Partnership Logo API
 * POST /api/admin/partnerships/[id]/logo - Upload partnership logo
 * DELETE /api/admin/partnerships/[id]/logo - Remove partnership logo
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { verifyAdminToken } from '@/lib/admin/auth';
import { getPartnership, updatePartnership } from '@/lib/partnerships';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Partnership Logo API');

// Disable Next.js default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing partnership ID' });
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

/**
 * POST - Upload partnership logo
 */
async function handleUpload(
  partnershipId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check partnership exists
    const partnership = await getPartnership(partnershipId);
    if (!partnership) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    // Parse form with formidable
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return !!mimetype && ALLOWED_MIME_TYPES.includes(mimetype);
      },
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate MIME type
    if (!uploadedFile.mimetype || !ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      });
    }

    // Read file
    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    // Determine file extension
    const ext = uploadedFile.mimetype === 'image/png' ? 'png' :
                uploadedFile.mimetype === 'image/webp' ? 'webp' :
                uploadedFile.mimetype === 'image/svg+xml' ? 'svg' : 'jpg';

    // Upload to Supabase storage
    const supabase = createServiceRoleClient();
    const timestamp = Date.now();
    const filename = `logo_${timestamp}.${ext}`;
    const filePath = `partnership-logos/${partnershipId}/${filename}`;

    // Delete old logo files for this partnership
    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list(`partnership-logos/${partnershipId}`);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `partnership-logos/${partnershipId}/${f.name}`);
      await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
    }

    // Upload new file
    // Note: SVGs are uploaded as application/octet-stream to bypass Supabase MIME restrictions
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('sponsorship-assets')
      .getPublicUrl(filePath);

    // Update partnership with new logo URL (with cache-busting)
    const logoUrl = `${publicUrl}?v=${timestamp}`;
    await updatePartnership(partnershipId, { company_logo_url: logoUrl });

    // Clean up temp file
    await fs.unlink(uploadedFile.filepath).catch(() => {});

    log.info('Partnership logo uploaded', { partnershipId, logoUrl });

    return res.status(200).json({ success: true, logoUrl });
  } catch (error) {
    log.error('Error uploading partnership logo', { error, partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload logo',
    });
  }
}

/**
 * DELETE - Remove partnership logo
 */
async function handleDelete(partnershipId: string, res: NextApiResponse) {
  try {
    // Check partnership exists
    const partnership = await getPartnership(partnershipId);
    if (!partnership) {
      return res.status(404).json({ error: 'Partnership not found' });
    }

    // Delete from storage
    const supabase = createServiceRoleClient();
    const { data: existingFiles } = await supabase.storage
      .from('sponsorship-assets')
      .list(`partnership-logos/${partnershipId}`);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `partnership-logos/${partnershipId}/${f.name}`);
      await supabase.storage.from('sponsorship-assets').remove(filesToDelete);
    }

    // Update partnership to remove logo URL
    await updatePartnership(partnershipId, { company_logo_url: undefined });

    log.info('Partnership logo removed', { partnershipId });

    return res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error removing partnership logo', { error, partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to remove logo',
    });
  }
}
