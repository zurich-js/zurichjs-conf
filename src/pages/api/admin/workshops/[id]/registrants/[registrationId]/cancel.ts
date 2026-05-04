/**
 * Cancel Workshop Registration API
 * POST /api/admin/workshops/[id]/registrants/[registrationId]/cancel
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const supabase = createServiceRoleClient();

    const { data: registration, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (error || !registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.status === 'cancelled' || registration.status === 'refunded') {
      return res.status(400).json({
        error: registration.status === 'cancelled'
          ? 'Registration already cancelled'
          : 'Refunded registrations cannot be cancelled',
      });
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update({ status: 'cancelled' })
      .eq('id', registrationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to cancel registration' });
    }

    // Decrement enrolled_count to free capacity
    const { data: ws } = await supabase.from('workshops').select('enrolled_count').eq('id', id).single();
    if (ws) {
      await supabase.from('workshops').update({ enrolled_count: Math.max(0, (ws.enrolled_count ?? 1) - 1) }).eq('id', id);
    }

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
