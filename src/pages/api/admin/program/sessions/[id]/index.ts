import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { archiveProgramSession, getProgramSession, updateProgramSession } from '@/lib/program/sessions';

const UpdateSessionSchema = z.object({
  kind: z.enum(['talk', 'workshop', 'panel', 'keynote', 'event']).optional(),
  title: z.string().min(1).optional(),
  abstract: z.string().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  status: z.enum(['draft', 'confirmed', 'published', 'archived']).optional(),
  workshop_duration_minutes: z.number().int().positive().nullable().optional(),
  workshop_capacity: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid session id' });

  if (req.method === 'GET') {
    const result = await getProgramSession(id);
    if (result.error) return res.status(500).json({ error: result.error });
    if (!result.session) return res.status(404).json({ error: 'Session not found' });
    return res.status(200).json({ session: result.session });
  }

  if (req.method === 'PATCH') {
    const parsed = UpdateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }

    const result = await updateProgramSession(id, parsed.data);
    if (result.error || !result.session) {
      return res.status(400).json({ error: result.error || 'Failed to update session' });
    }

    return res.status(200).json({ session: result.session });
  }

  if (req.method === 'DELETE') {
    const result = await archiveProgramSession(id);
    if (!result.success) return res.status(400).json({ error: result.error || 'Failed to archive session' });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
