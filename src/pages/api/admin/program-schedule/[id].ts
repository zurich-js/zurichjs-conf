import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  deleteProgramScheduleItem,
  updateProgramScheduleItem,
} from '@/lib/program/schedule';
import { programScheduleItemPartialInputSchema } from '@/lib/validations/program-schedule';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid schedule item ID' });
  }

  if (req.method === 'PUT') {
    const result = programScheduleItemPartialInputSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: result.error.issues,
      });
    }

    const { item, error } = await updateProgramScheduleItem(id, result.data);
    if (error || !item) {
      return res.status(400).json({ error: error || 'Failed to update schedule item' });
    }

    return res.status(200).json({ item });
  }

  if (req.method === 'DELETE') {
    const { success, error } = await deleteProgramScheduleItem(id);
    if (!success) {
      return res.status(400).json({ error: error || 'Failed to delete schedule item' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
