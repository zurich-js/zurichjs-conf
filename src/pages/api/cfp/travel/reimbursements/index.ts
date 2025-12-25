/**
 * Speaker Reimbursements API
 * GET /api/cfp/travel/reimbursements - Get all reimbursements
 * POST /api/cfp/travel/reimbursements - Create a reimbursement request
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseApiClient, getSpeakerByUserId } from '@/lib/cfp/auth';
import { getSpeakerReimbursements, createReimbursement } from '@/lib/cfp/travel';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Reimbursements API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get session
  const supabase = createSupabaseApiClient(req, res);
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get speaker
  const speaker = await getSpeakerByUserId(session.user.id);
  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  if (req.method === 'GET') {
    try {
      const reimbursements = await getSpeakerReimbursements(speaker.id);
      return res.status(200).json({ reimbursements });
    } catch (error) {
      log.error('Failed to get reimbursements', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        expense_type,
        description,
        amount,
        currency,
        bank_name,
        bank_account_holder,
        iban,
        swift_bic,
      } = req.body;

      // Validate required fields
      if (!expense_type || !description || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { reimbursement, error } = await createReimbursement(speaker.id, {
        expense_type,
        description,
        amount,
        currency,
        bank_name,
        bank_account_holder,
        iban,
        swift_bic,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      log.info('Reimbursement created', { speakerId: speaker.id, reimbursementId: reimbursement?.id });
      return res.status(201).json({ reimbursement });
    } catch (error) {
      log.error('Failed to create reimbursement', error, { speakerId: speaker.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
