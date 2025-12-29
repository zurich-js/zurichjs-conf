/**
 * CFP Admin Tags API
 * GET /api/admin/cfp/tags - List all tags
 * POST /api/admin/cfp/tags - Create a new tag
 * DELETE /api/admin/cfp/tags - Delete a tag (requires id in body)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminTags } from '@/lib/cfp/admin';
import { createTag, deleteTag } from '@/lib/cfp/tags';
import { verifyAdminToken } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Tags API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication (same as main admin)
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const tags = await getAdminTags();
      return res.status(200).json({ tags });
    } catch (error) {
      log.error('Error fetching tags', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { name, is_suggested } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    try {
      const { tag, error } = await createTag(name, is_suggested ?? true);

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Tag created', { name, is_suggested });
      return res.status(201).json({ tag });
    } catch (error) {
      log.error('Error creating tag', error, { name });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    try {
      const { success, error } = await deleteTag(id);

      if (!success) {
        return res.status(400).json({ error: error || 'Failed to delete tag' });
      }

      log.info('Tag deleted', { id });
      return res.status(200).json({ success: true });
    } catch (error) {
      log.error('Error deleting tag', error, { id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
