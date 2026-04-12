import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  deleteProgramScheduleItem,
  updateProgramScheduleItem,
} from '@/lib/program/schedule';
import type { ProgramScheduleItemInput, ProgramScheduleItemType } from '@/lib/types/program-schedule';

function isValidType(type: string): type is ProgramScheduleItemType {
  return ['session', 'event', 'break', 'placeholder'].includes(type);
}

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
    const data = req.body as Partial<ProgramScheduleItemInput>;

    if (data.type && !isValidType(data.type)) {
      return res.status(400).json({ error: 'Invalid schedule item type' });
    }

    const { item, error } = await updateProgramScheduleItem(id, data);
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
