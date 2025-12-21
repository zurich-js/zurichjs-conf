/**
 * Admin Speaker Image Upload API
 * POST /api/admin/cfp/speakers/[id]/image
 *
 * Allows admin to upload profile image for any speaker
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { uploadSpeakerImage } from '@/lib/cfp/speakers';
import formidable from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Speaker ID is required' });
  }

  try {
    // Parse the form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: (part) => {
        return ALLOWED_MIME_TYPES.includes(part.mimetype || '');
      },
    });

    const [, files] = await form.parse(req);
    const uploadedFile = files.image?.[0] || files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({
        error: 'No image file provided. Accepted formats: JPG, PNG, WebP, GIF (max 5MB)'
      });
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype || '')) {
      return res.status(400).json({
        error: 'Invalid file type. Accepted formats: JPG, PNG, WebP, GIF'
      });
    }

    // Read the file
    const fileBuffer = await fs.promises.readFile(uploadedFile.filepath);

    // Generate filename with extension
    const extension = uploadedFile.mimetype?.split('/')[1] || 'jpg';
    const fileName = `profile.${extension}`;

    // Upload to storage
    const { url, error } = await uploadSpeakerImage(
      id,
      fileBuffer,
      fileName,
      uploadedFile.mimetype || 'image/jpeg'
    );

    // Clean up temp file
    await fs.promises.unlink(uploadedFile.filepath).catch(() => {});

    if (error || !url) {
      return res.status(500).json({ error: error || 'Failed to upload image' });
    }

    return res.status(200).json({
      success: true,
      imageUrl: url,
    });
  } catch (error) {
    console.error('[Admin Speaker Image Upload] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload image',
    });
  }
}
