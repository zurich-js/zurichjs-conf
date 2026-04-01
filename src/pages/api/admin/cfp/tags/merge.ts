import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { mergeTags } from '@/lib/cfp/tags';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Tags Merge API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { source_tag_ids, target_name } = req.body ?? {};

  if (!Array.isArray(source_tag_ids) || source_tag_ids.some((id) => typeof id !== 'string')) {
    return res.status(400).json({ error: 'source_tag_ids must be an array of tag IDs' });
  }

  if (typeof target_name !== 'string' || !target_name.trim()) {
    return res.status(400).json({ error: 'target_name is required' });
  }

  try {
    const result = await mergeTags(source_tag_ids, target_name);

    if (result.error || !result.tag) {
      return res.status(400).json({ error: result.error || 'Failed to merge tags' });
    }

    log.info('Tags merged', {
      targetTagId: result.tag.id,
      targetName: result.tag.name,
      sourceTagIds: source_tag_ids,
      mergedTagIds: result.mergedTagIds,
      reassignedSubmissionCount: result.reassignedSubmissionCount,
    });

    return res.status(200).json({
      tag: result.tag,
      merged_tag_ids: result.mergedTagIds,
      reassigned_submission_count: result.reassignedSubmissionCount,
    });
  } catch (error) {
    log.error('Error merging tags', error, {
      sourceTagIds: source_tag_ids,
      targetName: target_name,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
