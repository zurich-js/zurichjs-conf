/**
 * Admin Volunteer Role Detail API
 * GET: Get role by ID
 * PUT: Update role
 * DELETE: Delete role
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getRoleById, updateRole, deleteRole } from '@/lib/volunteer';
import { volunteerRoleSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Role API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Role ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await getRoleById(id);
      if (error) return res.status(404).json({ error });
      return res.status(200).json({ role: data });
    }

    if (req.method === 'PUT') {
      const parsed = volunteerRoleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      const { data, error } = await updateRole(id, parsed.data);
      if (error) return res.status(400).json({ error });
      return res.status(200).json({ role: data });
    }

    if (req.method === 'DELETE') {
      const { success, error } = await deleteRole(id);
      if (!success) return res.status(400).json({ error });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
