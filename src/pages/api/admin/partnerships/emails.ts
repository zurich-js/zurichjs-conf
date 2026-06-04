/**
 * Partnership Emails API
 * GET /api/admin/partnerships/emails - List all partner contact emails (no pagination)
 *
 * Returns every partner contact matching the optional type/status/search filters
 * so an admin can grab the full recipient list for a blast email.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { listPartnerEmails } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipEmailsAPI');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, status, search } = req.query;

    const contacts = await listPartnerEmails({
      type: type as 'community' | 'individual' | 'company' | 'sponsor' | undefined,
      status: status as 'active' | 'inactive' | 'pending' | 'expired' | undefined,
      search: typeof search === 'string' ? search : undefined,
    });

    return res.status(200).json({ contacts, count: contacts.length });
  } catch (error) {
    log.error('Error listing partner emails', error as Error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list partner emails',
    });
  }
}
