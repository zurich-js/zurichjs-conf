/**
 * Workshop Registration Details API
 * PATCH /api/admin/workshops/[id]/registrants/[registrationId]
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
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

    const { first_name, last_name, email, company, job_title } = req.body;

    const supabase = createServiceRoleClient();

    // Verify registration exists and belongs to workshop
    const { data: existing, error: fetchError } = await supabase
      .from('workshop_registrations')
      .select('id')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const updates: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      company?: string | null;
      job_title?: string | null;
    } = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (job_title !== undefined) updates.job_title = job_title;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update(updates)
      .eq('id', registrationId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update registration' });
    }

    return res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
    });
  } catch (error) {
    console.error('Update registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
