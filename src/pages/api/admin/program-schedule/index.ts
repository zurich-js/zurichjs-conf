import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import {
  createProgramScheduleItem,
  getAdminScheduleRows,
} from '@/lib/program/schedule';
import { createProgramScheduleItemSchema } from '@/lib/validations/program-schedule';

const log = logger.scope('Admin Program Schedule API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { rows, error } = await getAdminScheduleRows();
    if (error) {
      log.error('Failed to load program schedule rows', error);
      return res.status(500).json({ error: 'Failed to load program schedule' });
    }
    return res.status(200).json({ items: rows });
  }

  if (req.method === 'POST') {
    const result = createProgramScheduleItemSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    }

    const { item, error } = await createProgramScheduleItem(result.data);
    if (error || !item) {
      return res.status(400).json({ error: error || 'Failed to create schedule item' });
    }

    return res.status(201).json({ item });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
