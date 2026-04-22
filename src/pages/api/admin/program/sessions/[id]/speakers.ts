import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getProgramSession, replaceProgramSessionSpeakers } from '@/lib/program/sessions';

const SpeakersSchema = z.object({
  speakers: z.array(z.object({
    speaker_id: z.string().uuid(),
    role: z.enum(['speaker', 'panelist', 'host', 'mc', 'instructor']).optional(),
    sort_order: z.number().int().optional(),
  })),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid session id' });

  const parsed = SpeakersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
  }

  const result = await replaceProgramSessionSpeakers(id, parsed.data.speakers);
  if (!result.success) return res.status(400).json({ error: result.error || 'Failed to update speakers' });

  const session = await getProgramSession(id);
  if (session.error || !session.session) {
    return res.status(400).json({ error: session.error || 'Failed to reload session' });
  }

  return res.status(200).json({ session: session.session });
}
