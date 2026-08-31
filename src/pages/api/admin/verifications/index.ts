/**
 * Admin Verifications API
 * GET /api/admin/verifications - List verification requests
 *
 * Returns verification requests with has_purchased_ticket flag indicating
 * if the verified person has purchased a ticket (matching email).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verifications API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();
    const { status } = req.query;

    let query = supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: verifications, error } = await query;

    if (error) {
      log.error('Error fetching verifications', error);
      return res.status(500).json({ error: 'Failed to fetch verifications' });
    }

    if (!verifications || verifications.length === 0) {
      return res.status(200).json({ verifications: [] });
    }

    // Get unique emails from verification requests (case-insensitive)
    const emails = [...new Set(verifications.map((v) => v.email.toLowerCase()))];

    // Look up tickets with confirmed status matching these emails
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('email')
      .eq('status', 'confirmed')
      .in('email', emails);

    if (ticketsError) {
      log.error('Error fetching tickets for verification matching', ticketsError);
      // Continue without ticket data rather than failing the whole request
    }

    // Create a set of emails that have purchased tickets (case-insensitive)
    const purchasedEmails = new Set(
      (tickets ?? []).map((t) => t.email.toLowerCase())
    );

    // Add has_purchased_ticket flag to each verification
    const verificationsWithPurchaseStatus = verifications.map((v) => ({
      ...v,
      has_purchased_ticket: purchasedEmails.has(v.email.toLowerCase()),
    }));

    return res.status(200).json({ verifications: verificationsWithPurchaseStatus });
  } catch (error) {
    log.error('Admin verifications API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
