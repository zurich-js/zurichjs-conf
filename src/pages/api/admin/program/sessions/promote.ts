import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { promoteCfpSubmissionToProgramSession } from '@/lib/program/sessions';

const PromoteSchema = z.object({
  submission_id: z.string().uuid(),
  status: z.enum(['draft', 'confirmed', 'published', 'archived']).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = PromoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
  }

  const result = await promoteCfpSubmissionToProgramSession(parsed.data.submission_id, parsed.data.status);
  if (result.error || !result.session) {
    return res.status(400).json({ error: result.error || 'Failed to promote submission' });
  }

  return res.status(200).json({ session: result.session });
}
