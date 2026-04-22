import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createProgramSession, listProgramSessions } from '@/lib/program/sessions';

const SessionSchema = z.object({
  cfp_submission_id: z.string().uuid().nullable().optional(),
  kind: z.enum(['talk', 'workshop', 'panel', 'keynote', 'event']),
  title: z.string().min(1),
  abstract: z.string().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  status: z.enum(['draft', 'confirmed', 'published', 'archived']).optional(),
  workshop_duration_minutes: z.number().int().positive().nullable().optional(),
  workshop_capacity: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  speakers: z.array(z.object({
    speaker_id: z.string().uuid(),
    role: z.enum(['speaker', 'panelist', 'host', 'mc', 'instructor']).optional(),
    sort_order: z.number().int().optional(),
  })).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { status, kind, includeArchived } = req.query;
    const result = await listProgramSessions({
      status: typeof status === 'string' ? status as never : undefined,
      kind: typeof kind === 'string' ? kind as never : undefined,
      includeArchived: includeArchived === 'true',
    });

    if (result.error) return res.status(500).json({ error: result.error });
    return res.status(200).json({ sessions: result.sessions });
  }

  if (req.method === 'POST') {
    const parsed = SessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }

    const result = await createProgramSession(parsed.data);
    if (result.error || !result.session) {
      return res.status(400).json({ error: result.error || 'Failed to create session' });
    }

    return res.status(201).json({ session: result.session });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
