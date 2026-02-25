/**
 * Partnership Email API
 * POST /api/admin/partnerships/[id]/email - Send partnership package email
 * GET /api/admin/partnerships/[id]/email - Get email history
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { sendPartnershipEmail, getEmailHistory } from '@/lib/partnerships';
import { logger } from '@/lib/logger';

const log = logger.scope('PartnershipEmailAPI');

const sendEmailSchema = z.object({
  include_coupons: z.boolean().default(true),
  include_vouchers: z.boolean().default(true),
  include_logo: z.boolean().default(true),
  include_banner: z.boolean().optional().default(false),
  custom_message: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid partnership ID' });
  }

  if (req.method === 'GET') {
    return handleGetHistory(id, res);
  }

  if (req.method === 'POST') {
    return handleSendEmail(id, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - Get email history for a partnership
 */
async function handleGetHistory(partnershipId: string, res: NextApiResponse) {
  try {
    const history = await getEmailHistory(partnershipId);
    return res.status(200).json({ history });
  } catch (error) {
    log.error('Error fetching email history', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch email history',
    });
  }
}

/**
 * POST - Send partnership package email
 */
async function handleSendEmail(partnershipId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const parsed = sendEmailSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: parsed.error.issues,
      });
    }

    const result = await sendPartnershipEmail({
      partnership_id: partnershipId,
      ...parsed.data,
    });

    if (!result.success) {
      log.error('Failed to send partnership email', new Error(result.error), { partnershipId });
      return res.status(500).json({ error: result.error });
    }

    log.info('Partnership email sent', { partnershipId, messageId: result.messageId });

    return res.status(200).json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    log.error('Error sending partnership email', error as Error, { partnershipId });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
}
