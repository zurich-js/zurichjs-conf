/**
 * Deal Status API
 * PUT /api/admin/sponsorships/deals/[dealId]/status - Update deal status
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { getDeal, updateDealStatus } from '@/lib/sponsorship';
import type { SponsorshipDealStatus } from '@/lib/types/sponsorship';
import { VALID_DEAL_STATUS_TRANSITIONS } from '@/lib/types/sponsorship';
import { logger } from '@/lib/logger';

const log = logger.scope('Deal Status API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { dealId } = req.query;
  if (!dealId || typeof dealId !== 'string') {
    return res.status(400).json({ error: 'Missing deal ID' });
  }

  try {
    const { status, paidBy } = req.body as { status: SponsorshipDealStatus; paidBy?: string };

    // Validate status
    const validStatuses: SponsorshipDealStatus[] = [
      'draft',
      'offer_sent',
      'invoiced',
      'invoice_sent',
      'paid',
      'cancelled',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify deal exists
    const deal = await getDeal(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check valid transition
    const allowedTransitions = VALID_DEAL_STATUS_TRANSITIONS[deal.status as SponsorshipDealStatus];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${deal.status}' to '${status}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      });
    }

    // If marking as paid, require paidBy
    if (status === 'paid' && !paidBy) {
      return res.status(400).json({ error: 'paidBy is required when marking as paid' });
    }

    // Update status
    const updatedDeal = await updateDealStatus(dealId, status, paidBy);
    log.info('Deal status updated', {
      dealId,
      oldStatus: deal.status,
      newStatus: status,
    });

    return res.status(200).json(updatedDeal);
  } catch (error) {
    log.error('Error updating deal status', { error, dealId });

    // Check for specific errors
    if (error instanceof Error && error.message.includes('Invalid status transition')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update deal status',
    });
  }
}
