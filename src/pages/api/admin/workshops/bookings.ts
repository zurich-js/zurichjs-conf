/**
 * Admin Workshop Bookings API
 * GET /api/admin/workshops/bookings - List workshop bookings with filters
 * GET /api/admin/workshops/bookings?export=csv - Export bookings as CSV
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { WorkshopBooking } from '@/lib/types/workshop';

const log = logger.scope('Admin Workshop Bookings');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifyAdminToken(req.cookies.admin_token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    const { workshop_id, status, search } = req.query;
    const isExport = req.query.export === 'csv';

    // Use type assertion - extended schema columns added via migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('workshop_registrations') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (workshop_id && typeof workshop_id === 'string') {
      query = query.eq('workshop_id', workshop_id);
    }

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching bookings', error);
      res.status(500).json({ error: error.message });
      return;
    }

    let filteredBookings = (data || []) as WorkshopBooking[];

    // Apply search filter client-side (across multiple fields)
    if (search && typeof search === 'string') {
      const term = search.toLowerCase();
      filteredBookings = filteredBookings.filter(b => {
        const name = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
        const email = (b.email || '').toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    // CSV export
    if (isExport) {
      const headers = ['Name', 'Email', 'Company', 'Workshop ID', 'Amount Paid', 'Currency', 'Status', 'Booked At'];
      const rows = filteredBookings.map(b => [
        `${b.first_name || ''} ${b.last_name || ''}`.trim(),
        b.email || '',
        b.company || '',
        b.workshop_id,
        ((b.amount_paid || 0) / 100).toFixed(2),
        b.currency || 'CHF',
        b.status,
        b.created_at,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=workshop-bookings.csv');
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ bookings: filteredBookings, total: filteredBookings.length });
  } catch (error) {
    log.error('Error in bookings API', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
