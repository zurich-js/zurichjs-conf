import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Admin Badge QR Rotation API');
const requestSchema = z.object({
  selectionId: z.string().min(3).max(240).regex(/^(attendee|speaker|sponsor|manual):[^:]+$/),
  confirmNotPrinted: z.literal(true),
}).strict();

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const { authorized, isBot } = verifyAdminAccess(req);
  if (!authorized || isBot) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const result = requestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
    return;
  }

  try {
    const { data, error } = await createServiceRoleClient()
      .from('badge_qr_codes')
      .update({ code: randomUUID() })
      .eq('subject_key', result.data.selectionId)
      .select('code')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'Generate this badge QR code before rotating it' });
      return;
    }
    res.status(200).json({ code: data.code });
  } catch (error) {
    log.error('Failed to rotate badge QR code', error, { selectionId: result.data.selectionId });
    res.status(500).json({ error: 'Failed to rotate badge QR code' });
  }
}
