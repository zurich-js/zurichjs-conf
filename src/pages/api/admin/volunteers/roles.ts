/**
 * Admin Volunteer Roles API
 * GET: List all roles
 * POST: Create a new role
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getAllRoles, createRole, getRoleApplicationCounts } from '@/lib/volunteer';
import { volunteerRoleSchema } from '@/lib/validations/volunteer';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Volunteer Roles API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await getAllRoles();
      if (error) return res.status(500).json({ error });

      const counts = await getRoleApplicationCounts();

      const rolesWithCounts = (data || []).map((role) => ({
        ...role,
        application_count: counts[role.id] || 0,
      }));

      return res.status(200).json({ roles: rolesWithCounts });
    }

    if (req.method === 'POST') {
      const parsed = volunteerRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: parsed.error.issues,
        });
      }

      const { data, error } = await createRole(parsed.data);
      if (error) return res.status(400).json({ error });

      log.info('Role created via admin', { roleId: data?.id, title: data?.title });
      return res.status(201).json({ role: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    log.error('Unexpected error', err instanceof Error ? err : null);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
