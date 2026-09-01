/**
 * Door Staff Member Admin API
 * PATCH /api/admin/checkin/staff/[id] — change a role, or revoke access
 *
 * Revocation is a role update rather than a delete: deleting the row would clear
 * the actor reference on every audit event that names them (ON DELETE SET NULL),
 * losing the link between a volunteer and their actions. Setting is_active false
 * removes access on their very next action and keeps the trail intact.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { updateStaff } from '@/lib/checkin/staff';
import { doorStaffUpdateSchema } from '@/lib/validations/checkin';
import { logger } from '@/lib/logger';
import type { DoorStaff } from '@/lib/types/checkin';

const log = logger.scope('Door Staff Member API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ staff: DoorStaff } | { error: string; issues?: unknown }>
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Staff id is required' });
  }

  const parsed = doorStaffUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
  }

  const { staff, error } = await updateStaff(id, parsed.data);
  if (error || !staff) {
    return res.status(400).json({ error: error ?? 'Could not update that staff member' });
  }

  log.info('Door staff updated', { staffId: id, role: staff.role, isActive: staff.isActive });
  return res.status(200).json({ staff });
}
