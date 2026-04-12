import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  createProgramScheduleItem,
  getAdminScheduleRows,
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

  if (req.method === 'GET') {
    const items = await getAdminScheduleRows();
    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const data = req.body as ProgramScheduleItemInput;

    if (!data.date || !data.start_time || !data.duration_minutes || !data.title || !data.type) {
      return res.status(400).json({ error: 'date, start_time, duration_minutes, title, and type are required' });
    }

    if (!isValidType(data.type)) {
      return res.status(400).json({ error: 'Invalid schedule item type' });
    }

    const { item, error } = await createProgramScheduleItem(data);
    if (error || !item) {
      return res.status(400).json({ error: error || 'Failed to create schedule item' });
    }

    return res.status(201).json({ item });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
