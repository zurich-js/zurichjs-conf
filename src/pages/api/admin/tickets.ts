/**
 * Admin Tickets API
 * GET /api/admin/tickets - Get all tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();

    // Get all tickets with ordering
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error('Admin tickets API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
