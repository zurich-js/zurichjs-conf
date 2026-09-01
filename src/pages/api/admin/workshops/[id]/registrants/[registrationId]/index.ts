/**
 * Workshop Registration Details API
 * PATCH /api/admin/workshops/[id]/registrants/[registrationId]
 */

import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { ErrorCodes, HttpError, throwIfDbError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

const bodySchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
});

export default withApiHandler(
  { scope: 'Workshop Registration Details API', methods: ['PATCH'], bodySchema },
  async (req, res, { body }) => {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      throw new HttpError(401, 'Unauthorized', { code: ErrorCodes.AUTH_REQUIRED });
    }

    const { id, registrationId } = req.query;
    if (typeof id !== 'string' || typeof registrationId !== 'string') {
      throw new HttpError(400, 'Invalid IDs');
    }

    const { first_name, last_name, email, company, job_title } = body;

    const supabase = createServiceRoleClient();

    // Verify registration exists and belongs to workshop
    const { data: existing, error: fetchError } = await supabase
      .from('workshop_registrations')
      .select('id')
      .eq('id', registrationId)
      .eq('workshop_id', id)
      .single();

    if (fetchError || !existing) {
      throw new HttpError(404, 'Registration not found', {
        code: ErrorCodes.NOT_FOUND,
        cause: fetchError,
        context: { workshopId: id, registrationId },
      });
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
      throw new HttpError(400, 'No fields to update');
    }

    const { error: updateError } = await supabase
      .from('workshop_registrations')
      .update(updates)
      .eq('id', registrationId);

    throwIfDbError(updateError, 'Failed to update workshop registration', {
      context: { workshopId: id, registrationId, fields: Object.keys(updates) },
    });

    return res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
    });
  }
);
